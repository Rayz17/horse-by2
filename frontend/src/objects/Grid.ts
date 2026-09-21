import Phaser from 'phaser';
import { Tile } from './Tile';
import { Character, Recipe, Item, EndgamePhase, HarmonySnapshot, BalanceConfig, SkillPreview, SkillResult } from '../types';
import { SaveManager } from '../managers/SaveManager';
import { MergeEngine } from '../core/MergeEngine';
import { SpawnSystem, SpawnDecision } from '../core/SpawnSystem';
import { EndgameController } from '../core/EndgameController';
import { GridSkillHost, SkillExecutor } from '../core/SkillExecutor';
import { RunTileSnapshot, RunStateSnapshot } from '../managers/RunStateManager';
import { CharacterAssetLoader } from '../managers/CharacterAssetLoader';
import { burstParticles, sweepLooseVfx } from '../utils/vfx';

export class Grid {
    private scene: Phaser.Scene;
    private saveManager: SaveManager;
    private rows: number = 6;
    private cols: number = 6;
    private tileSize: number;
    private startX: number;
    private startY: number;
    private tiles: (Tile | null)[][];
    private blocked: boolean[][];
    
    private characters: Character[];
    private recipes: Recipe[];
    private items: Item[];
    private charMap: Map<string, Character>;

    public onScoreChange?: (char: Character, x?: number, y?: number, isCritical?: boolean) => void;
    public onTileSelected?: (tile: Tile | null) => void;
    public onMoveResolved?: (hadMerge: boolean) => void;

    private selector: Phaser.GameObjects.Rectangle;
    private selectedTile: Tile | null = null;
    private isResolvingMove: boolean = false;
    private pendingResolveEvent: Phaser.Time.TimerEvent | null = null;
    private lastMoveEndTime: number = 0;

    private lastMaxLevel: number = 1;
    private maxProgressLevel: number = 1;
    private minActiveLevel: number = 1;
    private protectedCharIds: string[] = [];
    private endgamePhase: EndgamePhase = 'normal';
    private harmonyStableMoves: number = 0;
    private endgameEventCount: number = 0;
    private harmonyAchieved: boolean = false;
    private harmonyChallengeAccepted: boolean = false;
    private lastHarmonySignature: string = '';
    private debugSpawnFloor: number | null = null;
    private debugSpawnCeiling: number | null = null;
    private spawnSystem = new SpawnSystem();
    private spawnRng: () => number = Math.random;
    private endgameController = new EndgameController({ level101Min: 2, highTierRatioMin: 0.35, stableMovesMin: 3, endgameEventsMin: 1 });
    private balance: BalanceConfig | null = null;
    private nextSpawn: SpawnDecision | null = null;
    private criticalPityCounter = 0;
    private shadowObstacleTurns = new Map<Tile, number>();
    private pendingSwipe: { dirX: number; dirY: number } | null = null;
    private lastMoveDir: { x: number; y: number } | null = null;
    private lastSpawnedTile: Tile | null = null;
    private ownedTiles = new Set<Tile>();
    private inputBufferEnabled = true;
    private skillExecutor!: SkillExecutor;
    private blockedMarkers: Phaser.GameObjects.Rectangle[] = [];
    private skillLock = false;
    private skillAimCell: { r: number; c: number } | null = null;
    private recipeHelpForced = 0;
    private extraLowSpawns = 0;
    private recipeChanceOverride: number | null = null;

    constructor(scene: Phaser.Scene, x: number, y: number, width: number, saveManager: SaveManager, bootstrap = true) {
        this.scene = scene;
        this.saveManager = saveManager;
        this.tileSize = width / this.cols;
        this.startX = x;
        this.startY = y;
        this.tiles = Array(this.rows).fill(null).map(() => Array(this.cols).fill(null));
        this.blocked = Array(this.rows).fill(false).map(() => Array(this.cols).fill(false));

        // Selector Visual
        this.selector = scene.add.rectangle(0, 0, this.tileSize, this.tileSize).setOrigin(0.5);
        this.selector.setStrokeStyle(4, 0xffff00);
        this.selector.setVisible(false);
        // Ensure selector is above tiles
        this.selector.setDepth(100);

        // Load Data
        this.characters = scene.cache.json.get('characters');
        this.recipes = scene.cache.json.get('recipes');
        this.items = scene.cache.json.get('items');
        this.charMap = new Map(this.characters.map(c => [c.id, c]));
        this.balance = scene.cache.json.get('balance') || null;
        if (this.balance) {
            this.endgameController.updateBalance(this.balance.harmony);
            this.inputBufferEnabled = !!this.balance.feel?.inputBufferEnabled;
        }

        this.skillExecutor = new SkillExecutor(this.buildSkillHost());
        this.initInput();
        if (bootstrap) {
            for (let i = 0; i < 4; i++) {
                this.queueNextSpawn();
                this.commitNextSpawn();
            }
            this.queueNextSpawn();
        }
    }

    public onBeforeMove?: () => void;
    public onMergeHappened?: (char: Character, mergeIndex: number, x: number, y: number, isCritical: boolean) => number | void;
    public onRecipeDiscovered?: (recipe: Recipe) => void;

    public setSpawnRng(rng: () => number) {
        this.spawnRng = rng;
        this.spawnSystem.setRng(rng);
    }

    public bootstrapBoard() {
        for (let i = 0; i < 4; i++) {
            this.queueNextSpawn();
            this.commitNextSpawn();
        }
        this.queueNextSpawn();
    }

    private pickSpot<T>(spots: T[]): T | null {
        if (spots.length === 0) return null;
        const idx = Math.floor(this.spawnRng() * spots.length) % spots.length;
        return spots[idx];
    }

    public setInputBufferEnabled(enabled: boolean) {
        this.inputBufferEnabled = enabled;
    }

    public swipe(dirX: number, dirY: number) {
        if (this.skillLock) return;
        this.requestMove(dirX, dirY);
    }

    public setSkillLock(locked: boolean) {
        this.skillLock = locked;
    }

    public setSkillAimCell(cell: { r: number; c: number } | null) {
        this.skillAimCell = cell;
    }

    public setProtectedIds(ids: string[]) {
        this.protectedCharIds = ids;
    }

    public configureDebugSpawnBand(floor: number, ceiling?: number) {
        this.debugSpawnFloor = Math.max(1, floor);
        this.debugSpawnCeiling = Math.max(this.debugSpawnFloor, ceiling ?? floor + 2);
        this.minActiveLevel = Math.max(this.minActiveLevel, this.debugSpawnFloor);
        this.maxProgressLevel = Math.max(this.maxProgressLevel, this.debugSpawnCeiling);
        this.lastMaxLevel = Math.max(this.lastMaxLevel, this.debugSpawnCeiling);

        for (let r = 0; r < this.rows; r++) {
            for (let c = 0; c < this.cols; c++) {
                const tile = this.tiles[r][c];
                if (tile?.character && tile.character.level < this.debugSpawnFloor) {
                    this.destroyTile(tile);
                }
            }
        }
    }

    public forceSpawnCharacter(level: number): boolean {
        const emptySpots = this.getEmptySpots();
        if (emptySpots.length === 0) return false;

        const spot = this.pickSpot(emptySpots);
        if (!spot) return false;
        const char = this.findCharacterByLevel(level);
        if (char && !char.hiddenEnding) {
            this.createTileAt(spot, char);
            this.maxProgressLevel = Math.max(this.maxProgressLevel, level);
            this.lastMaxLevel = Math.max(this.lastMaxLevel, level);
            return true;
        }
        return false;
    }

    public forceSpawnById(id: string): boolean {
        const emptySpots = this.getEmptySpots();
        if (emptySpots.length === 0) return false;
        const spot = this.pickSpot(emptySpots);
        if (!spot) return false;
        const char = this.charMap.get(id);
        if (!char || char.hiddenEnding) return false;
        this.createTileAt(spot, char);
        this.maxProgressLevel = Math.max(this.maxProgressLevel, char.level);
        this.lastMaxLevel = Math.max(this.lastMaxLevel, char.level);
        return true;
    }

    public setRecipeHelpForced(count: number) {
        this.recipeHelpForced = Math.max(0, count);
    }

    public getRecipeHelpForced() {
        return this.recipeHelpForced;
    }

    public setExtraLowSpawns(count: number) {
        this.extraLowSpawns = Math.max(0, count);
    }

    public getExtraLowSpawns() {
        return this.extraLowSpawns;
    }

    public setRecipeChanceOverride(chance: number | null) {
        this.recipeChanceOverride = chance;
    }

    public getBoardCharacterIds(): Set<string> {
        const ids = new Set<string>();
        this.getAllTiles().forEach(tile => {
            if (tile.character) ids.add(tile.character.id);
        });
        return ids;
    }

    public getTopCharacters(limit: number): Character[] {
        return this.getAllTiles()
            .map(t => t.character)
            .filter((c): c is Character => !!c)
            .sort((a, b) => b.level - a.level)
            .filter((c, i, arr) => arr.findIndex(x => x.id === c.id) === i)
            .slice(0, limit);
    }

    public spawnItem(item: Item) {
        const emptySpots = this.getEmptySpots();
        if (emptySpots.length === 0) return false;

        const spot = this.pickSpot(emptySpots);
        if (!spot) return false;
        this.createItemAt(spot, item);
        return true;
    }

    private createItemAt(spot: {r: number, c: number}, item: Item) {
        const tile = new Tile(this.scene, spot.r, spot.c, this.tileSize, item, 'item');
        const pos = this.getPixel(spot.r, spot.c);
        tile.setPosition(pos.x, pos.y);
        tile.setScale(0);
        
        this.scene.tweens.add({
            targets: tile,
            scaleX: 1,
            scaleY: 1,
            duration: 200,
            onComplete: () => tile.ensureNormalScale()
        });
        
        this.tiles[spot.r][spot.c] = tile;
        this.trackTile(tile);
        this.lastSpawnedTile = tile;
    }

    private getEmptySpots() {
        this.sanitizeGridState();
        this.rebuildBlockedFromWorld();
        const emptySpots = [];
        for (let r = 0; r < this.rows; r++) {
            for (let c = 0; c < this.cols; c++) {
                if (!this.hasOccupyingTile(r, c) && !this.blocked[r][c]) emptySpots.push({ r, c });
            }
        }
        return emptySpots;
    }

    private isDisplayAlive(obj?: Phaser.GameObjects.GameObject | null): boolean {
        if (!obj) return false;
        const anyObj = obj as Phaser.GameObjects.GameObject & { destroyed?: boolean; alpha?: number; scaleX?: number };
        if (anyObj.destroyed || !obj.active || !obj.scene) return false;
        if ('visible' in obj && obj.visible === false) return false;
        if (typeof anyObj.alpha === 'number' && anyObj.alpha < 0.15) return false;
        if (typeof anyObj.scaleX === 'number' && Math.abs(anyObj.scaleX) < 0.08) return false;
        return true;
    }

    public pixelToCell(x: number, y: number): { r: number; c: number } | null {
        const c = Math.floor((x - this.startX) / this.tileSize);
        const r = Math.floor((y - this.startY) / this.tileSize);
        if (r < 0 || c < 0 || r >= this.rows || c >= this.cols) return null;
        return { r, c };
    }

