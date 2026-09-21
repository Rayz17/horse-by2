import Phaser from 'phaser';
import { Tile } from '../objects/Tile';
import { BossData, Character, EndgamePhase, SkillHighlightCell, SkillPreview, SkillResult, SkillSetpiece } from '../types';
import { getBossWeaknessActions, resolveSkillProfile, skillNeedsAim } from '../utils/skillMeta';

export interface BossVisualEntry {
    r: number;
    c: number;
    visual?: Phaser.GameObjects.GameObject;
    text?: Phaser.GameObjects.Text | null;
}

export interface GridSkillHost {
    scene: Phaser.Scene;
    getRows(): number;
    getCols(): number;
    getTiles(): (Tile | null)[][];
    getBlocked(): boolean[][];
    getProtectedCharIds(): string[];
    getMinActiveLevel(): number;
    getPixel(r: number, c: number): { x: number; y: number };
    destroyTile(tile: Tile): void;
    moveTile(tile: Tile, r: number, c: number): void;
    getMaxLevel(): number;
    getEndgamePhase(): EndgamePhase;
    findCharacterByLevel(level: number, excludeHidden?: boolean): Character | null;
    getEmptySpots(): { r: number; c: number }[];
    createTileAt(spot: { r: number; c: number }, char: Character): Tile | void;
    isCriticalIngredient(id: string): boolean;
    clearBossEffects(type?: string): void;
    playSmokeEffect(x: number, y: number): void;
    playStarEffect(x: number, y: number): void;
    showFloatingText(x: number, y: number, text: string): void;
    getBossVisuals(): BossVisualEntry[];
    removeBossVisualAt(index: number): void;
    getActiveBoss(): unknown;
    getCharacters(): Character[];
    shuffleBoard(): boolean;
    getLastMoveDir(): { x: number; y: number };
    getSkillAimCell(): { r: number; c: number } | null;
    mergeLineNoSpawn(axis: 'row' | 'col', index: number): number;
    tryMergePair(a: Tile, b: Tile): boolean;
    findMostCommonMergePair(): [Tile, Tile] | null;
    rotateOccupied(cells: Array<{ r: number; c: number }>): boolean;
    spawnPublicBand(count: number): number;
    isGuardedTile(tile: Tile, caster?: Tile | null): boolean;
    relocateTile(tile: Tile, r: number, c: number): void;
    canOfferLevel101Choice(): boolean;
}

function failResult(toast?: string): SkillResult {
    return {
        consumed: false,
        boardChanged: false,
        toast,
        playAnim: false,
        playSkillSound: false,
        sideEffects: [],
        bossActions: []
    };
}

function okResult(partial: Partial<SkillResult> = {}): SkillResult {
    return {
        consumed: true,
        boardChanged: false,
        playAnim: true,
        playSkillSound: false,
        sideEffects: [],
        bossActions: [],
        ...partial
    };
}

export class SkillExecutor {
    constructor(private host: GridSkillHost) {}

    applyBomb(tile: Tile, radius: number) {
        this.destroyTiles(this.collectBombTargets(tile, radius));
        this.host.scene.cameras.main.shake(200, 0.01);
    }

    applyUpgradeSelf(tile: Tile) {
        this.upgradeSelf(tile);
    }

    inspect(tile: Tile): SkillPreview {
        if (!tile?.character || tile.skillUsed) {
            return {
                type: 'none',
                canExecute: false,
                needsAim: false,
                relievesDeadlock: false,
                cells: [],
                failReason: '无法释放'
            };
        }

        const type = resolveSkillProfile(tile.character).type;
        const cells = this.collectHighlightCells(tile, type);
        const canExecute = this.canExecuteType(tile, type);
        const failReason = canExecute ? undefined : this.failReasonFor(type);
        return {
            type,
            canExecute,
            needsAim: canExecute && skillNeedsAim(type) && cells.length > 0,
            relievesDeadlock: canExecute && this.relievesDeadlock(type, tile),
            cells,
            failReason,
            setpiece: canExecute ? this.setpieceFor(tile, type, cells) : undefined
        };
    }

    execute(tile: Tile): SkillResult {
        const preview = this.inspect(tile);
        if (!preview.canExecute) return failResult(preview.failReason);

        const result = this.applyType(tile, preview.type);
        if (result.consumed && tile.active && !tile.toBeDestroyed) tile.markSkillUsed();
        return result;
    }

    getHighlightCells(tile: Tile): SkillHighlightCell[] {
        return this.inspect(tile).cells;
    }

    private canExecuteType(tile: Tile, type: string): boolean {
        switch (type) {
            case 'arch_economy':
            case 'sig_tothemoon':
                return true;
            case 'sig_jiaban':
                return this.collectOvertimeMerges(tile) > 0;
            case 'arch_clear_low':
                return this.collectLowTiles().length > 0;
            case 'arch_snipe':
                return true;
            case 'arch_bomb':
                return this.collectBombTargets(tile, tile.character?.skill.params?.radius || 1).length > 0;
            case 'arch_transform':
                return tile.character?.id === 'deer_sign'
                    ? this.collectOtherTiles(tile).length > 0
                    : this.sameTierChoices(tile).length > 0;
            case 'arch_freeze':
                return true;
            case 'arch_shuffle':
                return this.countShufflable() >= 2;
            case 'arch_heal':
                return this.collectFrozenTiles().length > 0;
            case 'arch_upgrade':
                return this.collectUpgradeNeighbors(tile).length > 0;
            case 'arch_summon':
                return this.host.getEmptySpots().length > 0 && !!this.findSummonChar();
            case 'sig_dacha':
                return !!this.getBoss();
            case 'sig_huiwu':
                return this.canUpgrade(tile);
            case 'sig_ecosystem':
                return this.collectEcosystemTargets(tile).length > 0;
            case 'sig_pollute':
                return this.collectRotatable(tile).length >= 2;
            case 'sig_censor':
                return this.collectCensorTargets(tile).length > 0;
            case 'sig_derby':
                return this.planDerby(tile).canDash;
            case 'sig_cosmic':
                return this.collectPollution().length > 0 || this.host.canOfferLevel101Choice();
            case 'sig_debug':
                return this.collectFrozenTiles().length > 0
                    || this.host.getBossVisuals().length > 0
                    || !!this.host.findMostCommonMergePair();
            case 'sig_cannon':
            case 'sig_zankanto':
                return this.collectAxisLine(tile).length > 0 || !!this.getBoss();
            case 'sig_sekiba':
                return this.collectUpgradeNeighbors(tile).length > 0
                    || this.host.getBossVisuals().length > 0
                    || !!this.getBoss();
            case 'sig_meteor':
                return this.collectMeteorTargets(tile).length > 0 || !!this.getBoss();
            default:
                return false;
        }
    }