    /**
     * Occupancy rules:
     * - A cell is occupied only when tiles[r][c] is an active tile with content.
     * - Slide / spawn / empty checks use that plus sealed walls (visible obstacle / live Boss).
     * - Every Tile display object must be on the board or currently dying. Leftover images are destroyed.
     */
    private sanitizeGridState() {
        let shouldClearSelection = false;
        const seen = new Set<Tile>();

        for (let r = 0; r < this.rows; r++) {
            for (let c = 0; c < this.cols; c++) {
                const tile = this.tiles[r][c];
                if (!tile) continue;

                const hasContent = !!(tile.character || tile.item);
                if (seen.has(tile)) {
                    this.tiles[r][c] = null;
                    continue;
                }
                if (!tile.active || !hasContent) {
                    if (this.selectedTile === tile) shouldClearSelection = true;
                    this.tiles[r][c] = null;
                    if (tile.active) this.destroyTileVisual(tile);
                    continue;
                }
                if (tile.toBeDestroyed) {
                    if (this.selectedTile === tile) shouldClearSelection = true;
                    this.tiles[r][c] = null;
                    if (!this.scene.tweens.isTweening(tile)) this.destroyTileVisual(tile);
                    continue;
                }

                seen.add(tile);
                this.ownedTiles.add(tile);
                tile.row = r;
                tile.col = c;
                tile.repairPortrait();
                if (!this.scene.tweens.isTweening(tile)) {
                    const pos = this.getPixel(r, c);
                    tile.setPosition(pos.x, pos.y);
                }
            }
        }

        this.sweepOrphanTiles();
        sweepLooseVfx(this.scene);

        if (shouldClearSelection) {
            this.selectTile(null);
        }
    }

    private trackTile(tile: Tile) {
        this.ownedTiles.add(tile);
    }

    private destroyTileVisual(tile: Tile) {
        this.ownedTiles.delete(tile);
        this.scene.tweens.killTweensOf(tile);
        if (tile.active) tile.destroy();
    }

    private sweepOrphanTiles() {
        const onBoard = new Set<Tile>();
        for (let r = 0; r < this.rows; r++) {
            for (let c = 0; c < this.cols; c++) {
                const tile = this.tiles[r][c];
                if (tile) onBoard.add(tile);
            }
        }

        const candidates = new Set<Tile>(this.ownedTiles);
        this.scene.children.each(obj => {
            if (obj instanceof Tile) candidates.add(obj);
        });

        for (const tile of candidates) {
            if (!tile.active) {
                this.ownedTiles.delete(tile);
                continue;
            }
            if (onBoard.has(tile) && !tile.toBeDestroyed) continue;
            if (tile.toBeDestroyed && this.scene.tweens.isTweening(tile)) continue;
            this.destroyTileVisual(tile);
        }
    }

    private getCellRole(r: number, c: number): 'wall' | 'tile' | 'empty' {
        if (r < 0 || r >= this.rows || c < 0 || c >= this.cols) return 'wall';
        if (this.hasOccupyingTile(r, c)) return 'tile';
        if (this.isSealedCell(r, c)) return 'wall';
        return 'empty';
    }

    /** Rebuild tile occupancy and drop unjustified blocked holes. */
    public reconcileBoard(_boss?: { r: number; c: number; w: number; h: number } | null) {
        this.sanitizeGridState();
        this.rebuildBlockedFromWorld();
        this.refreshBlockedMarkers();
    }

    public blockTiles(r: number, c: number, w: number, h: number) {
        this.markOccupancy(r, c, w, h);
        for (let i = r; i < r + h; i++) {
            for (let j = c; j < c + w; j++) {
                if (i < this.rows && j < this.cols && this.tiles[i][j]) {
                    this.destroyTile(this.tiles[i][j]!);
                }
            }
        }
    }

    /** Mark cells blocked without deleting pieces. Used when reconciling occupancy. */
    public markOccupancy(r: number, c: number, w: number, h: number) {
        for (let i = r; i < r + h; i++) {
            for (let j = c; j < c + w; j++) {
                if (i < this.rows && j < this.cols) {
                    this.blocked[i][j] = true;
                }
            }
        }
    }

    public unblockTiles(r: number, c: number, w: number, h: number) {
        for (let i = r; i < r + h; i++) {
            for (let j = c; j < c + w; j++) {
                if (i < this.rows && j < this.cols) {
                    this.blocked[i][j] = false;
                }
            }
        }
    }

    private obstacleCellKey(r: number, c: number) {
        return `${r},${c}`;
    }

    private isMeaningfulVisual(obj?: Phaser.GameObjects.GameObject | null): boolean {
        if (!this.isDisplayAlive(obj)) return false;
        if (obj instanceof Phaser.GameObjects.Text) {
            return obj.text.trim().length > 0;
        }
        if (obj instanceof Phaser.GameObjects.Sprite || obj instanceof Phaser.GameObjects.Image) {
            const key = obj.texture?.key;
            if (!key || key.startsWith('__')) return false;
            return obj.displayWidth > 16 && obj.displayHeight > 16;
        }
        if (obj instanceof Phaser.GameObjects.Rectangle) {
            const fill = obj.fillColor ?? 0;
            const r = (fill >> 16) & 255;
            const g = (fill >> 8) & 255;
            const b = fill & 255;
            const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
            return lum > 0.28 && obj.alpha > 0.55 && obj.displayWidth > 20;
        }
        return false;
    }

    private isRealObstacle(v: { visual?: Phaser.GameObjects.GameObject; text?: Phaser.GameObjects.GameObject; marker?: Phaser.GameObjects.GameObject; type?: string }) {
        if (this.isMeaningfulVisual(v.text)) return true;
        // Shadow/devour sprites can look like empty cells; without a label they must not seal.
        if (v.type === 'shadow' || v.type === 'devour') return false;
        if (v.visual instanceof Phaser.GameObjects.Rectangle) return this.isMeaningfulVisual(v.visual);
        return this.isMeaningfulVisual(v.visual);
    }

    private isObstacleAlive(v: { visual?: Phaser.GameObjects.GameObject; text?: Phaser.GameObjects.GameObject; marker?: Phaser.GameObjects.GameObject }) {
        return this.isRealObstacle(v);
    }

    private isLiveBossCell(r: number, c: number) {
        if (!this.isBossOccupancyReliable()) return false;
        return this.isBossFootprintCell(r, c);
    }

    private isBossFootprintCell(r: number, c: number) {
        const gameScene = this.scene as unknown as import('../types').GameSceneLike;
        const occ = gameScene.bossManager?.getOccupancy?.();
        if (!occ) return false;
        return r >= occ.r && r < occ.r + occ.h && c >= occ.c && c < occ.c + occ.w;
    }

    /** Ignore stale occupancy when the Boss sprite is gone or nowhere near its 2×2. */
    private isBossOccupancyReliable() {
        const gameScene = this.scene as unknown as import('../types').GameSceneLike;
        const boss = gameScene.bossManager?.getActiveBoss?.();
        const occ = gameScene.bossManager?.getOccupancy?.();
        if (!boss || !occ || !this.isDisplayAlive(boss)) return false;
        const p1 = this.getPixel(occ.r, occ.c);
        const p2 = this.getPixel(occ.r + occ.h - 1, occ.c + occ.w - 1);
        const cx = (p1.x + p2.x) / 2;
        const cy = (p1.y + p2.y) / 2;
        if (Math.abs(boss.x - cx) > this.tileSize * 1.6) return false;
        // Allow the drop-in tween from above; reject a sprite that has wandered off the board.
        if (boss.y > cy + this.tileSize * 1.5) return false;
        if (boss.y < this.startY - this.tileSize * 6) return false;
        return true;
    }

    private hasOccupyingTile(r: number, c: number) {
        const tile = this.tiles[r]?.[c];
        if (!tile || !tile.active || tile.toBeDestroyed) return false;
        return !!(tile.character || tile.item);
    }

    private doesBossOverlapCell(r: number, c: number) {
        const gameScene = this.scene as unknown as import('../types').GameSceneLike;
        const boss = gameScene.bossManager?.getActiveBoss?.();
        if (!boss || !this.isDisplayAlive(boss)) return false;
        const px = this.getPixel(r, c);
        const half = this.tileSize / 2;
        const bounds = boss.getBounds();
        const overlapW = Math.min(px.x + half, bounds.right) - Math.max(px.x - half, bounds.left);
        const overlapH = Math.min(px.y + half, bounds.bottom) - Math.max(px.y - half, bounds.top);
        if (overlapW <= 0 || overlapH <= 0) return false;
        return (overlapW * overlapH) / (this.tileSize * this.tileSize) > 0.35;
    }

    private isSealedCell(r: number, c: number) {
        if (this.getObstacleCellSet().has(this.obstacleCellKey(r, c))) return true;
        return this.isLiveBossCell(r, c) && this.doesBossOverlapCell(r, c);
    }

    /** Rebuild blocked from visible obstacles + a Boss that is actually on its footprint. */
    private rebuildBlockedFromWorld() {
        this.pruneDeadObstacles();
        for (let r = 0; r < this.rows; r++) {
            for (let c = 0; c < this.cols; c++) {
                this.blocked[r][c] = this.isSealedCell(r, c);
            }
        }
    }

    /** Unblock leftover walls that are not a live Boss footprint or a real obstacle. Never touches tiles. */
    public clearUnjustifiedBlocked() {
        this.rebuildBlockedFromWorld();
    }

    /** After Boss skills / occupancy reconcile, pack leftover holes on the last swipe path. */
    public packAfterExternalEffects() {
        this.sanitizeGridState();
        this.rebuildBlockedFromWorld();
        this.refreshBlockedMarkers();
        const dir = this.lastMoveDir ?? { x: 0, y: 1 };
        this.compactEmptyAlong(dir.x, dir.y);
        this.refreshMergeHints();
    }

    private destroyObstacleVisual(v: { visual?: Phaser.GameObjects.GameObject; text?: Phaser.GameObjects.GameObject; marker?: Phaser.GameObjects.GameObject }) {
        v.visual?.destroy?.();
        v.text?.destroy?.();
        v.marker?.destroy?.();
    }

    private getObstacleCellSet() {
        return new Set(
            (this.bossVisuals || [])
                .filter(v => this.isObstacleAlive(v))
                .map(v => this.obstacleCellKey(v.r, v.c))
        );
    }

    /** Drop obstacle entries whose sprites were destroyed or never visible. */
    public pruneDeadObstacles() {
        if (!this.bossVisuals) return;
        this.bossVisuals = this.bossVisuals.filter(v => {
            if (this.isObstacleAlive(v)) return true;
            if (v.r >= 0 && v.r < this.rows && v.c >= 0 && v.c < this.cols) {
                this.blocked[v.r][v.c] = false;
            }
            this.destroyObstacleVisual(v);
            return false;
        });
    }

    public refreshBlockedMarkers() {
        this.blockedMarkers.forEach(marker => {
            if (marker.active) marker.destroy();
        });
        this.blockedMarkers = [];
        const obstacles = this.getObstacleCellSet();
        for (let r = 0; r < this.rows; r++) {
            for (let c = 0; c < this.cols; c++) {
                if (!this.blocked[r][c] || this.hasOccupyingTile(r, c)) continue;
                if (obstacles.has(this.obstacleCellKey(r, c))) continue;
                const px = this.getPixel(r, c);
                const marker = this.scene.add.rectangle(px.x, px.y, this.tileSize - 10, this.tileSize - 10, 0x553300, 0.4);
                marker.setStrokeStyle(5, 0xffcc44, 1);
                marker.setDepth(8);
                this.blockedMarkers.push(marker);
            }
        }
    }

    /** Drop leftover Boss occupancy so empty cells are walkable again; keep live skill obstacles. */
    public clearBossOccupancyKeepingObstacles() {
        this.pruneDeadObstacles();
        const obstacles = this.getObstacleCellSet();
        for (let r = 0; r < this.rows; r++) {
            for (let c = 0; c < this.cols; c++) {
                if (this.blocked[r][c] && !obstacles.has(this.obstacleCellKey(r, c))) {
                    this.blocked[r][c] = false;
                }
            }
        }
    }

    public inferBossOccupancy(w = 2, h = 2): { r: number; c: number } | null {
        const obstacles = this.getObstacleCellSet();
        for (let r = 0; r <= this.rows - h; r++) {
            for (let c = 0; c <= this.cols - w; c++) {
                let matches = true;
                for (let i = r; i < r + h && matches; i++) {
                    for (let j = c; j < c + w; j++) {
                        if (!this.blocked[i][j] || obstacles.has(this.obstacleCellKey(i, j))) {
                            matches = false;
                            break;
                        }
                    }
                }
                if (matches) return { r, c };
            }
        }
        return null;
    }