    private failReasonFor(type: string): string {
        switch (type) {
            case 'arch_clear_low':
                return '没有可清除的低级单位';
            case 'arch_bomb':
                return '爆炸范围内没有目标';
            case 'arch_transform':
                return '没有可以变身的目标';
            case 'arch_shuffle':
                return '棋盘上没有足够的棋子可重排';
            case 'arch_heal':
                return '没有可净化的冰冻';
            case 'arch_upgrade':
                return '周围没有可进阶的邻格';
            case 'arch_summon':
                return '没有空位可以召唤';
            case 'sig_dacha':
                return '现在没有可打岔的对象';
            case 'sig_debug':
                return '代码完美运行，没有 Bug';
            case 'sig_huiwu':
                return '现在画不出下一级';
            case 'sig_ecosystem':
                return '没有可以吸收的单位';
            case 'sig_jiaban':
                return '这条线上加不了班';
            case 'sig_pollute':
                return '圈里换不了身份';
            case 'sig_censor':
                return '这一圈已经和谐过了';
            case 'sig_derby':
                return '末脚冲不动';
            case 'sig_cosmic':
                return '没有可收的星尘';
            case 'sig_cannon':
                return '主炮没有目标';
            case 'sig_zankanto':
                return '斩舰刀砍不到东西';
            case 'sig_sekiba':
                return '还没有可以合一的对象';
            case 'sig_meteor':
                return '小宇宙还烧不起来';
            default:
                return '现在无法释放';
        }
    }

    private relievesDeadlock(type: string, tile: Tile): boolean {
        switch (type) {
            case 'arch_clear_low':
            case 'arch_bomb':
            case 'arch_shuffle':
            case 'arch_heal':
            case 'arch_transform':
            case 'arch_upgrade':
            case 'sig_debug':
            case 'sig_ecosystem':
            case 'sig_jiaban':
            case 'sig_pollute':
            case 'sig_censor':
            case 'sig_derby':
            case 'sig_huiwu':
            case 'sig_cosmic':
            case 'sig_cannon':
            case 'sig_zankanto':
            case 'sig_sekiba':
            case 'sig_meteor':
                return true;
            case 'arch_snipe': {
                const kind = this.planSnipe(tile).kind;
                return kind !== 'gold' && kind !== 'boss';
            }
            default:
                return false;
        }
    }

    private collectHighlightCells(tile: Tile, type: string): SkillHighlightCell[] {
        const cells: SkillHighlightCell[] = [];
        const push = (r: number, c: number, color: number, alpha = 0.35, allowBlocked = false) => {
            if (r < 0 || c < 0 || r >= this.host.getRows() || c >= this.host.getCols()) return;
            if (this.host.getBlocked()[r][c] && !allowBlocked) return;
            cells.push({ r, c, color, alpha });
        };

        switch (type) {
            case 'arch_bomb':
                this.collectBombTargets(tile, tile.character?.skill.params?.radius || 1)
                    .forEach(t => push(t.row, t.col, 0xff4444));
                push(tile.row, tile.col, 0xff8888, 0.2);
                break;
            case 'arch_clear_low':
                this.collectLowTiles().forEach(t => push(t.row, t.col, 0x44ff88));
                break;
            case 'arch_snipe': {
                const plan = this.planSnipe(tile);
                if (plan.kind === 'frozen' || plan.kind === 'trash') {
                    plan.tiles.forEach(t => push(t.row, t.col, 0xff4444, 0.45));
                } else if (plan.kind === 'obstacle') {
                    plan.cells.forEach(cell => push(cell.r, cell.c, 0xffaa00, 0.5, true));
                }
                break;
            }
            case 'arch_transform':
                if (tile.character?.id === 'deer_sign') {
                    this.collectOtherTiles(tile).forEach(t => push(t.row, t.col, 0x44ff88));
                } else {
                    push(tile.row, tile.col, 0x44ff88, 0.5);
                }
                break;
            case 'arch_upgrade':
                this.collectUpgradeNeighbors(tile).forEach(t => push(t.row, t.col, 0x44ff88, 0.5));
                push(tile.row, tile.col, 0xff6644, 0.35);
                break;
            case 'arch_heal':
                this.collectFrozenTiles().forEach(t => push(t.row, t.col, 0x66ccff, 0.45));
                break;
            case 'sig_debug':
                this.collectFrozenTiles().forEach(t => push(t.row, t.col, 0x66ccff, 0.45));
                this.host.getBossVisuals().forEach(v => push(v.r, v.c, 0xffaa00, 0.4, true));
                break;
            case 'sig_ecosystem':
                this.collectEcosystemTargets(tile).forEach(t => push(t.row, t.col, 0xff4444));
                break;
            case 'sig_jiaban':
                this.collectOvertimeCells(tile).forEach(cell => push(cell.r, cell.c, 0xffe14a, 0.4));
                break;
            case 'sig_pollute':
                this.collectAimSquare(tile).forEach(cell => push(cell.r, cell.c, 0x44ff88, 0.35));
                break;
            case 'sig_censor':
                this.collectCensorTargets(tile).forEach(t => push(t.row, t.col, 0xff4444, 0.45));
                this.collectAimSquare(tile).forEach(cell => push(cell.r, cell.c, 0x888888, 0.2));
                break;
            case 'sig_derby':
                this.planDerby(tile).path.forEach(cell => push(cell.r, cell.c, 0xffd24a, 0.4));
                break;
            case 'sig_huiwu':
                push(tile.row, tile.col, 0x44ff88, 0.5);
                break;
            case 'sig_cosmic':
                this.collectPollution().forEach(t => push(t.row, t.col, 0x88aaff, 0.4));
                break;
            case 'sig_dacha':
                this.host.getBossVisuals().forEach(v => push(v.r, v.c, 0xffaa00, 0.35, true));
                break;
            case 'sig_cannon':
            case 'sig_zankanto':
                this.collectAxisLine(tile).forEach(t => push(t.row, t.col, 0xff4444, 0.45));
                push(tile.row, tile.col, 0xffe14a, 0.25);
                break;
            case 'sig_sekiba':
                this.collectUpgradeNeighbors(tile).forEach(t => push(t.row, t.col, 0x44ff88, 0.5));
                this.host.getBossVisuals().forEach(v => push(v.r, v.c, 0xffaa00, 0.35, true));
                push(tile.row, tile.col, 0xffe14a, 0.3);
                break;
            case 'sig_meteor':
                this.collectMeteorTargets(tile).forEach(t => push(t.row, t.col, 0xff88ff, 0.4));
                push(tile.row, tile.col, 0xffe14a, 0.25);
                break;
            default:
                break;
        }
        return cells;
    }