    public canPlaceBoss(r: number, c: number, w = 2, h = 2) {
        return r >= 0 && c >= 0 && r + h <= this.rows && c + w <= this.cols;
    }

    // Expose for Game Scene
    public isFull(): boolean {
        return this.getEmptySpots().length === 0;
    }

    public canMove(): boolean {
        this.sanitizeGridState();
        // Check if any merge is possible
        // Horizontal
        for (let r = 0; r < this.rows; r++) {
            for (let c = 0; c < this.cols - 1; c++) {
                const t1 = this.tiles[r][c];
                const t2 = this.tiles[r][c+1];
                if (t1 && t2 && !t1.isFrozen && !t2.isFrozen && this.getMergeResult(t1, t2)) return true;
            }
        }
        // Vertical
        for (let r = 0; r < this.rows - 1; r++) {
            for (let c = 0; c < this.cols; c++) {
                const t1 = this.tiles[r][c];
                const t2 = this.tiles[r+1][c];
                if (t1 && t2 && !t1.isFrozen && !t2.isFrozen && this.getMergeResult(t1, t2)) return true;
            }
        }
        return false;
    }

    private initInput() {
        this.scene.input.on('pointerup', (pointer: Phaser.Input.Pointer) => {
            if ((this.scene as { isShowingUnlock?: boolean }).isShowingUnlock) return;

            const duration = pointer.upTime - pointer.downTime;
            const dist = Phaser.Math.Distance.Between(pointer.downX, pointer.downY, pointer.upX, pointer.upY);
            const scene = this.scene as Phaser.Scene & { skillAimActive?: boolean; retargetSkillAim?: (r: number, c: number) => void };

            if (scene.skillAimActive) {
                if (duration < 280 && dist < 36) this.handleAimTap(pointer.upX, pointer.upY);
                return;
            }

            if (duration < 200 && dist < 20) {
                if (!this.isResolvingMove) this.handleTap(pointer.upX, pointer.upY);
                return;
            }

            const swipeThreshold = 30;
            if (dist < swipeThreshold) return;

            const angle = Phaser.Math.Angle.Between(pointer.downX, pointer.downY, pointer.upX, pointer.upY);
            const deg = Phaser.Math.RadToDeg(angle);
            let dirX = 0;
            let dirY = 0;
            if (deg >= -45 && deg <= 45) dirX = 1;
            else if (deg >= 45 && deg <= 135) dirY = 1;
            else if (deg >= 135 || deg <= -135) dirX = -1;
            else if (deg >= -135 && deg <= -45) dirY = -1;
            this.requestMove(dirX, dirY);
        });
    }

    private requestMove(dirX: number, dirY: number) {
        if (this.isResolvingMove) {
            if (this.inputBufferEnabled) this.pendingSwipe = { dirX, dirY };
            return;
        }
        if (this.lastMoveEndTime > 0 && this.scene.time.now - this.lastMoveEndTime < 80) {
            if (this.inputBufferEnabled) this.pendingSwipe = { dirX, dirY };
            return;
        }
        this.move(dirX, dirY);
    }

    private flushPendingSwipe() {
        if (!this.pendingSwipe || this.isResolvingMove) return;
        const next = this.pendingSwipe;
        this.pendingSwipe = null;
        this.move(next.dirX, next.dirY);
    }

    /** 悔棋前调用：丢弃尚未落定的滑动结算回调，避免补落子/压实覆盖已回滚的盘面。 */
    public cancelPendingResolve() {
        if (this.pendingResolveEvent) {
            this.pendingResolveEvent.remove(false);
            this.pendingResolveEvent = null;
        }
        this.isResolvingMove = false;
        this.pendingSwipe = null;
    }

    private handleAimTap(x: number, y: number) {
        const col = Math.floor((x - this.startX) / this.tileSize);
        const row = Math.floor((y - this.startY) / this.tileSize);
        if (row < 0 || col < 0 || row >= this.rows || col >= this.cols) return;
        const scene = this.scene as Phaser.Scene & { retargetSkillAim?: (r: number, c: number) => void };
        scene.retargetSkillAim?.(row, col);
    }

    private handleTap(x: number, y: number) {
        // Convert screen to grid coords
        const col = Math.floor((x - this.startX) / this.tileSize);
        const row = Math.floor((y - this.startY) / this.tileSize);

        if (row >= 0 && row < this.rows && col >= 0 && col < this.cols) {
            if (this.blocked[row][col]) {
                return;
            }
            const tile = this.tiles[row][col];
            // Toggle selection if clicking the same tile
            if (this.selectedTile === tile) {
                this.selectTile(null);
            } else {
                this.selectTile(tile);
            }
        } else {
            this.selectTile(null); // Click outside grid deselects
        }
    }

    public selectTile(tile: Tile | null) {
        // Deselect previous
        if (this.selectedTile && this.selectedTile !== tile) {
            if (this.selectedTile.active) this.selectedTile.stopIdle();
        }

        this.selectedTile = tile;
        
        if (tile) {
            this.selector.setVisible(true);
            this.selector.setPosition(tile.x, tile.y);
            tile.playIdle();
        } else {
            this.selector.setVisible(false);
        }

        this.refreshMergeHints();
        if (this.onTileSelected) {
            this.onTileSelected(tile);
        }
    }

    public previewNextCharacter(fromLevel: number): Character | null {
        const start = Math.max(1, fromLevel + 1);
        for (let lv = start; lv <= 101; lv++) {
            const hit = this.characters.find(c => c.level === lv && !c.hiddenEnding && !c.recipeOnly);
            if (hit) return hit;
        }
        return null;
    }

    public countLevel(level: number): number {
        return this.getAllTiles().filter(t => t.character?.level === level && !t.toBeDestroyed).length;
    }

    public getPairCensus(): Array<{ level: number; count: number }> {
        const counts = new Map<number, number>();
        this.getAllTiles().forEach(t => {
            const lv = t.character?.level;
            if (lv == null || t.toBeDestroyed) return;
            counts.set(lv, (counts.get(lv) || 0) + 1);
        });
        return [...counts.entries()]
            .filter(([, n]) => n >= 2)
            .sort((a, b) => a[0] - b[0])
            .map(([level, count]) => ({ level, count }));
    }

    public forecastSwipePairs(dirX: number, dirY: number): number {
        let pairs = 0;
        if (dirX !== 0) {
            for (let r = 0; r < this.rows; r++) pairs += this.forecastLineMerges(r, 'row', dirX);
        } else {
            for (let c = 0; c < this.cols; c++) pairs += this.forecastLineMerges(c, 'col', dirY);
        }
        return pairs;
    }

    public refreshMergeHints() {
        const focus = this.selectedTile?.character && !this.selectedTile.toBeDestroyed
            ? this.selectedTile
            : null;
        const focusLv = focus?.character?.level;
        const next = focusLv != null ? this.previewNextCharacter(focusLv) : null;
        const nextLv = next?.level;
        this.getAllTiles().forEach(tile => {
            tile.refreshLevelChip();
            if (!tile.character || tile.toBeDestroyed) {
                tile.setMergeHint('none');
                return;
            }
            if (focus && tile === focus) {
                tile.setMergeHint('focus', nextLv ? { nextLevel: nextLv } : undefined);
                return;
            }
            if (nextLv != null && tile.character.level === nextLv) {
                tile.setMergeHint('next');
                return;
            }
            tile.setMergeHint('none');
        });
    }

    private forecastLineMerges(index: number, axis: 'row' | 'col', dir: number): number {
        const span = axis === 'row' ? this.cols : this.rows;
        let pairs = 0;
        let segment: Tile[] = [];
        const flush = () => {
            if (segment.length >= 2) pairs += this.countCompactMerges(segment, dir);
            segment = [];
        };
        for (let i = 0; i < span; i++) {
            const r = axis === 'row' ? index : i;
            const c = axis === 'row' ? i : index;
            if (this.blocked[r][c]) {
                flush();
                continue;
            }
            const tile = this.tiles[r][c];
            if (tile?.isFrozen) {
                flush();
                continue;
            }
            if (tile && !tile.toBeDestroyed) segment.push(tile);
        }
        flush();
        return pairs;
    }

    private countCompactMerges(line: Tile[], dir: number): number {
        let pairs = 0;
        if (dir > 0) {
            for (let i = line.length - 1; i > 0; ) {
                if (this.peekMerge(line[i - 1], line[i])) {
                    pairs++;
                    i -= 2;
                } else {
                    i -= 1;
                }
            }
        } else {
            for (let i = 0; i < line.length - 1; ) {
                if (this.peekMerge(line[i], line[i + 1])) {
                    pairs++;
                    i += 2;
                } else {
                    i += 1;
                }
            }
        }
        return pairs;
    }

    private peekMerge(a: Tile, b: Tile): Character | null {
        return MergeEngine.resolve(a, b, {
            recipes: this.recipes,
            charMap: this.charMap,
            getReasonableSpikeCap: () => this.getReasonableSpikeCap()
        }, (level) => this.findCharacterByLevel(level));
    }

    public getPixel(row: number, col: number) {
        return {
            x: this.startX + col * this.tileSize + this.tileSize / 2,
            y: this.startY + row * this.tileSize + this.tileSize / 2
        };
    }

    public getStartX(): number { return this.startX; }
    public getStartY(): number { return this.startY; }
    public getTileSize(): number { return this.tileSize; }

    public getMaxLevel(): number {
        let max = 1;
        for (let r = 0; r < this.rows; r++) {
            for (let c = 0; c < this.cols; c++) {
                const tile = this.tiles[r][c];
                if (tile && tile.character) {
                    max = Math.max(max, tile.character.level);
                }
            }
        }
        return max;
    }

    public getEndgamePhase(): EndgamePhase {
        this.updateEndgamePhase();
        return this.endgamePhase;
    }

    public getBrushTargetLevel(): number {
        const maxLevel = this.getMaxLevel();
        if (this.getEndgamePhase() === 'normal') {
            return Math.max(1, maxLevel - 1);
        }
        return Math.max(this.minActiveLevel, Math.min(95, maxLevel - 3));
    }

    public registerEndgameEvent(_source: string = 'generic') {
        if (this.getMaxLevel() >= 91) {
            this.endgameEventCount++;
            this.updateEndgamePhase();
        }
    }

    public setHarmonyChallengeAccepted(accepted: boolean) {
        this.harmonyChallengeAccepted = accepted;
        if (!accepted) {
            this.harmonyStableMoves = 0;
            this.lastHarmonySignature = '';
            return;
        }

        this.updateEndgamePhase();
        if (this.endgamePhase === 'harmony' && !this.harmonyAchieved) {
            this.scene.events.emit('harmony-progress', this.getHarmonySnapshot());
        }
    }

    public getEndingCharacter(routeStyle?: string): Character | null {
        return this.endgameController.getEndingCharacter(this.characters, routeStyle);
    }

    public getEndingCharacterByRoute(routeStyle: string): Character | null {
        return this.getEndingCharacter(routeStyle);
    }

    public getHarmonySnapshot(): HarmonySnapshot {
        let occupiedCharacterCount = 0;
        let level101Count = 0;
        let level95PlusCount = 0;
        let lowLevelPollution = 0;

        for (let r = 0; r < this.rows; r++) {
            for (let c = 0; c < this.cols; c++) {
                const tile = this.tiles[r][c];
                if (!tile || !tile.character || tile.character.hiddenEnding) continue;
                occupiedCharacterCount++;
                if (tile.character.level >= 101) level101Count++;
                if (tile.character.level >= 95) level95PlusCount++;
                if (tile.character.level < 85) lowLevelPollution++;
            }
        }

        const effectiveCellCount = occupiedCharacterCount;
        const highTierRatio = effectiveCellCount > 0 ? level95PlusCount / effectiveCellCount : 0;
        const harmonyReady = !this.harmonyAchieved &&
            this.harmonyChallengeAccepted &&
            level101Count >= 2 &&
            highTierRatio >= 0.35 &&
            this.harmonyStableMoves >= 3 &&
            this.endgameEventCount >= 1;

        return {
            phase: this.endgamePhase,
            maxLevel: this.getMaxLevel(),
            level101Count,
            level95PlusCount,
            effectiveCellCount,
            highTierRatio,
            lowLevelPollution,
            stableMoves: this.harmonyStableMoves,
            endgameEventCount: this.endgameEventCount,
            harmonyReady
        };
    }