    private applyType(tile: Tile, type: string): SkillResult {
        switch (type) {
            case 'arch_economy':
                return this.castEconomy(tile, tile.character?.skill.params?.amount || 100, `+${tile.character?.skill.params?.amount || 100}G`);
            case 'arch_clear_low':
                return this.castClearLow(tile);
            case 'arch_snipe':
                return this.castSnipe(tile);
            case 'arch_bomb':
                return this.castBomb(tile);
            case 'arch_transform':
                return this.castTransform(tile);
            case 'arch_freeze':
                return this.castFreeze(tile);
            case 'arch_shuffle':
                return this.castShuffle(tile);
            case 'arch_heal':
                return this.castHeal(tile);
            case 'arch_upgrade':
                return this.castUpgrade(tile);
            case 'arch_summon':
                return this.castSummon(tile);
            case 'sig_dacha':
                return this.castDacha(tile);
            case 'sig_jiaban':
                return this.castOvertime(tile);
            case 'sig_debug':
                return this.castDebug(tile);
            case 'sig_huiwu':
                return this.castPaint(tile);
            case 'sig_ecosystem':
                return this.castEcosystem(tile);
            case 'sig_pollute':
                return this.castPollute(tile);
            case 'sig_censor':
                return this.castCensor(tile);
            case 'sig_derby':
                return this.castDerby(tile);
            case 'sig_cosmic':
                return this.castCosmic(tile);
            case 'sig_tothemoon':
                return this.withWeakness(tile, okResult({
                    toast: 'TO THE MOON! 🚀',
                    sideEffects: [{ kind: 'gold_double' }],
                    bossActions: [{ kind: 'damage', amount: 99999 }]
                }));
            case 'sig_cannon':
                return this.castCannon(tile);
            case 'sig_zankanto':
                return this.castZankanto(tile);
            case 'sig_sekiba':
                return this.castSekiba(tile);
            case 'sig_meteor':
                return this.castMeteor(tile);
            default:
                return failResult('现在无法释放');
        }
    }

    private withWeakness(tile: Tile, result: SkillResult): SkillResult {
        const boss = this.getBoss();
        const char = tile.character;
        if (!boss || !char || !boss.bossData.weakness?.includes(char.id)) return result;

        result.bossActions = [
            ...getBossWeaknessActions(boss.bossData.skill?.id),
            { kind: 'damage', amount: char.level * 100, weakness: true }
        ];
        result.toast = `弱点克制！对 ${boss.bossData.name} 造成巨额伤害！💥`;
        result.playAnim = true;
        result.playSkillSound = true;
        return result;
    }

    private castEconomy(tile: Tile, amount: number, toast: string): SkillResult {
        this.playCoinBurst(amount);
        return this.withWeakness(tile, okResult({
            toast,
            sideEffects: [{ kind: 'gold', amount }]
        }));
    }

    private castClearLow(tile: Tile): SkillResult {
        const targets = this.collectLowTiles();
        this.destroyTiles(targets);
        return this.withWeakness(tile, okResult({
            boardChanged: targets.length > 0,
            toast: `清除了 ${targets.length} 个低级单位！`
        }));
    }

    private castSnipe(tile: Tile): SkillResult {
        const plan = this.planSnipe(tile);
        if (plan.kind === 'boss') {
            return this.withWeakness(tile, okResult({
                toast: '狙击！直击首领！',
                bossActions: [{ kind: 'damage', amount: (tile.character?.level || 1) * 20 }]
            }));
        }
        if (plan.kind === 'frozen') {
            const target = plan.tiles[0];
            target.setFrozen(false);
            this.host.playStarEffect(target.x, target.y);
            return this.withWeakness(tile, okResult({
                boardChanged: true,
                toast: '狙击！解冻！'
            }));
        }
        if (plan.kind === 'obstacle') {
            this.host.removeBossVisualAt(plan.index);
            return this.withWeakness(tile, okResult({
                boardChanged: true,
                toast: '狙击！清除障碍！'
            }));
        }
        if (plan.kind === 'trash') {
            const target = Phaser.Utils.Array.GetRandom(plan.tiles);
            this.host.playSmokeEffect(target.x, target.y);
            this.host.destroyTile(target);
            return this.withWeakness(tile, okResult({
                boardChanged: true,
                toast: '狙击！清理杂兵！'
            }));
        }
        const bounty = (tile.character?.skill.params?.damage || 100) / 10;
        return this.castEconomy(tile, bounty, '狙击！获得赏金！');
    }