    private updateEndgamePhase() {
        const maxLevel = this.getMaxLevel();
        let nextPhase: EndgamePhase = 'normal';

        if (this.harmonyAchieved) nextPhase = 'trueEnding';
        else if (maxLevel >= 101) nextPhase = 'harmony';
        else if (maxLevel >= 91) nextPhase = 'ascension';

        if (nextPhase !== this.endgamePhase) {
            this.endgamePhase = nextPhase;
            this.scene.events.emit('endgame-phase-changed', this.getHarmonySnapshot());
        }
    }

    private updateHarmonyAfterMove(hadBoardChange: boolean) {
        this.updateEndgamePhase();
        if (this.endgamePhase !== 'harmony' || this.harmonyAchieved || !this.harmonyChallengeAccepted) return;

        const snapshotBefore = this.getHarmonySnapshot();
        const hasHarmonyBoard =
            snapshotBefore.level101Count >= 2 &&
            snapshotBefore.highTierRatio >= 0.35 &&
            snapshotBefore.endgameEventCount >= 1 &&
            snapshotBefore.lowLevelPollution <= 2;

        if (hadBoardChange && hasHarmonyBoard) {
            this.harmonyStableMoves = Math.min(3, this.harmonyStableMoves + 1);
        } else if (!hasHarmonyBoard) {
            this.harmonyStableMoves = 0;
        }

        const snapshot = this.getHarmonySnapshot();
        const signature = [
            snapshot.level101Count,
            snapshot.level95PlusCount,
            snapshot.stableMoves,
            snapshot.endgameEventCount,
            snapshot.lowLevelPollution
        ].join(':');

        if (signature !== this.lastHarmonySignature) {
            this.lastHarmonySignature = signature;
            this.scene.events.emit('harmony-progress', snapshot);
        }

        if (snapshot.harmonyReady) {
            this.harmonyAchieved = true;
            this.endgamePhase = 'trueEnding';
            const endingChar = this.getEndingCharacter();
            const finalSnapshot = this.getHarmonySnapshot();
            this.scene.events.emit('endgame-phase-changed', finalSnapshot);
            this.scene.events.emit('harmony-achieved', { snapshot: finalSnapshot, endingChar });
        }
    }

    private findCharacterByLevel(level: number, excludeHidden: boolean = true): Character | null {
        const maxLv = 101;
        const start = Math.max(1, level);
        for (let lv = start; lv <= maxLv; lv++) {
            const candidates = this.characters.filter(c => {
                if (c.level !== lv) return false;
                if (!excludeHidden) return true;
                return !c.hiddenEnding && !c.recipeOnly;
            });
            if (candidates.length > 0) return Phaser.Utils.Array.GetRandom(candidates);
            if (!excludeHidden) break;
        }
        return null;
    }

    private getReasonableSpikeCap(baseLevel: number = this.getMaxLevel()): number {
        if (baseLevel >= 101) return Math.max(101, baseLevel + 1);
        if (baseLevel >= 91) return Math.max(95, baseLevel + 6);
        return Math.max(20, baseLevel + 20);
    }

    private spawnTile() {
        this.commitNextSpawn();
        this.queueNextSpawn();
        this.tickShadowObstacles();
    }

    private createTileAt(spot: {r: number, c: number}, char: Character) {
        // Unlock Check (for spawns)
        if (this.saveManager.unlockCharacter(char.id)) {
            this.scene.events.emit('unlock-character', char);
        }

        const tile = new Tile(this.scene, spot.r, spot.c, this.tileSize, char, 'character');
        const pos = this.getPixel(spot.r, spot.c);
        tile.setPosition(pos.x, pos.y);
        tile.setScale(0);
        this.scene.tweens.add({
            targets: tile,
            scaleX: 1,
            scaleY: 1,
            duration: 200,
            onComplete: () => tile.ensureNormalScale()
        });
        this.tiles[spot.r][spot.c] = tile;
        this.trackTile(tile);
        this.lastSpawnedTile = tile;

        // If portrait is still loading (deferred Lv.21+), refresh when ready.
        CharacterAssetLoader.ensureCharacter(this.scene, char, () => {
            if (this.tiles[spot.r][spot.c] === tile) tile.ensureNormalScale();
        });
        return tile;
    }

    private getNeededRecipeIngredient(maxLevel: number): Character | null {
        const minSpawn = Math.max(1, maxLevel - 6);
        
        // Collect IDs on board
        const boardIds = new Set<string>();
        for (let r = 0; r < this.rows; r++) {
            for (let c = 0; c < this.cols; c++) {
                if (this.tiles[r][c]?.character) {
                    boardIds.add(this.tiles[r][c]!.character!.id);
                }
            }
        }

        // Find relevant mutation recipes
        for (const recipe of this.recipes) {
            if (recipe.type === 'mutation') {
                const [idA, idB] = recipe.ingredients;
                const hasA = boardIds.has(idA);
                const hasB = boardIds.has(idB);

                // If we have one but not the other
                if (hasA && !hasB) {
                    const charB = this.charMap.get(idB);
                    // Only help if the missing part is too low level to spawn normally
                    if (charB && !charB.recipeOnly && !charB.hiddenEnding && charB.level < minSpawn) return charB;
                } else if (!hasA && hasB) {
                    const charA = this.charMap.get(idA);
                    if (charA && !charA.recipeOnly && !charA.hiddenEnding && charA.level < minSpawn) return charA;
                }
            }
        }
        return null;
    }

    private checkTierCleanup() {
        const maxLevel = this.getMaxLevel();
        if (maxLevel <= this.lastMaxLevel) return;
        
        this.lastMaxLevel = maxLevel;

        // Dynamic Floor Raising Logic
        // We want to keep the board within a manageable range (e.g., 10 levels)
        // If maxLevel is 15, minActiveLevel should be around 5.
        
        // Raise the cleanup floor gradually so a single spike does not suddenly wipe the whole board.
        const cleanupWindow = maxLevel >= 91 ? 12 : 10;
        const maxStep = maxLevel >= 91 ? 2 : 3;
        const targetMin = Math.max(1, Math.min(maxLevel - cleanupWindow, this.minActiveLevel + maxStep));
        
        if (targetMin > this.minActiveLevel) {
            // Trigger Cleanup
            const tilesToDestroy: {r: number, c: number, tile: Tile}[] = [];

            for (let r = 0; r < this.rows; r++) {
                for (let c = 0; c < this.cols; c++) {
                    const tile = this.tiles[r][c];
                    // Remove characters below targetMin
                    if (tile && tile.character && tile.character.level < targetMin) {
                        if (this.isCriticalIngredient(tile.character.id)) continue;
                        if (this.protectedCharIds.includes(tile.character.id)) continue; // Protect Boss Weakness
                        
                        tilesToDestroy.push({r, c, tile});
                    }
                }
            }
            
            this.minActiveLevel = targetMin;
            
            if (tilesToDestroy.length > 0) {
                this.scene.events.emit('show-toast', `随着等级提升，Lv.${targetMin} 以下的马已自动离场！👋`);

                tilesToDestroy.forEach(item => {
                    // Emit visual effect event
                    if (item.tile.character) {
                        this.scene.events.emit('tile-cleanup', item.tile.x, item.tile.y, item.tile.character.level * 10);
                    }
                    
                    this.destroyTile(item.tile);
                });
            }
        }
    }

    private isCriticalIngredient(id: string): boolean {
        // Protect units that are part of special recipes
        // BUT only if the other ingredient is also present on the board!
        
        // 1. Find recipes involving this ID
        const relevantRecipes = this.recipes.filter(r => r.ingredients.includes(id) && (r.type === 'mutation' || r.type === 'catalyst'));
        
        if (relevantRecipes.length === 0) return false;

        // 2. Check if partner ingredient exists
        for (const recipe of relevantRecipes) {
            const partnerId = recipe.ingredients.find(i => i !== id);
            
            // Special case: 'any_horse' recipes (like Cannon, Tiger, Brush)
            // If this unit is being checked, it IS a horse.
            // So we just check if the Item exists.
            if (recipe.ingredients.includes('any_horse')) {
                // The partner is the specific item ID
                const itemId = recipe.ingredients.find(i => i !== 'any_horse');
                if (itemId && this.hasItemOnBoard(itemId)) return true;
            } 
            else if (partnerId) {
                // Standard specific recipe (e.g. Bamboo Horse + Plum)
                // Check if partner exists (could be Item or Character)
                if (this.hasCharacterOnBoard(partnerId) || this.hasItemOnBoard(partnerId)) return true;
            }
        }

        return false;
    }

    private hasItemOnBoard(itemId: string): boolean {
        for (let r = 0; r < this.rows; r++) {
            for (let c = 0; c < this.cols; c++) {
                if (this.tiles[r][c]?.item?.id === itemId) return true;
            }
        }
        return false;
    }

    private hasCharacterOnBoard(charId: string): boolean {
        for (let r = 0; r < this.rows; r++) {
            for (let c = 0; c < this.cols; c++) {
                if (this.tiles[r][c]?.character?.id === charId) return true;
            }
        }
        return false;
    }

    public getSelectedTile(): Tile | null {
        return this.selectedTile;
    }

    public getAllTiles(): Tile[] {
        return this.tiles.flat().filter((t): t is Tile => t !== null);
    }


    public applyBossSkill(skillType: string, count: number) {
        switch (skillType) {
            case 'fire':
                this.blockRandomSpots(count, 'fire');
                break;
            case 'stone':
                this.blockRandomSpots(count, 'stone');
                break;
            case 'magma':
                this.blockRandomSpots(count, 'magma');
                this.killLowLevel(4); // Magma kills Lv.4 and below
                break;
            case 'shadow':
                this.blockRandomSpots(count, 'shadow');
                break;
            case 'shadow_clone':
                this.spawnShadowCloneObstacle();
                break;
            case 'freeze':
                this.freezeRandomTiles(count);
                break;
            case 'devour':
                this.blockRandomSpots(count, 'devour');
                break;
            case 'poison':
                this.blockRandomSpots(count, 'poison');
                break;
        }
    }

    private bossVisuals: any[] = [];