    private castBomb(tile: Tile): SkillResult {
        const targets = this.collectBombTargets(tile, tile.character?.skill.params?.radius || 1);
        this.destroyTiles(targets);
        this.host.scene.cameras.main.shake(200, 0.01);
        return this.withWeakness(tile, okResult({
            boardChanged: targets.length > 0,
            toast: '大爆炸！💣'
        }));
    }

    private castTransform(tile: Tile): SkillResult {
        if (tile.character?.id === 'deer_sign') {
            const boss = this.getBoss();
            if (boss) {
                return this.withWeakness(tile, okResult({
                    toast: '指鹿为马：Boss 遭受降维打击！🦌',
                    bossActions: [{ kind: 'damage', amount: tile.character.level * 50 }]
                }));
            }
            const others = this.collectOtherTiles(tile);
            const target = Phaser.Utils.Array.GetRandom(others);
            if (!this.transformTile(target)) return failResult('没有可以变身的目标');
            this.host.playSmokeEffect(target.x, target.y);
            return okResult({ boardChanged: true, toast: '混淆！指鹿为马！' });
        }
        if (!this.transformTile(tile)) return failResult('没有可以变身的目标');
        return this.withWeakness(tile, okResult({ boardChanged: true, toast: '变身！' }));
    }

    private castFreeze(tile: Tile): SkillResult {
        if (this.getBoss()) {
            return this.withWeakness(tile, okResult({
                toast: 'Boss 已冻结 1 回合！',
                playSkillSound: true,
                bossActions: [{ kind: 'freeze', turns: 1 }]
            }));
        }
        const reward = this.host.getMaxLevel() * 20;
        this.playCoinBurst(reward);
        return okResult({
            toast: '茄子！📸 获得版税！',
            sideEffects: [{ kind: 'gold', amount: reward }]
        });
    }

    private castShuffle(tile: Tile): SkillResult {
        const moved = this.host.shuffleBoard();
        if (!moved) return failResult('棋盘上没有足够的棋子可重排');
        return this.withWeakness(tile, okResult({
            boardChanged: true,
            toast: '乾坤挪移！'
        }));
    }

    private castHeal(tile: Tile): SkillResult {
        const frozen = this.collectFrozenTiles();
        frozen.forEach(t => {
            t.setFrozen(false);
            this.host.playStarEffect(t.x, t.y);
        });
        return this.withWeakness(tile, okResult({
            boardChanged: frozen.length > 0,
            playSkillSound: true,
            toast: `解除了 ${frozen.length} 个冰冻！❄️`
        }));
    }

    private castUpgrade(tile: Tile): SkillResult {
        const neighbors = this.collectUpgradeNeighbors(tile);
        if (neighbors.length === 0) return failResult('周围没有可进阶的邻格');
        neighbors.forEach(n => {
            this.upgradeSelf(n);
            const px = this.host.getPixel(n.row, n.col);
            this.host.playStarEffect(px.x, px.y);
        });
        this.host.playSmokeEffect(tile.x, tile.y);
        this.host.destroyTile(tile);
        return this.withWeakness(tile, okResult({
            boardChanged: true,
            playAnim: false,
            toast: `献祭！邻格进阶 ×${neighbors.length}`
        }));
    }

    private castSummon(tile: Tile): SkillResult {
        const phase = this.host.getEndgamePhase();
        const summonLevel = phase === 'normal' ? 1 : this.host.getMinActiveLevel();
        const summonCount = phase === 'normal' ? 2 : 1;
        let spawned = 0;
        for (let i = 0; i < summonCount; i++) {
            const spots = this.host.getEmptySpots();
            if (spots.length === 0) break;
            const char = this.findSummonChar(summonLevel);
            if (!char) break;
            this.host.createTileAt(Phaser.Utils.Array.GetRandom(spots), char);
            spawned++;
        }
        if (spawned === 0) return failResult('没有空位可以召唤');
        return this.withWeakness(tile, okResult({
            boardChanged: true,
            toast: phase === 'normal' ? '召唤完成' : '终章召唤会优先维持盘面秩序。'
        }));
    }

    private castDacha(tile: Tile): SkillResult {
        if (!this.getBoss()) return failResult('现在没有可打岔的对象');
        this.host.getBossVisuals().forEach(v => {
            const px = this.host.getPixel(v.r, v.c);
            this.host.playSmokeEffect(px.x, px.y);
        });
        if (this.host.getBossVisuals().length > 0) this.host.clearBossEffects();
        return this.withWeakness(tile, okResult({
            boardChanged: true,
            playAnim: false,
            playSkillSound: false,
            toast: '楼上的，你瞅啥呢',
            bossActions: [
                { kind: 'freeze', turns: 2 },
                { kind: 'cancel_telegraph' }
            ]
        }));
    }

    private castOvertime(tile: Tile): SkillResult {
        const axis = this.overtimeAxis();
        const index = axis === 'row' ? tile.row : tile.col;
        const merged = this.host.mergeLineNoSpawn(axis, index);
        if (merged <= 0) return failResult('这条线上加不了班');
        return this.withWeakness(tile, okResult({
            boardChanged: true,
            playAnim: false,
            playSkillSound: false,
            toast: '再加半小时'
        }));
    }

    private castDebug(tile: Tile): SkillResult {
        const frozen = this.collectFrozenTiles();
        frozen.forEach(t => {
            t.setFrozen(false);
            this.host.playStarEffect(t.x, t.y);
        });
        const blockCount = this.host.getBossVisuals().length;
        if (blockCount > 0) this.host.clearBossEffects();
        const pair = this.host.findMostCommonMergePair();
        let merged = false;
        if (pair) merged = this.host.tryMergePair(pair[0], pair[1]);
        const changed = frozen.length > 0 || blockCount > 0 || merged;
        if (!changed) return failResult('代码完美运行，没有 Bug');
        return this.withWeakness(tile, okResult({
            boardChanged: true,
            playAnim: false,
            playSkillSound: false,
            toast: 'PR MERGED'
        }));
    }

    private castPaint(tile: Tile): SkillResult {
        if (!this.upgradeSelf(tile)) return failResult('现在画不出下一级');
        const px = this.host.getPixel(tile.row, tile.col);
        this.host.playStarEffect(px.x, px.y);
        return this.withWeakness(tile, okResult({
            boardChanged: true,
            playAnim: false,
            playSkillSound: false,
            toast: '画'
        }));
    }

    private castEcosystem(tile: Tile): SkillResult {
        const targets = this.collectEcosystemTargets(tile);
        if (targets.length === 0) return failResult('没有可以吸收的单位');
        this.destroyTiles(targets);
        const spawned = this.host.spawnPublicBand(Math.min(2, Math.max(1, Math.ceil(targets.length / 3))));
        return this.withWeakness(tile, okResult({
            boardChanged: true,
            playAnim: false,
            playSkillSound: false,
            toast: spawned > 0 ? `垄断 ×${spawned}` : '生态闭环'
        }));
    }

    private castPollute(tile: Tile): SkillResult {
        const cells = this.collectRotatable(tile).map(t => ({ r: t.row, c: t.col }));
        if (cells.length < 2) return failResult('圈里换不了身份');
        if (!this.host.rotateOccupied(cells)) return failResult('圈里换不了身份');
        return this.withWeakness(tile, okResult({
            boardChanged: true,
            playAnim: false,
            playSkillSound: false,
            toast: 'RUA'
        }));
    }

    private castCensor(tile: Tile): SkillResult {
        const targets = this.collectCensorTargets(tile);
        if (targets.length === 0) return failResult('这一圈已经和谐过了');
        this.destroyTiles(targets);
        const square = this.collectAimSquare(tile);
        const visuals = this.host.getBossVisuals();
        for (let i = visuals.length - 1; i >= 0; i--) {
            const v = visuals[i];
            if (square.some(cell => cell.r === v.r && cell.c === v.c)) {
                this.host.removeBossVisualAt(i);
            }
        }
        return this.withWeakness(tile, okResult({
            boardChanged: true,
            playAnim: false,
            playSkillSound: false,
            toast: '和谐'
        }));
    }

    private castDerby(tile: Tile): SkillResult {
        const plan = this.planDerby(tile);
        if (!plan.canDash) return failResult('末脚冲不动');
        this.destroyTiles(plan.fling);
        if (plan.mergeWith) {
            this.host.tryMergePair(tile, plan.mergeWith);
        } else if (plan.path.length > 0) {
            const dest = plan.path[plan.path.length - 1];
            this.host.relocateTile(tile, dest.r, dest.c);
        }
        return this.withWeakness(tile, okResult({
            boardChanged: true,
            playAnim: false,
            playSkillSound: false,
            toast: '先手必胜'
        }));
    }

    private castCosmic(tile: Tile): SkillResult {
        const pollution = this.collectPollution();
        const openGate = this.host.canOfferLevel101Choice();
        if (pollution.length === 0 && !openGate) return failResult('没有可收的星尘');
        this.destroyTiles(pollution);
        return this.withWeakness(tile, okResult({
            boardChanged: pollution.length > 0 || openGate,
            playAnim: false,
            playSkillSound: false,
            toast: openGate ? '天门已开' : '星尘内爆',
            sideEffects: openGate ? [{ kind: 'level101_choice' }] : []
        }));
    }

    private setpieceFor(tile: Tile, type: string, cells: SkillHighlightCell[]): SkillSetpiece | undefined {
        const name = tile.character?.name || '';
        const textureKey = tile.character?.id;
        const skillName = tile.character?.skill?.name || '';
        const mapped = cells.map(c => ({ r: c.r, c: c.c }));
        const base = { casterName: name, textureKey, cells: mapped };

        const byChar: Record<string, SkillSetpiece> = {
            white_base: { id: 'cannon', stamp: skillName || '米加粒子炮', ...base },
            samurai_mech: { id: 'zankanto', stamp: skillName || '斩舰刀', ...base },
            mobile_horse: { id: 'sekiba', stamp: skillName || '石破天惊', ...base },
            cosmos_burn: { id: 'meteor', stamp: skillName || '天马流星拳', ...base },
            god_of_war: { id: 'zankanto', stamp: skillName || '拖刀计', brief: true, ...base }
        };
        if (textureKey && byChar[textureKey]) return byChar[textureKey];

        switch (type) {
            case 'sig_dacha':
                return { id: 'dacha', stamp: '楼上的', ...base };
            case 'sig_jiaban':
                return { id: 'overtime', stamp: '再加半小时', ...base };
            case 'sig_pollute':
                return { id: 'pollute', stamp: 'RUA', ...base };
            case 'sig_debug':
                return {
                    id: 'debug',
                    stamp: 'PR MERGED',
                    ...base,
                    logs: ['unfreeze --all', 'rm -rf obstacles', 'gc holes', 'optimize merge']
                };
            case 'sig_censor':
                return { id: 'censor', stamp: '和谐', ...base };
            case 'sig_huiwu':
                return { id: 'paint', stamp: '画', ...base };
            case 'sig_derby':
                return { id: 'derby', stamp: '先手必胜', ...base };
            case 'sig_ecosystem':
                return { id: 'giants', stamp: '垄断', ...base };
            case 'sig_cosmic':
                return { id: 'cosmic', stamp: '天门', ...base };
            case 'sig_cannon':
                return { id: 'cannon', stamp: skillName || '米加粒子炮', ...base };
            case 'sig_zankanto':
                return { id: 'zankanto', stamp: skillName || '斩舰刀', ...base };
            case 'sig_sekiba':
                return { id: 'sekiba', stamp: skillName || '石破天惊', ...base };
            case 'sig_meteor':
                return { id: 'meteor', stamp: skillName || '天马流星拳', ...base };
            case 'arch_upgrade':
                return { id: 'upgrade', stamp: skillName || '献祭', brief: true, ...base };
            case 'arch_bomb':
                return { id: 'bomb', stamp: skillName || '爆破', brief: true, ...base };
            case 'arch_snipe':
                return { id: 'snipe', stamp: skillName || '狙击', brief: true, ...base };
            case 'arch_freeze':
                return { id: 'freeze', stamp: skillName || '冻结', brief: true, ...base };
            case 'arch_summon':
                return { id: 'summon', stamp: skillName || '呼朋', brief: true, ...base };
            case 'arch_economy':
                return { id: 'economy', stamp: skillName || '招财', brief: true, ...base };
            case 'arch_clear_low':
                return { id: 'clear', stamp: skillName || '清场', brief: true, ...base };
            case 'arch_shuffle':
                return { id: 'shuffle', stamp: skillName || '重排', brief: true, ...base };
            case 'arch_heal':
                return { id: 'heal', stamp: skillName || '净化', brief: true, ...base };
            case 'arch_transform':
                return { id: 'transform', stamp: skillName || '变形', brief: true, ...base };
            default:
                return skillName
                    ? { id: 'snipe', stamp: skillName, brief: true, ...base }
                    : undefined;
        }
    }