    private blockRandomSpots(count: number, type: string) {
        const spots = this.getEmptySpots();
        Phaser.Utils.Array.Shuffle(spots);
        const toBlock = spots.slice(0, count);

        toBlock.forEach(spot => {
            this.blocked[spot.r][spot.c] = true;
            const px = this.getPixel(spot.r, spot.c);
            
            let iconKey = '';
            let fallbackColor = 0xffcc44;
            let fallbackIcon = '⛔';

            if (type === 'fire') { iconKey = 'icon_fire'; fallbackColor = 0xff5500; fallbackIcon = '🔥'; }
            if (type === 'stone') { iconKey = 'icon_stone'; fallbackColor = 0xaaaaaa; fallbackIcon = '🪨'; }
            if (type === 'magma') { iconKey = 'icon_magma'; fallbackColor = 0xff4400; fallbackIcon = '🌋'; }
            if (type === 'shadow') { iconKey = 'icon_shadow'; fallbackColor = 0x8877cc; fallbackIcon = '👤'; }
            if (type === 'devour') { iconKey = 'icon_devour'; fallbackColor = 0x9944ee; fallbackIcon = '🌌'; }
            if (type === 'poison') { iconKey = 'icon_poison'; fallbackColor = 0x33cc44; fallbackIcon = '☠️'; }

            const marker = this.scene.add.rectangle(px.x, px.y, this.tileSize - 8, this.tileSize - 8, fallbackColor, 0.75);
            marker.setStrokeStyle(4, 0xffee88, 1);
            marker.setDepth(8);

            let visualObj: Phaser.GameObjects.GameObject = marker;
            if (this.scene.textures.exists(iconKey)) {
                const sprite = this.scene.add.sprite(px.x, px.y, iconKey);
                const scale = (this.tileSize - 10) / Math.max(sprite.width, sprite.height);
                sprite.setScale(scale);
                sprite.setAlpha(0.95);
                sprite.setDepth(9);
                visualObj = sprite;
            }

            const textObj = this.scene.add.text(px.x, px.y, fallbackIcon, { fontSize: '36px' }).setOrigin(0.5).setDepth(10);

            this.bossVisuals.push({
                r: spot.r,
                c: spot.c,
                visual: visualObj,
                text: textObj,
                type,
                marker: visualObj === marker ? null : marker
            });
        });
    }

    public clearBossEffects(type?: string) {
        if (this.bossVisuals) {
            this.bossVisuals = this.bossVisuals.filter(v => {
                if (!type || v.type === type) {
                    this.blocked[v.r][v.c] = false;
                    this.destroyObstacleVisual(v);
                    return false; // remove from array
                }
                return true; // keep
            });
        }
    }

    private killLowLevel(maxLevelToKill: number) {
        let count = 0;
        for (let r = 0; r < this.rows; r++) {
            for (let c = 0; c < this.cols; c++) {
                const t = this.tiles[r][c];
                if (t && t.character && t.character.level <= maxLevelToKill && !this.blocked[r][c]) {
                    if (!this.isCriticalIngredient(t.character.id)) {
                        const px = this.getPixel(r, c);
                        this.playSmokeEffect(px.x, px.y);
                        this.destroyTile(t);
                        count++;
                    }
                }
            }
        }
        if (count > 0) this.scene.events.emit('show-toast', `🌋 熔岩烧毁了 ${count} 个低级单位！`);
    }

    public freezeRandomTiles(count: number) {
        const availableTiles = [];
        for (let r = 0; r < this.rows; r++) {
            for (let c = 0; c < this.cols; c++) {
                const t = this.tiles[r][c];
                if (t && !t.isFrozen && !this.blocked[r][c]) {
                    availableTiles.push(t);
                }
            }
        }
        
        // Shuffle and pick
        Phaser.Utils.Array.Shuffle(availableTiles);
        const toFreeze = availableTiles.slice(0, count);
        
        toFreeze.forEach(t => {
            t.setFrozen(true);
            this.scene.events.emit('show-toast', "🥶"); // Visual feedback
        });
    }

    public shuffleBoard(): boolean {
        // 1. Collect valid tiles (Skip Blocked/Boss areas and Frozen tiles)
        const tilesToShuffle: Tile[] = [];
        const itemsToShuffle: Tile[] = [];
        
        for (let r = 0; r < this.rows; r++) {
            for (let c = 0; c < this.cols; c++) {
                // Skip blocked (Boss) areas
                if (this.blocked[r][c]) continue;

                const t = this.tiles[r][c];
                if (t) {
                    // Skip Frozen tiles (Option A: they stay in place)
                    if (t.isFrozen) continue;

                    if (t.character) tilesToShuffle.push(t);
                    else if (t.item) itemsToShuffle.push(t);
                    
                    // Remove from grid temporarily (but keep visual object alive)
                    this.tiles[r][c] = null;
                }
            }
        }

        // 2. Sort characters by level (Descending)
        tilesToShuffle.sort((a, b) => {
            const lvA = a.character!.level;
            const lvB = b.character!.level;
            return lvB - lvA; // High level first
        });

        // 3. Place back in Snake Pattern
        // Iterate through grid positions, skipping blocked and occupied (frozen) spots
        
        let currentR = 0;
        let currentC = 0;
        let direction = 1; // 1 for Right, -1 for Left

        // Helper to get next valid spot
        const getNextSpot = () => {
            while (currentR < this.rows) {
                // Check bounds and validity
                if (currentC >= 0 && currentC < this.cols) {
                    const isBlocked = this.blocked[currentR][currentC];
                    const isOccupied = this.tiles[currentR][currentC] !== null; // Frozen tiles are still here
                    
                    if (!isBlocked && !isOccupied) {
                        return { r: currentR, c: currentC };
                    }
                }

                // Advance
                currentC += direction;
                if (currentC >= this.cols || currentC < 0) {
                    currentR++;
                    direction *= -1; // Flip direction
                    currentC += direction; // Step back into bounds
                }
            }
            return null;
        };

        const placeTile = (tile: Tile) => {
            const spot = getNextSpot();
            if (spot) {
                this.tiles[spot.r][spot.c] = tile;
                tile.row = spot.r;
                tile.col = spot.c;
                this.moveTile(tile, spot.r, spot.c);
                
                // Advance pointer for next call
                currentC += direction;
                if (currentC >= this.cols || currentC < 0) {
                    currentR++;
                    direction *= -1;
                    currentC += direction;
                }
            } else {
                console.warn("Run out of space during shuffle? Should not happen.");
            }
        };

        // Place Characters first
        tilesToShuffle.forEach(t => placeTile(t));
        
        // Place Items
        itemsToShuffle.forEach(t => placeTile(t));

        return tilesToShuffle.length + itemsToShuffle.length > 0;
    }

    public smartShuffle() {
        if (this.shuffleBoard()) {
            this.scene.events.emit('show-toast', "🌪️ 拂尘一扫，乾坤挪移！");
        }
    }

    public consumeItem(tile: Tile) {
        if (!tile || !tile.item) return;
        this.destroyTile(tile);
        this.selectTile(null);
    }

    public spawnCharacter(level: number): boolean {
        const emptySpots = this.getEmptySpots();
        if (emptySpots.length === 0) return false;

        const currentMax = this.getMaxLevel();
        if (this.getAllTiles().length > 0 && level > this.getReasonableSpikeCap(currentMax)) {
            console.warn(`Blocked abnormal spawn: requested Lv.${level}, current max is Lv.${currentMax}`);
            return false;
        }

        const spot = Phaser.Utils.Array.GetRandom(emptySpots);
        const char = this.findCharacterByLevel(level);
        
        if (char && !char.hiddenEnding) {
            this.createTileAt(spot, char);
            this.maxProgressLevel = Math.max(this.maxProgressLevel, level);
            this.checkTierCleanup();
            this.updateEndgamePhase();
            return true;
        }
        return false;
    }

    public unfreezeAll() {
        let count = 0;
        for (let r = 0; r < this.rows; r++) {
            for (let c = 0; c < this.cols; c++) {
                const t = this.tiles[r][c];
                if (t && t.isFrozen) {
                    t.setFrozen(false);
                    count++;
                    const px = this.getPixel(r, c);
                    this.playStarEffect(px.x, px.y);
                }
            }
        }
        if (count > 0) {
             this.scene.events.emit('show-toast', `Boss被击败！解除了 ${count} 个冰冻！`);
        }
    }

    public useItemCannon(tile: Tile) {
        if (!tile || !tile.item || tile.item.id !== 'item_cannon') return;
        
        // Blast radius 1 around the cannon
        this.skillExecutor.applyBomb(tile, 1);
        
        // Also destroy the cannon itself
        this.destroyTile(tile);
        
        // Clear selection
        this.selectTile(null);
        this.packAfterExternalEffects();
    }

    public getMostCommonLevel(): number {
        const counts = new Map<number, number>();
        for (let r = 0; r < this.rows; r++) {
            for (let c = 0; c < this.cols; c++) {
                const tile = this.tiles[r][c];
                if (tile && tile.character) {
                    const lv = tile.character.level;
                    counts.set(lv, (counts.get(lv) || 0) + 1);
                }
            }
        }
        
        let maxCount = 0;
        let mostCommonLevel = 1;
        
        counts.forEach((count, level) => {
            if (count > maxCount) {
                maxCount = count;
                mostCommonLevel = level;
            } else if (count === maxCount) {
                if (level > mostCommonLevel) {
                    mostCommonLevel = level;
                }
            }
        });
        
        return mostCommonLevel;
    }

    public clearAllNegativeEffects(): number {
        let count = 0;
        for (let r = 0; r < this.rows; r++) {
            for (let c = 0; c < this.cols; c++) {
                const t = this.tiles[r][c];
                if (t && t.isFrozen) {
                    t.setFrozen(false);
                    count++;
                    const px = this.getPixel(r, c);
                    this.playStarEffect(px.x, px.y);
                }
            }
        }
        // 灭火、清障：清掉首领留下的火/毒/石/岩浆障碍（暗影复制体不是障碍，保留）
        const obstaclesBefore = this.getObstacleCellSet().size;
        for (const type of ['fire', 'poison', 'stone', 'magma']) {
            this.clearBossEffects(type);
        }
        const cleared = obstaclesBefore - this.getObstacleCellSet().size;
        if (cleared > 0) {
            this.rebuildBlockedFromWorld();
            this.refreshBlockedMarkers();
            count += cleared;
        }
        return count;
    }

    public applyItem(r: number, c: number, item: Item): boolean {
        if (r < 0 || r >= this.rows || c < 0 || c >= this.cols) return false;

        if (item.id === 'item_gold_ingot') {
            this.scene.events.emit('use-gold-ingot');
            return true;
        }
        if (item.id === 'item_plum') {
            this.clearAllNegativeEffects();
            this.scene.events.emit('show-toast', '青梅煮酒！全场净化！');
            return true;
        }
        if (item.id === 'item_whisk') {
            this.smartShuffle();
            this.scene.events.emit('show-toast', '马尾拂尘：棋盘已重排');
            return true;
        }

        const tile = this.tiles[r][c];

        // 1. Handle Empty Spot Drop (Place Item)
        if (!tile && !this.blocked[r][c]) {
            this.createItemAt({r, c}, item);
            return true;
        }

        // 2. Handle Target Interaction
        if (item.id === 'item_tiger') {
            return this.applyTigerEffect();
        } else if (item.id === 'item_deer_sign') {
            if (tile && tile.character) {
                // Transform target to most common level
                const targetLevel = this.getMostCommonLevel();
                const newChar = this.findCharacterByLevel(targetLevel);
                if (newChar) {
                    tile.upgrade(newChar, 'character');
                    this.scene.events.emit('show-toast', "指鹿为马！同化！");
                    return true;
                }
            }
        } else if (item.id === 'item_brush') {
            if (tile && tile.character) {
                const upgraded = this.findCharacterByLevel(Math.min(101, tile.character.level + 1));
                if (upgraded) {
                    tile.upgrade(upgraded, 'character');
                    this.scene.events.emit('show-toast', '神笔画马！目标升 1 级！');
                    return true;
                }
            }
        } else if (item.id === 'item_cannon') {
            if (tile) { 
                this.skillExecutor.applyBomb(tile, 1);
                this.packAfterExternalEffects();
                return true;
            }
        } else if (item.id === 'item_monkey') {
            if (tile && tile.character) {
                const upgraded = this.findCharacterByLevel(Math.min(90, tile.character.level + 2));
                if (upgraded) {
                    tile.upgrade(upgraded, 'character');
                    this.scene.events.emit('show-toast', '猴子献瑞！目标连升两级！');
                    return true;
                }
            }
        }
        return false;
    }

    public applyTigerEffect(): boolean {
        const gameScene = this.scene as any;
        const activeBoss = gameScene.bossManager?.getActiveBoss?.();
        if (activeBoss) {
            const maxHp = activeBoss.bossData?.maxHp ?? 0;
            const dmg = Math.floor(maxHp / 3);
            if (dmg > 0) gameScene.bossManager.takeDamage(dmg);
            this.scene.events.emit('show-toast', '老虎发威！Boss重伤！');
            return true;
        }
        this.scene.events.emit('show-toast', '老虎发威！但是没有首领！');
        return false;
    }