    private aimCenter(tile: Tile): { r: number; c: number } {
        return this.host.getSkillAimCell() || { r: tile.row, c: tile.col };
    }

    private collectAimSquare(tile: Tile): Array<{ r: number; c: number }> {
        const center = this.aimCenter(tile);
        const cells: Array<{ r: number; c: number }> = [];
        for (let r = center.r - 1; r <= center.r + 1; r++) {
            for (let c = center.c - 1; c <= center.c + 1; c++) {
                if (r < 0 || c < 0 || r >= this.host.getRows() || c >= this.host.getCols()) continue;
                cells.push({ r, c });
            }
        }
        return cells;
    }

    private overtimeAxis(): 'row' | 'col' {
        const dir = this.host.getLastMoveDir();
        return Math.abs(dir.y) > Math.abs(dir.x) ? 'col' : 'row';
    }

    private collectOvertimeCells(tile: Tile): Array<{ r: number; c: number }> {
        const axis = this.overtimeAxis();
        const cells: Array<{ r: number; c: number }> = [];
        if (axis === 'row') {
            for (let c = 0; c < this.host.getCols(); c++) cells.push({ r: tile.row, c });
        } else {
            for (let r = 0; r < this.host.getRows(); r++) cells.push({ r, c: tile.col });
        }
        return cells;
    }

    private collectOvertimeMerges(tile: Tile): number {
        const axis = this.overtimeAxis();
        const tiles = this.host.getTiles();
        const line: Tile[] = [];
        if (axis === 'row') {
            for (let c = 0; c < this.host.getCols(); c++) {
                const t = tiles[tile.row][c];
                if (t?.character) line.push(t);
            }
        } else {
            for (let r = 0; r < this.host.getRows(); r++) {
                const t = tiles[r][tile.col];
                if (t?.character) line.push(t);
            }
        }
        const levels = new Map<number, number>();
        line.forEach(t => {
            const lv = t.character!.level;
            levels.set(lv, (levels.get(lv) || 0) + 1);
        });
        return [...levels.values()].filter(n => n >= 2).length;
    }

    private collectRotatable(tile: Tile): Tile[] {
        const tiles = this.host.getTiles();
        const blocked = this.host.getBlocked();
        return this.collectAimSquare(tile)
            .map(cell => tiles[cell.r][cell.c])
            .filter((t): t is Tile => !!t && !!t.character && !blocked[t.row][t.col] && !this.host.isGuardedTile(t));
    }

    private collectCensorTargets(tile: Tile): Tile[] {
        const tiles = this.host.getTiles();
        const blocked = this.host.getBlocked();
        return this.collectAimSquare(tile)
            .map(cell => tiles[cell.r][cell.c])
            .filter((t): t is Tile => !!t && t !== tile && !blocked[t.row][t.col] && !this.host.isGuardedTile(t, tile));
    }

    private planDerby(tile: Tile): { canDash: boolean; path: Array<{ r: number; c: number }>; fling: Tile[]; mergeWith: Tile | null } {
        const dir = this.host.getLastMoveDir();
        const dirX = dir.x || (dir.y === 0 ? 1 : 0);
        const dirY = dir.y;
        const tiles = this.host.getTiles();
        const blocked = this.host.getBlocked();
        const path: Array<{ r: number; c: number }> = [];
        const fling: Tile[] = [];
        let mergeWith: Tile | null = null;
        let r = tile.row + dirY;
        let c = tile.col + dirX;
        const lowCap = Math.max(3, (tile.character?.level || 1) - 10);
        while (r >= 0 && c >= 0 && r < this.host.getRows() && c < this.host.getCols()) {
            if (blocked[r][c]) break;
            path.push({ r, c });
            const t = tiles[r][c];
            if (t?.character) {
                if (t.character.level === tile.character?.level && !this.host.isGuardedTile(t, tile)) {
                    mergeWith = t;
                    break;
                }
                if (t.character.level <= lowCap && !this.host.isGuardedTile(t, tile)) {
                    fling.push(t);
                } else {
                    break;
                }
            }
            r += dirY;
            c += dirX;
        }
        return { canDash: fling.length > 0 || !!mergeWith, path, fling, mergeWith };
    }