    public usePlacedItem(tile: Tile): boolean {
        if (!tile.item) return false;
        const id = tile.item.id;
        if (id === 'item_cannon') {
            this.useItemCannon(tile);
            this.scene.events.emit('show-toast', '大炮发射！周围被清空！');
            return true;
        }
        if (id === 'item_tiger') {
            if (!this.applyTigerEffect()) return false;
            this.consumeItem(tile);
            return true;
        }
        if (id === 'item_deer_sign') {
            const targetLevel = this.getMostCommonLevel();
            const newChar = this.findCharacterByLevel(targetLevel);
            if (!newChar) return false;
            tile.upgrade(newChar, 'character');
            this.scene.events.emit('show-toast', '指鹿为马！变身！');
            this.selectTile(null);
            return true;
        }
        if (id === 'item_brush') {
            this.scene.events.emit('show-toast', '神笔请拖到一只马上：目标升 1 级');
            return false;
        }
        if (id === 'item_plum') {
            this.consumeItem(tile);
            this.clearAllNegativeEffects();
            this.scene.events.emit('show-toast', '青梅煮酒！全场净化！');
            return true;
        }
        if (id === 'item_whisk') {
            this.consumeItem(tile);
            this.smartShuffle();
            this.scene.events.emit('show-toast', '马尾拂尘：棋盘已重排');
            return true;
        }
        if (id === 'item_gold_ingot') {
            this.consumeItem(tile);
            this.scene.events.emit('use-gold-ingot');
            return true;
        }
        return false;
    }

    public inspectSkill(tile: Tile): SkillPreview {
        return this.skillExecutor.inspect(tile);
    }

    public executeSkill(tile: Tile): SkillResult {
        return this.skillExecutor.execute(tile);
    }

    public getLastMoveDir(): { x: number; y: number } {
        return this.lastMoveDir ?? { x: 1, y: 0 };
    }

    public getSkillAimCell(): { r: number; c: number } | null {
        return this.skillAimCell;
    }

    public isGuardedTile(tile: Tile, caster?: Tile | null): boolean {
        if (caster && tile === caster) return true;
        if (tile.isShadowClone) return true;
        const char = tile.character;
        if (!char) return false;
        if (char.hiddenEnding || char.recipeOnly || char.rarity === 'Hidden') return true;
        if (this.protectedCharIds.includes(char.id)) return true;
        if (this.blocked[tile.row]?.[tile.col]) return true;
        return false;
    }

    public mergeLineNoSpawn(axis: 'row' | 'col', index: number): number {
        const dirX = axis === 'row' ? (this.lastMoveDir?.x || 1) : 0;
        const dirY = axis === 'col' ? (this.lastMoveDir?.y || 1) : 0;
        const rowIndices = axis === 'row' ? [index] : Array.from({ length: this.rows }, (_, i) => i);
        const colIndices = axis === 'col' ? [index] : Array.from({ length: this.cols }, (_, i) => i);
        if (dirX === 1) colIndices.reverse();
        if (dirY === 1) rowIndices.reverse();

        const mergedTiles = new Set<string>();
        let mergeCount = 0;

        for (const r of rowIndices) {
            for (const c of colIndices) {
                const tile = this.tiles[r][c];
                if (!tile || tile.isFrozen) continue;
                let nextR = r;
                let nextC = c;
                while (true) {
                    const checkR = nextR + dirY;
                    const checkC = nextC + dirX;
                    const role = this.getCellRole(checkR, checkC);
                    if (role === 'wall') break;
                    if (role === 'empty') {
                        nextR = checkR;
                        nextC = checkC;
                        continue;
                    }
                    const nextTile = this.tiles[checkR]?.[checkC];
                    if (!nextTile || nextTile.isFrozen) break;
                    const key = `${checkR},${checkC}`;
                    if (!mergedTiles.has(key)) {
                        const resultChar = this.getMergeResult(tile, nextTile);
                        if (resultChar) {
                            tile.toBeDestroyed = true;
                            nextTile.upgrade(resultChar, 'character', false);
                            this.tiles[r][c] = null;
                            const rest = this.farthestEmptyAlong(checkR, checkC, dirX, dirY);
                            if (rest.r !== checkR || rest.c !== checkC) {
                                this.tiles[checkR][checkC] = null;
                                this.tiles[rest.r][rest.c] = nextTile;
                                nextTile.row = rest.r;
                                nextTile.col = rest.c;
                                this.moveTile(nextTile, rest.r, rest.c);
                            }
                            this.moveTile(tile, rest.r, rest.c);
                            mergedTiles.add(`${rest.r},${rest.c}`);
                            mergeCount++;
                            if (this.onScoreChange) this.onScoreChange(resultChar, nextTile.x, nextTile.y, false);
                        }
                    }
                    break;
                }
                if ((nextR !== r || nextC !== c) && !tile.toBeDestroyed) {
                    this.tiles[r][c] = null;
                    this.tiles[nextR][nextC] = tile;
                    tile.row = nextR;
                    tile.col = nextC;
                    this.moveTile(tile, nextR, nextC);
                }
            }
        }
        this.compactEmptyAlong(dirX, dirY);
        return mergeCount;
    }

    public relocateTile(tile: Tile, r: number, c: number) {
        if (!tile?.active) return;
        if (r < 0 || c < 0 || r >= this.rows || c >= this.cols) return;
        if (this.tiles[tile.row]?.[tile.col] === tile) this.tiles[tile.row][tile.col] = null;
        this.tiles[r][c] = tile;
        tile.row = r;
        tile.col = c;
        this.moveTile(tile, r, c);
    }

    public tryMergePair(a: Tile, b: Tile): boolean {
        if (!a?.character || !b?.character || a === b) return false;
        const result = this.getMergeResult(a, b);
        if (!result) return false;
        a.toBeDestroyed = true;
        this.tiles[a.row][a.col] = null;
        b.upgrade(result, 'character', false);
        this.moveTile(a, b.row, b.col);
        if (this.onScoreChange) this.onScoreChange(result, b.x, b.y, false);
        return true;
    }

    public findMostCommonMergePair(): [Tile, Tile] | null {
        const groups = new Map<number, Tile[]>();
        this.getAllTiles().forEach(tile => {
            if (!tile.character || tile.isFrozen || this.blocked[tile.row][tile.col]) return;
            if (tile.character.recipeOnly || tile.character.hiddenEnding) return;
            const list = groups.get(tile.character.level) || [];
            list.push(tile);
            groups.set(tile.character.level, list);
        });
        const ranked = [...groups.entries()].sort((a, b) => b[1].length - a[1].length);
        for (const [, list] of ranked) {
            if (list.length < 2) continue;
            for (let i = 0; i < list.length; i++) {
                for (let j = i + 1; j < list.length; j++) {
                    if (this.getMergeResult(list[i], list[j])) return [list[i], list[j]];
                }
            }
        }
        return null;
    }

    public rotateOccupied(cells: Array<{ r: number; c: number }>): boolean {
        const unique = cells.filter((cell, idx, arr) =>
            arr.findIndex(other => other.r === cell.r && other.c === cell.c) === idx
        );
        const packed = unique
            .map(cell => ({ cell, tile: this.tiles[cell.r]?.[cell.c] }))
            .filter((entry): entry is { cell: { r: number; c: number }; tile: Tile } => !!entry.tile);
        if (packed.length < 2) return false;
        packed.forEach(entry => { this.tiles[entry.tile.row][entry.tile.col] = null; });
        packed.forEach((entry, i) => {
            const dest = packed[(i + 1) % packed.length].cell;
            this.tiles[dest.r][dest.c] = entry.tile;
            entry.tile.row = dest.r;
            entry.tile.col = dest.c;
            this.moveTile(entry.tile, dest.r, dest.c);
        });
        return true;
    }

    public spawnPublicBand(count: number): number {
        let spawned = 0;
        const band = Math.max(1, this.getMaxLevel() - 4);
        for (let i = 0; i < count; i++) {
            const spots = this.getEmptySpots();
            if (spots.length === 0) break;
            const char = this.findCharacterByLevel(band);
            if (!char) break;
            this.createTileAt(Phaser.Utils.Array.GetRandom(spots), char);
            spawned++;
        }
        return spawned;
    }

    public getSkillHighlightCells(tile: Tile): Array<{ r: number; c: number; color: number; alpha?: number }> {
        return this.skillExecutor.getHighlightCells(tile);
    }

    private destroyTile(tile: Tile) {
        tile.toBeDestroyed = true;
        if (this.selectedTile === tile) this.selectTile(null);
        for (let r = 0; r < this.rows; r++) {
            for (let c = 0; c < this.cols; c++) {
                if (this.tiles[r][c] === tile) this.tiles[r][c] = null;
            }
        }
        this.scene.tweens.killTweensOf(tile);
        this.scene.tweens.add({
            targets: tile,
            scaleX: 0,
            scaleY: 0,
            alpha: 0,
            duration: 200,
            onComplete: () => this.destroyTileVisual(tile)
        });
    }

    private playSmokeEffect(x: number, y: number) {
        burstParticles(this.scene, x, y, 'particle_smoke', {
            speed: { min: 50, max: 100 },
            scale: { start: 0.5, end: 0 },
            alpha: { start: 1, end: 0 },
            lifespan: 600,
            quantity: 5
        });
    }

    private playStarEffect(x: number, y: number) {
        burstParticles(this.scene, x, y, 'particle_star', {
            speed: { min: 50, max: 150 },
            scale: { start: 0.8, end: 0 },
            alpha: { start: 1, end: 0 },
            lifespan: 800,
            quantity: 8,
            blendMode: 'ADD'
        });
    }

    private showFloatingText(x: number, y: number, text: string) {
        const t = this.scene.add.text(x, y, text, {
            fontFamily: 'Arial Black', fontSize: 32, color: '#ffd700', stroke: '#000000', strokeThickness: 4
        }).setOrigin(0.5);
        this.scene.tweens.add({
            targets: t,
            y: y - 100,
            alpha: 0,
            duration: 1000,
            onComplete: () => t.destroy()
        });
    }

    private playFactionEffect(x: number, y: number, faction: string) {
        let color = 0xffffff;
        if (faction === 'A') color = 0xff5555;
        if (faction === 'B') color = 0x5555ff;
        if (faction === 'C') color = 0x55ff55;
        if (faction === 'D') color = 0xffff55;

        const ring = this.scene.add.circle(x, y, 40);
        ring.setStrokeStyle(4, color);
        ring.setDepth(1500);
        this.scene.tweens.add({
            targets: ring,
            scale: 2,
            alpha: 0,
            duration: 600,
            onComplete: () => ring.destroy()
        });
    }

    private buildSkillHost(): GridSkillHost {
        const grid = this;
        return {
            scene: grid.scene,
            getRows: () => grid.rows,
            getCols: () => grid.cols,
            getTiles: () => grid.tiles,
            getBlocked: () => grid.blocked,
            getProtectedCharIds: () => grid.protectedCharIds,
            getMinActiveLevel: () => grid.minActiveLevel,
            getPixel: (r, c) => grid.getPixel(r, c),
            destroyTile: (tile) => grid.destroyTile(tile),
            moveTile: (tile, r, c) => grid.moveTile(tile, r, c),
            getMaxLevel: () => grid.getMaxLevel(),
            getEndgamePhase: () => grid.getEndgamePhase(),
            findCharacterByLevel: (level, excludeHidden) => grid.findCharacterByLevel(level, excludeHidden),
            getEmptySpots: () => grid.getEmptySpots(),
            createTileAt: (spot, char) => grid.createTileAt(spot, char),
            isCriticalIngredient: (id) => grid.isCriticalIngredient(id),
            clearBossEffects: (type) => grid.clearBossEffects(type),
            playSmokeEffect: (x, y) => grid.playSmokeEffect(x, y),
            playStarEffect: (x, y) => grid.playStarEffect(x, y),
            showFloatingText: (x, y, text) => grid.showFloatingText(x, y, text),
            getBossVisuals: () => grid.bossVisuals,
            removeBossVisualAt: (index) => {
                const v = grid.bossVisuals[index];
                if (!v) return;
                grid.blocked[v.r][v.c] = false;
                grid.destroyObstacleVisual(v);
                grid.bossVisuals.splice(index, 1);
            },
            getActiveBoss: () => {
                const gameScene = grid.scene as unknown as import('../types').GameSceneLike;
                return gameScene.bossManager?.getActiveBoss?.() ?? null;
            },
            getCharacters: () => grid.characters,
            shuffleBoard: () => grid.shuffleBoard(),
            getLastMoveDir: () => grid.getLastMoveDir(),
            getSkillAimCell: () => grid.getSkillAimCell(),
            mergeLineNoSpawn: (axis, index) => grid.mergeLineNoSpawn(axis, index),
            tryMergePair: (a, b) => grid.tryMergePair(a, b),
            findMostCommonMergePair: () => grid.findMostCommonMergePair(),
            rotateOccupied: (cells) => grid.rotateOccupied(cells),
            spawnPublicBand: (count) => grid.spawnPublicBand(count),
            isGuardedTile: (tile, caster) => grid.isGuardedTile(tile, caster),
            relocateTile: (tile, r, c) => grid.relocateTile(tile, r, c),
            canOfferLevel101Choice: () => {
                const game = grid.scene as Phaser.Scene & { canOfferLevel101Choice?: () => boolean };
                return game.canOfferLevel101Choice?.() ?? false;
            }
        };
    }

    private move(dirX: number, dirY: number) {
        if (this.isResolvingMove) return;
        this.onBeforeMove?.();
        this.lastSpawnedTile = null;
        this.sanitizeGridState();
        this.clearUnjustifiedBlocked();
        this.refreshBlockedMarkers();
        this.lastMoveDir = { x: dirX, y: dirY };
        this.isResolvingMove = true;

        // Deselect on move
        this.selectTile(null);

        let moved = false;
        let mergeCount = 0;
        const mergedResults: { char: Character; x: number; y: number; isCritical: boolean }[] = [];
        const unlockedResults: Character[] = [];
        
        // Define traversal order
        const rowIndices = Array.from({length: this.rows}, (_, i) => i);
        const colIndices = Array.from({length: this.cols}, (_, i) => i);

        // If moving Right (dirX=1), process Cols from Right to Left (7 to 0)
        if (dirX === 1) colIndices.reverse();
        // If moving Down (dirY=1), process Rows from Bottom to Top (7 to 0)
        if (dirY === 1) rowIndices.reverse();

        const mergedTiles = new Set<string>(); // Keep track of tiles merged this turn

        for (const r of rowIndices) {
            for (const c of colIndices) {
                const tile = this.tiles[r][c];
                if (!tile || tile.isFrozen) continue;

                let nextR = r;
                let nextC = c;

                // Scan forward to find farthest empty spot
                while (true) {
                    const checkR = nextR + dirY;
                    const checkC = nextC + dirX;

                    const role = this.getCellRole(checkR, checkC);
                    if (role === 'wall') break;
                    if (role === 'empty') {
                        nextR = checkR;
                        nextC = checkC;
                        continue;
                    }

                    const nextTile = this.tiles[checkR][checkC];
                    if (!nextTile) {
                        break;
                    } else {
                        if (nextTile.isFrozen) {
                            break; // Stop sliding when hitting a frozen tile
                        }
                        // Check Merge
                        // Can only merge if nextTile hasn't merged yet
                        const key = `${checkR},${checkC}`;
                        if (!mergedTiles.has(key)) {
                            const resultChar = this.getMergeResult(tile, nextTile);
                            if (resultChar) {
                                // Basic evolution now follows the game rule: same level can merge.
                                const isEvolution = tile.character && nextTile.character && tile.character.level === nextTile.character.level;
                                let finalResult = resultChar;
                                let isCritical = false;
                                let isFaction = false;

                                if (isEvolution) {
                                    // Faction Synergy Check
                                    if (tile.character!.faction === nextTile.character!.faction) {
                                        isFaction = true;
                                    }

                                    // Critical Merge Check (5% chance)
                                    // Only if result is not max level
                                    const critRate = this.balance?.criticalRate ?? 0.05;
                                    const pityThreshold = this.balance?.criticalPityThreshold ?? 40;
                                    const forceCrit = this.criticalPityCounter >= pityThreshold;
                                    const rolled = MergeEngine.rollCritical(resultChar, (lv) => this.findCharacterByLevel(lv), critRate, forceCrit);
                                    finalResult = rolled.result;
                                    isCritical = rolled.isCritical;
                                    if (isCritical) this.criticalPityCounter = 0;
                                    else this.criticalPityCounter++;
                                    
                                    this.maxProgressLevel = Math.max(this.maxProgressLevel, finalResult.level);
                                }

                                // MERGE at the collision cell, then keep sliding the result
                                // into any remaining empty cells on this path (no second merge).
                                tile.toBeDestroyed = true;
                                nextTile.upgrade(finalResult, 'character', false);
                                CharacterAssetLoader.ensureCharacter(this.scene, finalResult, () => {
                                    if (nextTile.active) nextTile.refreshSprite();
                                });

                                const rest = this.farthestEmptyAlong(checkR, checkC, dirX, dirY);
                                this.tiles[r][c] = null;
                                if (rest.r !== checkR || rest.c !== checkC) {
                                    this.tiles[checkR][checkC] = null;
                                    this.tiles[rest.r][rest.c] = nextTile;
                                    nextTile.row = rest.r;
                                    nextTile.col = rest.c;
                                    this.moveTile(nextTile, rest.r, rest.c);
                                }
                                this.moveTile(tile, rest.r, rest.c);
                                mergedTiles.add(`${rest.r},${rest.c}`);

                                const px = this.getPixel(rest.r, rest.c);
                                if (isCritical) {
                                    this.scene.events.emit('show-toast', "⚡ 暴击合成！连升两级！");
                                    this.playStarEffect(px.x, px.y);
                                }
                                if (isFaction && tile.character) {
                                    this.playFactionEffect(px.x, px.y, tile.character.faction);
                                }

                                if (this.saveManager.unlockCharacter(finalResult.id)) {
                                    unlockedResults.push(finalResult);
                                }

                                moved = true;
                                mergeCount++;
                                mergedResults.push({ char: finalResult, x: px.x, y: px.y, isCritical });
                                if (finalResult.level >= 95) {
                                    this.endgameEventCount++;
                                }
                            }
                        }
                        break; // Hit a tile, stop scanning
                    }
                }

                // If just moved (no merge)
                if ((nextR !== r || nextC !== c) && !tile.toBeDestroyed) {
                    this.tiles[r][c] = null;
                    this.tiles[nextR][nextC] = tile;
                    tile.row = nextR;
                    tile.col = nextC;
                    this.moveTile(tile, nextR, nextC);
                    moved = true;
                }
            }
        }

        if (this.compactEmptyAlong(dirX, dirY)) moved = true;

        if (moved) {
            this.pendingResolveEvent?.remove(false);
            this.pendingResolveEvent = this.scene.time.delayedCall(250, () => {
                this.pendingResolveEvent = null;
                mergedResults.forEach(merge => {
                    if (this.onScoreChange) this.onScoreChange(merge.char, merge.x, merge.y, merge.isCritical);
                });
                this.checkTierCleanup();
                this.sanitizeGridState();
                this.rebuildBlockedFromWorld();
                if (this.lastMoveDir) this.compactEmptyAlong(this.lastMoveDir.x, this.lastMoveDir.y);
                this.getAllTiles().forEach(t => t.ensureNormalScale());
                this.spawnTile();
                this.refreshMergeHints();
                this.updateHarmonyAfterMove(true);
                unlockedResults.forEach(char => {
                    this.scene.events.emit('unlock-character', char);
                });
                if (this.onMoveResolved) this.onMoveResolved(mergeCount > 0);
                this.isResolvingMove = false;
                this.lastMoveEndTime = this.scene.time.now;
                this.scene.time.delayedCall(10, () => this.flushPendingSwipe());
            });
        } else {
            this.isResolvingMove = false;
            this.lastMoveEndTime = this.scene.time.now;
            this.scene.time.delayedCall(10, () => this.flushPendingSwipe());
        }
    }

    private farthestEmptyAlong(r: number, c: number, dirX: number, dirY: number) {
        let nextR = r;
        let nextC = c;
        while (true) {
            const checkR = nextR + dirY;
            const checkC = nextC + dirX;
            if (this.getCellRole(checkR, checkC) !== 'empty') break;
            nextR = checkR;
            nextC = checkC;
        }
        return { r: nextR, c: nextC };
    }

    /** After merges, pack any leftover gaps on this swipe path. No additional merges. */
    private compactEmptyAlong(dirX: number, dirY: number) {
        const rowIndices = Array.from({ length: this.rows }, (_, i) => i);
        const colIndices = Array.from({ length: this.cols }, (_, i) => i);
        if (dirX === 1) colIndices.reverse();
        if (dirY === 1) rowIndices.reverse();

        let packed = false;
        for (const r of rowIndices) {
            for (const c of colIndices) {
                const tile = this.tiles[r][c];
                if (!tile || tile.isFrozen || tile.toBeDestroyed || tile === this.lastSpawnedTile) continue;
                const dest = this.farthestEmptyAlong(r, c, dirX, dirY);
                if (dest.r === r && dest.c === c) continue;
                this.tiles[r][c] = null;
                this.tiles[dest.r][dest.c] = tile;
                tile.row = dest.r;
                tile.col = dest.c;
                this.moveTile(tile, dest.r, dest.c);
                packed = true;
            }
        }
        return packed;
    }

    private moveTile(tile: Tile, r: number, c: number) {
        const pos = this.getPixel(r, c);
        this.scene.tweens.killTweensOf(tile);
        this.scene.tweens.add({
            targets: tile,
            x: pos.x,
            y: pos.y,
            alpha: tile.toBeDestroyed ? 0.35 : tile.alpha,
            duration: 150,
            onComplete: () => {
                if (tile.toBeDestroyed) this.destroyTileVisual(tile);
            }
        });
    }

    private getMergeResult(tileA: Tile, tileB: Tile): Character | null {
        return MergeEngine.resolve(tileA, tileB, {
            recipes: this.recipes,
            charMap: this.charMap,
            getReasonableSpikeCap: () => this.getReasonableSpikeCap(),
            onRecipeUsed: (recipe) => this.onRecipeDiscovered?.(recipe)
        }, (level) => this.findCharacterByLevel(level));
    }

    public getLowest2x2Area(): {r: number, c: number} {
        let bestR = 0;
        let bestC = 0;
        let lowestSum = Infinity;

        for (let r = 0; r <= this.rows - 2; r++) {
            for (let c = 0; c <= this.cols - 2; c++) {
                let currentSum = 0;
                let isValid = true;
                
                for (let i = r; i < r + 2; i++) {
                    for (let j = c; j < c + 2; j++) {
                        if (this.blocked[i][j]) {
                            isValid = false;
                            break;
                        }
                        const tile = this.tiles[i][j];
                        if (tile && tile.character) {
                            currentSum += tile.character.level;
                        } else if (tile && tile.item) {
                            currentSum += 5; // Arbitrary value for items
                        } else {
                            currentSum += 0; // Empty spot is 0
                        }
                    }
                    if (!isValid) break;
                }

                if (!isValid) continue;
                const score = currentSum + (r === 0 ? 12 : r === 1 ? 4 : 0);
                if (score < lowestSum || (score === lowestSum && r > bestR)) {
                    lowestSum = score;
                    bestR = r;
                    bestC = c;
                }
            }
        }
        return { r: bestR, c: bestC };
    }