    private collectPollution(): Tile[] {
        return this.forEachTile((t, r, c) =>
            !!t.character &&
            t.character.level <= 3 &&
            !this.host.getBlocked()[r][c] &&
            !this.host.isGuardedTile(t)
        );
    }

    private hasCosmicOnBoard(): boolean {
        return this.forEachTile(t => t.character?.id === 'cosmic_one').length > 0;
    }

    private collectLowTiles(): Tile[] {
        return this.forEachTile((t, r, c) =>
            !!t.character &&
            t.character.level <= 3 &&
            !this.host.getBlocked()[r][c] &&
            !this.host.isCriticalIngredient(t.character.id)
        );
    }

    private collectBombTargets(center: Tile, radius: number): Tile[] {
        const rows = this.host.getRows();
        const cols = this.host.getCols();
        const tiles = this.host.getTiles();
        const blocked = this.host.getBlocked();
        const targets: Tile[] = [];
        for (let r = center.row - radius; r <= center.row + radius; r++) {
            for (let c = center.col - radius; c <= center.col + radius; c++) {
                if (r < 0 || c < 0 || r >= rows || c >= cols) continue;
                const t = tiles[r][c];
                if (t && t !== center && !blocked[r][c]) targets.push(t);
            }
        }
        return targets;
    }

    private collectOtherTiles(source: Tile): Tile[] {
        return this.forEachTile((t, r, c) => t !== source && !!t.character && !this.host.getBlocked()[r][c]);
    }

    private collectFrozenTiles(): Tile[] {
        return this.forEachTile(t => t.isFrozen);
    }

    private collectEcosystemTargets(source: Tile): Tile[] {
        const cap = Math.max(3, this.host.getMaxLevel() - 5);
        return this.forEachTile((t, r, c) =>
            t !== source &&
            !!t.character &&
            t.character.level <= cap &&
            !this.host.getBlocked()[r][c] &&
            !this.host.isGuardedTile(t, source)
        );
    }

    private collectTrashTiles(source: Tile): Tile[] {
        const trashLevel = Math.max(1, this.host.getMaxLevel() - 5);
        return this.forEachTile((t) =>
            t !== source &&
            !!t.character &&
            t.character.level <= trashLevel &&
            !this.host.isCriticalIngredient(t.character.id) &&
            !this.host.getProtectedCharIds().includes(t.character.id)
        );
    }

    private planSnipe(tile: Tile):
        | { kind: 'boss' }
        | { kind: 'frozen'; tiles: Tile[] }
        | { kind: 'obstacle'; cells: Array<{ r: number; c: number }>; index: number }
        | { kind: 'trash'; tiles: Tile[] }
        | { kind: 'gold' } {
        if (this.getBoss()) return { kind: 'boss' };
        const frozen = this.collectFrozenTiles();
        if (frozen.length > 0) return { kind: 'frozen', tiles: frozen };
        const visuals = this.host.getBossVisuals();
        if (visuals.length > 0) {
            return {
                kind: 'obstacle',
                cells: visuals.map(v => ({ r: v.r, c: v.c })),
                index: 0
            };
        }
        const trash = this.collectTrashTiles(tile);
        if (trash.length > 0) return { kind: 'trash', tiles: trash };
        return { kind: 'gold' };
    }

    private countShufflable(): number {
        return this.forEachTile((t, r, c) => !t.isFrozen && !this.host.getBlocked()[r][c]).length;
    }

    private sameTierChoices(tile: Tile): Character[] {
        if (!tile.character) return [];
        const tier = tile.character.tier;
        return this.host.getCharacters().filter(c =>
            c.tier === tier && c.id !== tile.character!.id && c.rarity !== 'Hidden'
        );
    }

    private canUpgrade(tile: Tile): boolean {
        if (!tile.character) return false;
        if (this.host.getEndgamePhase() !== 'normal' && tile.character.level >= 95) return true;
        const next = this.host.findCharacterByLevel(tile.character.level + 1);
        return !!(next && !next.hiddenEnding);
    }

    private canUpgradeTarget(tile: Tile): boolean {
        if (!tile.character) return false;
        if (this.host.getEndgamePhase() !== 'normal' && tile.character.level >= 95) return false;
        const next = this.host.findCharacterByLevel(tile.character.level + 1);
        return !!(next && !next.hiddenEnding);
    }

    private collectAdjacent(tile: Tile): Tile[] {
        const tiles = this.host.getTiles();
        const blocked = this.host.getBlocked();
        const found: Tile[] = [];
        for (let dr = -1; dr <= 1; dr++) {
            for (let dc = -1; dc <= 1; dc++) {
                if (dr === 0 && dc === 0) continue;
                const r = tile.row + dr;
                const c = tile.col + dc;
                if (r < 0 || c < 0 || r >= this.host.getRows() || c >= this.host.getCols()) continue;
                if (blocked[r][c]) continue;
                const t = tiles[r][c];
                if (t?.character) found.push(t);
            }
        }
        return found;
    }

    private collectUpgradeNeighbors(tile: Tile): Tile[] {
        return this.collectAdjacent(tile).filter(t => this.canUpgradeTarget(t));
    }

    private collectAxisLine(tile: Tile): Tile[] {
        const axis = this.overtimeAxis();
        const tiles = this.host.getTiles();
        const blocked = this.host.getBlocked();
        const line: Tile[] = [];
        if (axis === 'row') {
            for (let c = 0; c < this.host.getCols(); c++) {
                const t = tiles[tile.row][c];
                if (t && t !== tile && !blocked[tile.row][c] && !this.host.isGuardedTile(t, tile)) line.push(t);
            }
        } else {
            for (let r = 0; r < this.host.getRows(); r++) {
                const t = tiles[r][tile.col];
                if (t && t !== tile && !blocked[r][tile.col] && !this.host.isGuardedTile(t, tile)) line.push(t);
            }
        }
        return line;
    }