    public getBestCharacter(): Character | null {
        // Return highest level character currently on grid
        let best: Character | null = null;
        for (let r = 0; r < this.rows; r++) {
            for (let c = 0; c < this.cols; c++) {
                const tile = this.tiles[r][c];
                if (tile && tile.character) {
                    if (!best || tile.character.level > best.level) {
                        best = tile.character;
                    }
                }
            }
        }
        return best;
    }

    public hasLifesaverSkills(): boolean {
        for (let r = 0; r < this.rows; r++) {
            for (let c = 0; c < this.cols; c++) {
                const tile = this.tiles[r][c];
                if (!tile) continue;

                if (tile.character && !tile.skillUsed) {
                    if (this.skillExecutor.inspect(tile).relievesDeadlock) {
                        return true;
                    }
                } else if (tile.item?.id === 'item_cannon') {
                    return this.tiles.some((row, rowIndex) => row.some((candidate, colIndex) =>
                        !!candidate && !this.blocked[rowIndex][colIndex]
                    ));
                }
            }
        }
        return false;
    }

    public getBossObstacleCount(): number {
        return this.bossVisuals?.length ?? 0;
    }

    private spawnShadowCloneObstacle() {
        const spots = this.getEmptySpots();
        if (spots.length === 0) {
            this.blockRandomSpots(1, 'shadow');
            return;
        }
        let bestChar: Character | null = null;
        for (const row of this.tiles) {
            for (const tile of row) {
                if (tile?.character && (!bestChar || tile.character.level > bestChar.level)) {
                    bestChar = tile.character;
                }
            }
        }
        const spot = Phaser.Utils.Array.GetRandom(spots);
        if (bestChar) {
            const clone = this.findCharacterByLevel(bestChar.level) || bestChar;
            const tile = new Tile(this.scene, spot.r, spot.c, this.tileSize, clone, 'character');
            const pos = this.getPixel(spot.r, spot.c);
            tile.setPosition(pos.x, pos.y);
            tile.markShadowClone();
            this.tiles[spot.r][spot.c] = tile;
            this.trackTile(tile);
            this.shadowObstacleTurns.set(tile, 5);
        } else {
            this.blockRandomSpots(1, 'shadow');
        }
    }

    public tickShadowObstacles() {
        for (const [tile, turnsLeft] of [...this.shadowObstacleTurns.entries()]) {
            if (!tile.active) {
                this.shadowObstacleTurns.delete(tile);
                continue;
            }
            const next = turnsLeft - 1;
            if (next <= 0) {
                this.destroyTile(tile);
                this.shadowObstacleTurns.delete(tile);
            } else {
                this.shadowObstacleTurns.set(tile, next);
            }
        }
    }

    public getNextSpawnPreview(): SpawnDecision | null {
        return this.nextSpawn;
    }

    public queueNextSpawn() {
        const emptySpots = this.getEmptySpots();
        let occupiedCount = 0;
        for (let r = 0; r < this.rows; r++) {
            for (let c = 0; c < this.cols; c++) if (this.tiles[r][c]) occupiedCount++;
        }
        const currentBoardMax = this.getMaxLevel();
        const maxLevel = Math.min(currentBoardMax, this.maxProgressLevel);
        const phase = this.getEndgamePhase();
        const balance = this.balance?.spawn || {
            lowSegmentRatio: 0.5,
            midSegmentRatio: 0.35,
            highSegmentRatio: 0.15,
            cannonReliefChance: 0.25,
            cannonReliefCooldown: 10,
            emptyBoardThreshold: 4,
            deadlockEmptySpots: 3,
            weaknessSpawnChance: 0.15,
            recipeSpawnChance: 0.1
        };
        let weaknessChar: Character | null = null;
        if (this.protectedCharIds.length > 0) {
            const targetId = Phaser.Utils.Array.GetRandom(this.protectedCharIds);
            weaknessChar = this.charMap.get(targetId) || null;
        }
        this.nextSpawn = this.spawnSystem.decideSpawn({
            emptySpots: emptySpots.length,
            occupiedCount,
            minActiveLevel: this.minActiveLevel,
            maxLevel,
            phase,
            protectedCharIds: this.protectedCharIds,
            debugFloor: this.debugSpawnFloor,
            debugCeiling: this.debugSpawnCeiling,
            items: this.items,
            neededChar: this.getNeededRecipeIngredient(maxLevel),
            weaknessChar,
            findByLevel: (level, excludeHidden) => this.findCharacterByLevel(level, excludeHidden),
            balance: balance as unknown as import('../core/SpawnSystem').SpawnBalance,
            forceRecipeHelp: this.recipeHelpForced > 0,
            extraLowDrop: this.extraLowSpawns > 0,
            recipeChanceOverride: this.recipeChanceOverride ?? undefined
        });
        if (this.nextSpawn?.reason === 'recipe_help' && this.recipeHelpForced > 0) {
            this.recipeHelpForced--;
        }
        if (this.extraLowSpawns > 0 && this.nextSpawn?.kind === 'character') {
            this.extraLowSpawns--;
        }
    }

    private commitNextSpawn() {
        if (!this.nextSpawn || this.nextSpawn.kind === 'none') return;
        const emptySpots = this.getEmptySpots();
        if (emptySpots.length === 0) return;
        const spot = this.pickSpot(emptySpots);
        if (!spot) return;
        if (this.nextSpawn.kind === 'item' && this.nextSpawn.item) {
            this.createItemAt(spot, this.nextSpawn.item);
        } else if (this.nextSpawn.char) {
            this.createTileAt(spot, this.nextSpawn.char);
        }
    }

    public getMinActiveLevel() {
        return this.minActiveLevel;
    }

    public getMaxProgressLevel() {
        return this.maxProgressLevel;
    }

    public getCriticalPityCounter() {
        return this.criticalPityCounter;
    }

    public setCriticalPityCounter(value: number) {
        this.criticalPityCounter = value;
    }

    public exportTiles(): RunTileSnapshot[] {
        const out: RunTileSnapshot[] = [];
        for (let r = 0; r < this.rows; r++) {
            for (let c = 0; c < this.cols; c++) {
                const tile = this.tiles[r][c];
                if (!tile) continue;
                out.push({
                    r, c,
                    kind: tile.character ? 'character' : 'item',
                    charId: tile.character?.id,
                    itemId: tile.item?.id,
                    frozen: tile.isFrozen,
                    skillUsed: tile.skillUsed
                });
            }
        }
        return out;
    }

    public exportBlocked(): boolean[][] {
        this.rebuildBlockedFromWorld();
        return this.blocked.map(row => [...row]);
    }

    public restoreBlocked(blocked: boolean[][]) {
        this.blocked = blocked.map(row => [...row]);
    }

    public getOccupancyRate(): number {
        let occupied = 0;
        const total = this.rows * this.cols;
        for (let r = 0; r < this.rows; r++) {
            for (let c = 0; c < this.cols; c++) {
                if (this.tiles[r][c] || this.blocked[r][c]) occupied++;
            }
        }
        return occupied / total;
    }

    public applyRuntimeState(state: Partial<RunStateSnapshot>) {
        if (state.minActiveLevel !== undefined) this.minActiveLevel = state.minActiveLevel;
        if (state.maxProgressLevel !== undefined) this.maxProgressLevel = state.maxProgressLevel;
        if (state.harmonyChallengeAccepted !== undefined) this.harmonyChallengeAccepted = state.harmonyChallengeAccepted;
        if (state.harmonyStableMoves !== undefined) this.harmonyStableMoves = state.harmonyStableMoves;
        if (state.endgameEventCount !== undefined) this.endgameEventCount = state.endgameEventCount;
        if (state.harmonyAchieved !== undefined) this.harmonyAchieved = state.harmonyAchieved;
        if (state.endgamePhase !== undefined) this.endgamePhase = state.endgamePhase;
        if (state.criticalPityCounter !== undefined) this.criticalPityCounter = state.criticalPityCounter;
    }

    public exportRuntimeState(): Pick<RunStateSnapshot,
        'endgamePhase' | 'harmonyChallengeAccepted' | 'harmonyStableMoves' | 'endgameEventCount' |
        'harmonyAchieved' | 'minActiveLevel' | 'maxProgressLevel' | 'criticalPityCounter'> {
        return {
            endgamePhase: this.endgamePhase,
            harmonyChallengeAccepted: this.harmonyChallengeAccepted,
            harmonyStableMoves: this.harmonyStableMoves,
            endgameEventCount: this.endgameEventCount,
            harmonyAchieved: this.harmonyAchieved,
            minActiveLevel: this.minActiveLevel,
            maxProgressLevel: this.maxProgressLevel,
            criticalPityCounter: this.criticalPityCounter
        };
    }

    public clearAllTiles() {
        for (let r = 0; r < this.rows; r++) {
            for (let c = 0; c < this.cols; c++) {
                const tile = this.tiles[r][c];
                if (tile) this.destroyTileVisual(tile);
                this.tiles[r][c] = null;
            }
        }
        this.sweepOrphanTiles();
        this.selectTile(null);
    }

    public restoreFromSnapshot(tiles: RunTileSnapshot[]) {
        this.clearAllTiles();
        for (const snap of tiles) {
            if (snap.kind === 'character' && snap.charId) {
                const char = this.charMap.get(snap.charId);
                if (!char) continue;
                const tile = new Tile(this.scene, snap.r, snap.c, this.tileSize, char, 'character');
                const pos = this.getPixel(snap.r, snap.c);
                tile.setPosition(pos.x, pos.y);
                if (snap.frozen) tile.setFrozen(true);
                if (snap.skillUsed) tile.markSkillUsed();
                this.tiles[snap.r][snap.c] = tile;
                this.trackTile(tile);
                CharacterAssetLoader.ensureCharacter(this.scene, char, () => {
                    if (this.tiles[snap.r][snap.c] === tile) tile.refreshSprite();
                });
            } else if (snap.kind === 'item' && snap.itemId) {
                const item = this.items.find(i => i.id === snap.itemId);
                if (!item) continue;
                const tile = new Tile(this.scene, snap.r, snap.c, this.tileSize, item, 'item');
                const pos = this.getPixel(snap.r, snap.c);
                tile.setPosition(pos.x, pos.y);
                this.tiles[snap.r][snap.c] = tile;
                this.trackTile(tile);
            }
        }
    }

    public setNextSpawnFromSaved(next?: RunStateSnapshot['nextSpawn']) {
        if (!next) {
            this.queueNextSpawn();
            return;
        }
        if (next.kind === 'item' && next.itemId) {
            const item = this.items.find(i => i.id === next.itemId);
            if (item) this.nextSpawn = { kind: 'item', item, reason: 'restored' };
            return;
        }
        if (next.charId) {
            const char = this.charMap.get(next.charId);
            if (char) this.nextSpawn = { kind: 'character', char, level: char.level, reason: 'restored' };
            return;
        }
        this.queueNextSpawn();
    }

    public exportUndoSnapshot() {
        return {
            tiles: this.exportTiles(),
            blocked: this.exportBlocked(),
            nextSpawn: this.nextSpawn,
            minActiveLevel: this.minActiveLevel,
            maxProgressLevel: this.maxProgressLevel,
            criticalPityCounter: this.criticalPityCounter
        };
    }

    public restoreUndoSnapshot(snapshot: ReturnType<Grid['exportUndoSnapshot']>) {
        this.restoreBlocked(snapshot.blocked);
        this.restoreFromSnapshot(snapshot.tiles);
        this.minActiveLevel = snapshot.minActiveLevel;
        this.maxProgressLevel = snapshot.maxProgressLevel;
        this.criticalPityCounter = snapshot.criticalPityCounter;
        this.nextSpawn = snapshot.nextSpawn;
    }
}