    private collectMeteorTargets(tile: Tile): Tile[] {
        return this.forEachTile((t, r, c) =>
            t !== tile &&
            !!t.character &&
            !this.host.getBlocked()[r][c] &&
            !this.host.isGuardedTile(t, tile)
        ).sort((a, b) => (a.character?.level || 0) - (b.character?.level || 0)).slice(0, 8);
    }

    private castCannon(tile: Tile): SkillResult {
        const line = this.collectAxisLine(tile);
        const boss = this.getBoss();
        if (line.length === 0 && !boss) return failResult('主炮没有目标');
        this.destroyTiles(line);
        this.host.scene.cameras.main.shake(280, 0.016);
        const damage = (tile.character?.level || 7) * 40;
        return this.withWeakness(tile, okResult({
            boardChanged: line.length > 0,
            playAnim: false,
            toast: line.length > 0 ? `米加粒子炮！扫射 ${line.length} 格` : '米加粒子炮！直击首领',
            bossActions: boss ? [{ kind: 'damage', amount: damage }] : []
        }));
    }

    private castZankanto(tile: Tile): SkillResult {
        const line = this.collectAxisLine(tile);
        const boss = this.getBoss();
        if (line.length === 0 && !boss) return failResult('斩舰刀砍不到东西');
        this.destroyTiles(line);
        this.host.scene.cameras.main.shake(320, 0.02);
        return this.withWeakness(tile, okResult({
            boardChanged: line.length > 0,
            playAnim: false,
            toast: '斩舰刀！无物不断！',
            bossActions: boss ? [{ kind: 'damage', amount: 99999 }] : []
        }));
    }

    private castSekiba(tile: Tile): SkillResult {
        const neighbors = this.collectUpgradeNeighbors(tile);
        const obstacles = this.host.getBossVisuals().length;
        const boss = this.getBoss();
        if (neighbors.length === 0 && obstacles === 0 && !boss) return failResult('还没有可以合一的对象');
        neighbors.forEach(n => {
            this.upgradeSelf(n);
            const px = this.host.getPixel(n.row, n.col);
            this.host.playStarEffect(px.x, px.y);
        });
        if (obstacles > 0) this.host.clearBossEffects();
        const damage = (tile.character?.level || 80) * 80;
        return this.withWeakness(tile, okResult({
            boardChanged: neighbors.length > 0 || obstacles > 0,
            playAnim: false,
            toast: neighbors.length > 0 ? `人马合一！邻格进阶 ×${neighbors.length}` : '石破天惊！',
            bossActions: boss
                ? [{ kind: 'damage', amount: damage }, { kind: 'freeze', turns: 1 }]
                : []
        }));
    }

    private castMeteor(tile: Tile): SkillResult {
        const targets = this.collectMeteorTargets(tile);
        const boss = this.getBoss();
        if (targets.length === 0 && !boss) return failResult('小宇宙还烧不起来');
        this.destroyTiles(targets);
        this.host.scene.cameras.main.shake(240, 0.014);
        const damage = (tile.character?.level || 84) * 50;
        return this.withWeakness(tile, okResult({
            boardChanged: targets.length > 0,
            playAnim: false,
            toast: targets.length > 0 ? `天马流星拳 ×${targets.length}` : '燃烧吧，小宇宙！',
            bossActions: boss ? [{ kind: 'damage', amount: damage }] : []
        }));
    }

    private findSummonChar(level?: number): Character | null {
        const summonLevel = level ?? (this.host.getEndgamePhase() === 'normal' ? 1 : this.host.getMinActiveLevel());
        return this.host.findCharacterByLevel(summonLevel, true);
    }

    private transformTile(tile: Tile): boolean {
        const choices = this.sameTierChoices(tile);
        if (choices.length === 0) return false;
        tile.upgrade(Phaser.Utils.Array.GetRandom(choices), 'character');
        return true;
    }

    private upgradeSelf(tile: Tile): boolean {
        if (!tile.character) return false;
        const nextChar = this.host.findCharacterByLevel(tile.character.level + 1);
        if (!nextChar || nextChar.hiddenEnding) return false;
        tile.upgrade(nextChar, 'character');
        return true;
    }

    private destroyTiles(targets: Tile[]) {
        targets.forEach(t => {
            this.host.playSmokeEffect(t.x, t.y);
            this.host.destroyTile(t);
        });
    }

    private forEachTile(pred: (tile: Tile, r: number, c: number) => boolean): Tile[] {
        const tiles = this.host.getTiles();
        const found: Tile[] = [];
        for (let r = 0; r < this.host.getRows(); r++) {
            for (let c = 0; c < this.host.getCols(); c++) {
                const t = tiles[r][c];
                if (t && pred(t, r, c)) found.push(t);
            }
        }
        return found;
    }

    private playCoinBurst(amount: number) {
        const origin = this.host.getPixel(0, 0);
        this.host.showFloatingText(origin.x + 100, origin.y, `+${amount}G`);
        for (let i = 0; i < 5; i++) {
            const coin = this.host.scene.add.sprite(origin.x, origin.y, 'icon_coin').setScale(0.5);
            this.host.scene.tweens.add({
                targets: coin,
                x: coin.x + Phaser.Math.Between(-50, 50),
                y: coin.y - Phaser.Math.Between(50, 100),
                alpha: 0,
                duration: 800,
                ease: 'Cubic.easeOut',
                onComplete: () => coin.destroy()
            });
        }
    }

    private getBoss(): { bossData: BossData } | null {
        const boss = this.host.getActiveBoss();
        if (!boss || typeof boss !== 'object' || !('bossData' in boss)) return null;
        return boss as { bossData: BossData };
    }
}
