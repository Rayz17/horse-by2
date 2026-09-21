import { Scene } from 'phaser';
import { Grid } from '../objects/Grid';
import { Item, Character, EndingReport, EndingRouteStyle, EndingType, HarmonySnapshot, RunConfig, RunMode, SkillResult } from '../types';
import { BossManager } from '../managers/BossManager';
import { SaveManager } from '../managers/SaveManager';
import { Tile } from '../objects/Tile';
import { getDominantTagLabel, resolveSkillProfile } from '../utils/skillMeta';
import { AudioManager } from '../managers/AudioManager';
import { RunStateManager, buildRunSnapshot, RunStateSnapshot, findItemById } from '../managers/RunStateManager';
import { ChapterTracker } from '../managers/ChapterTracker';
import { CharacterAssetLoader } from '../managers/CharacterAssetLoader';
import { GameFeel } from '../managers/GameFeel';
import { mulberry32, seedFromString } from '../utils/rng';
import { BalanceConfig, ChapterDefinition, Recipe } from '../types';
import { computeGameLayout } from '../ui/layout';
import { OverlayManager, UI_CROP, UI_FONT } from '../ui/OverlayManager';
import { ProgressPanel } from '../ui/ProgressPanel';
import { createShopPanel } from '../ui/ShopPanel';
import { renderInventoryPanel } from '../ui/InventoryPanel';
import { fitWrappedText } from '../utils/textFit';
import { buildCharacterCard } from '../ui/CharacterCard';
import { fitSpriteVisual } from '../utils/spriteFit';
import { isShortMode, MODE_LABELS, normalizeRunConfig, persistSlotForMode, ROUTE_BUTTONS, usesDailyWallet } from '../utils/runConfig';
import { buildFortuneLines, deadlockGiveUpSnippet } from '../utils/fortune';
import { findActivePair } from '../utils/pairBonus';
import { pickDailyGuest } from '../utils/guestHorse';
import { rotateShopItems } from '../utils/shopRotation';
import { SKILL_QUIPS } from '../utils/skillQuips';
import { localDateKey } from '../utils/dateKey';
import { BgmPalette } from '../managers/AudioManager';

const ENDING_STYLE_ORDER: EndingRouteStyle[] = ['cyberSciFi', 'ancientClassic', 'animeMania', 'mythLegend'];

const ENDING_STYLE_META: Record<EndingRouteStyle, { label: string; subtitle: string; title: string; summary: string }> = {
    cyberSciFi: {
        label: '赛博科幻',
        subtitle: '真结局·赛博科幻',
        title: '双马同谐·星港超频',
        summary: '这一路更像是在给星港主机扩容，机械、财富与高阶秩序最终合流成了一场未来大巡游。'
    },
    ancientClassic: {
        label: '古风经典',
        subtitle: '真结局·古风经典',
        title: '双马同谐·千骑长卷',
        summary: '这一路更像一幅群英长卷，忠义、书意与稳扎稳打的气口，把终章推成了堂堂正正的大团圆。'
    },
    animeMania: {
        label: '动漫 Mania',
        subtitle: '真结局·动漫 Mania',
        title: '双马同谐·热血万象',
        summary: '这一路越打越像跨棚联动，热血、梗感和名场面叠到最后，终章直接变成了片尾大合照。'
    },
    mythLegend: {
        label: '神话传说',
        subtitle: '真结局·神话传说',
        title: '双马同谐·诸天祥临',
        summary: '这一路更像祥瑞集会，天马、神兽与诸神气韵层层叠起，把真结局抬成了天门大典。'
    }
};

const ENDING_STYLE_CHARACTER_ID: Record<EndingRouteStyle, string> = {
    cyberSciFi: 'great_harmony_cyber_sci_fi',
    ancientClassic: 'great_harmony_ancient_classic',
    animeMania: 'great_harmony_anime_mania',
    mythLegend: 'great_harmony_myth_legend'
};


const ENDING_STYLE_ID_BOOSTS: Record<EndingRouteStyle, string[]> = {
    cyberSciFi: ['white_base', 'mobile_horse', 'samurai_mech', 'orange_mecha', 'elon_mars', 'coder_feng', 'tech_giants', 'luxury_logo', 'magic_paint', 'great_harmony_cyber_sci_fi'],
    ancientClassic: ['god_of_war', 'bole_sage', 'dilu_leap', 'shadow_fast', 'patriot_yue', 'king_suicide', 'arrow_chest', 'silver_lion', 'great_harmony_ancient_classic'],
    animeMania: ['plumber_dino', 'rainbow_fly', 'cosmos_burn', 'mobile_horse', 'white_base', 'rock_horse', 'derby_girl', 'auntie_ma', 'toilet_head', 'pixel_censor', 'link_epona', 'piplup_cosplay', 'great_harmony_anime_mania'],
    mythLegend: ['qilin_myth', 'pegasus_fly', 'sleipnir_god', 'sun_chariot', 'bifrost_br', 'spirit_drag', 'cosmic_one', 'unicorn', 'great_harmony_myth_legend']
};

export class Game extends Scene {
    private grid!: Grid;
    private bossManager!: BossManager;
    private saveManager!: SaveManager;
    private goldText!: Phaser.GameObjects.Text;
    private scoreText!: Phaser.GameObjects.Text;
    private inventory: Item[] = [];
    private inventoryContainer!: Phaser.GameObjects.Container;
    public vfxLayer!: Phaser.GameObjects.Container;
    
    // Info Panel
    private infoPanel!: Phaser.GameObjects.Container;
    private infoName!: Phaser.GameObjects.Text;
    private infoDesc!: Phaser.GameObjects.Text;
    private infoActionBtn!: Phaser.GameObjects.Container;
    private infoActionBg!: Phaser.GameObjects.Rectangle;
    private infoActionText!: Phaser.GameObjects.Text;
    private score: number = 0;

    private gameOverTriggered: boolean = false;
    private lifesaverToastShown: boolean = false;
    private giveUpBtn: Phaser.GameObjects.Container | null = null;
    
    private unlockQueue: Character[] = [];
    public isShowingUnlock: boolean = false;
    private unlockCloser: (() => void) | null = null;
    private debugBossId?: string;
    private activeActionVfxCount: number = 0;
    private bossDefeatedCount: number = 0;
    private mergeMoveCount: number = 0;
    private highestLevelReached: number = 1;
    private tagCounts: Record<string, number> = {};
    private endingStyleScores: Record<EndingRouteStyle, number> = this.createEmptyEndingStyleScores();
    private pendingLevel101Choice: boolean = false;
    private level101ChoiceResolved: boolean = false;
    private harmonyChallengeAccepted: boolean = false;
    private chapterId: string = '';
    private highTierMilestoneShown: boolean = false;
    private progressPanel!: Phaser.GameObjects.Container;
    private progressTitleText!: Phaser.GameObjects.Text;
    private progressBodyText!: Phaser.GameObjects.Text;
    private progressFooterText!: Phaser.GameObjects.Text;
    private audioManager = new AudioManager();
    private runGold = 0;
    private undoRemaining = 1;
    private nextPreviewBox!: Phaser.GameObjects.Rectangle;
    private nextPreviewIcon: Phaser.GameObjects.Image | Phaser.GameObjects.Text | null = null;
    private chapterTracker!: ChapterTracker;
    private gameFeel!: GameFeel;
    private balanceConfig!: BalanceConfig;
    private pressureBar!: Phaser.GameObjects.Graphics;
    private routeBars!: Phaser.GameObjects.Graphics;
    private routeLabelTexts: Phaser.GameObjects.Text[] = [];
    private leadingRouteLabel!: Phaser.GameObjects.Text;
    private lastLeadingRoute: EndingRouteStyle | null = null;
    private undoSnapshot: ReturnType<Grid['exportUndoSnapshot']> | null = null;
    private undoScore = 0;
    private undoGold = 0;
    private undoInventory: string[] = [];
    private undoBtn!: Phaser.GameObjects.Text;
    private continueRun = false;
    private dailySeed: string | null = null;
    private startItems: string[] = [];
    private runMode: RunMode = 'standard';
    private guestId?: string;
    private routeLock?: EndingRouteStyle;
    private sprintMovesLeft = 30;
    private pairTurnsRemaining = 0;
    private chapterEventsFired = new Set<string>();
    private recipeHuntFound = 0;
    private boleCharIds: string[] = [];
    private foundHiddenRecipeThisRun = false;
    private muteBtnText!: Phaser.GameObjects.Text;
    private modeHudText: Phaser.GameObjects.Text | null = null;
    private fileBgmSound: Phaser.Sound.BaseSound | null = null;
    private mergeIndexInTurn = 0;
    private criticalWarningsShown = 0;
    private deadlockHighlightDone = false;
    public skillAimActive = false;
    private skillAimGraphics: Phaser.GameObjects.Graphics | null = null;
    private pendingSkillTile: Tile | null = null;
    private skillAimCell: { r: number; c: number } | null = null;
    private setpiecePlaying = false;
    private pendingRestore: RunStateSnapshot | null = null;

    private layout!: ReturnType<typeof computeGameLayout>;
    private overlayManager!: OverlayManager;
    private progressPanelUi!: ProgressPanel;
    private shopPanel: Phaser.GameObjects.Container | null = null;
    private lastShopChapter = -1;
    private firstRunTipOpen = false;

    constructor() {
        super('Game');
    }

    private createEmptyEndingStyleScores(): Record<EndingRouteStyle, number> {
        return {
            cyberSciFi: 0,
            ancientClassic: 0,
            animeMania: 0,
            mythLegend: 0
        };
    }

    private getRouteEndingCharacter(routeStyle?: EndingRouteStyle): Character | null {
        if (!routeStyle) return null;
        const characters: Character[] = this.cache.json.get('characters') || [];
        const targetId = ENDING_STYLE_CHARACTER_ID[routeStyle];
        return characters.find(char => char.id === targetId) || null;
    }

    private addTrimmedUiImage(
        key: string,
        x: number,
        y: number,
        targetWidth: number,
        crop: { x: number; y: number; w: number; h: number }
    ): Phaser.GameObjects.Image | null {
        if (!this.textures.exists(key)) return null;
        const image = this.add.image(x, y, key).setOrigin(0.5);
        const frame = this.textures.getFrame(key, '__BASE');
        if (!frame) return image;

        const cropX = Math.floor(frame.width * crop.x);
        const cropY = Math.floor(frame.height * crop.y);
        const cropW = Math.floor(frame.width * crop.w);
        const cropH = Math.floor(frame.height * crop.h);
        image.setCrop(cropX, cropY, cropW, cropH);
        image.setDisplaySize(targetWidth, targetWidth * (cropH / cropW));
        return image;
    }

    private getChapterForLevel(level: number) {
        if (level >= 91) {
            return {
                id: 'chapter_harmony',
                title: '大和谐',
                goal: '稳定高阶盘面，冲击真结局',
                footer: '目标：双 101、高阶占比、稳定共鸣',
                toast: '大和谐：把终局凑成一对。'
            };
        }
        if (level >= 76) {
            return {
                id: 'chapter_star',
                title: '终章星穹',
                goal: '稳定高阶盘面，寻找封卷或真结局机会',
                footer: '下一里程碑：Lv.101 与大和谐',
                toast: '终章星穹：现在不是乱滑的时候了。'
            };
        }
        if (level >= 46) {
            return {
                id: 'chapter_myth',
                title: '神话加速',
                goal: '高阶神兽与离谱梗马开始同台竞技',
                footer: '下一里程碑：Lv.76 进入终章星穹',
                toast: '神话加速：高阶角色开始接管棋盘。'
            };
        }
        if (level >= 16) {
            return {
                id: 'chapter_mutation',
                title: '奇种涌现',
                goal: '留意配方与突变，真正的梗马正在苏醒',
                footer: '下一里程碑：Lv.46 神话加速',
                toast: '奇种涌现：配方开始变得离谱了。'
            };
        }
        return {
            id: 'chapter_start',
            title: '青铜启程',
            goal: '先把盘面养活，别急着想宇宙终局',
            footer: '下一里程碑：Lv.16 奇种涌现',
            toast: '青铜启程：先把这盘马养活。'
        };
    }

    private getDebugSpawnBandForBoss(bossId: string): { floor: number; ceiling: number; seedLevels: number[] } {
        switch (bossId) {
            case 'miasma_bat':
                return { floor: 16, ceiling: 22, seedLevels: [16, 17, 18, 19, 20, 21] };
            case 'stone_golem':
                return { floor: 31, ceiling: 36, seedLevels: [31, 32, 33, 34, 35, 36] };
            case 'lava_beast':
                return { floor: 46, ceiling: 52, seedLevels: [46, 47, 48, 49, 50, 51] };
            case 'shadow_assassin':
                return { floor: 61, ceiling: 68, seedLevels: [61, 62, 63, 64, 65, 66] };
            case 'frost_wyrm':
                return { floor: 76, ceiling: 84, seedLevels: [76, 77, 78, 79, 80, 81] };
            case 'chaos_void':
                return { floor: 91, ceiling: 98, seedLevels: [91, 92, 93, 94, 95, 96] };
            case 'fire_monkey':
            default:
                return { floor: 1, ceiling: 6, seedLevels: [1, 2, 2, 3, 4, 5] };
        }
    }

    init(data: Partial<RunConfig> = {}) {
        const cfg = normalizeRunConfig(data);
        this.debugBossId = cfg.bossId;
        this.continueRun = !!cfg.continueRun;
        this.dailySeed = cfg.dailySeed || null;
        this.startItems = cfg.startItems || [];
        this.runMode = cfg.mode;
        this.guestId = cfg.guestId;
        this.routeLock = cfg.routeLock;
        this.sprintMovesLeft = 30;
        this.pairTurnsRemaining = 0;
        this.chapterEventsFired = new Set();
        this.recipeHuntFound = 0;
        this.boleCharIds = [];
        this.foundHiddenRecipeThisRun = false;
        this.gameOverTriggered = false;
    }

    public onBossSelected(boss: any) {
        // Deselect grid tile
        this.grid.selectTile(null);
        
        // Deselect other bosses? (Currently only one active boss usually)
        // But if we had multiple, we'd need to loop.
        
        // Play Idle on Boss
        boss.playIdle();
        
        // Show Info
        this.updateInfoPanel(null); // Clear tile info
        this.showBossInfo(boss);
    }

    private showBossInfo(boss: any) {
        if (!this.infoName || !this.infoDesc || !this.infoActionBtn) return;
        this.infoName.setOrigin(0, 0);
        this.infoName.setPosition(-this.layout.contentWidth / 2 + 18, -22);
        this.infoDesc.setOrigin(0, 0);
        this.infoDesc.setPosition(-this.layout.contentWidth / 2 + 18, 4);

        const weaknessNames = (boss.bossData.weakness || []).map((id: string) => {
            const characters = this.cache.json.get('characters') || [];
            const char = characters.find((c: Character) => c.id === id);
            return char ? char.name : id;
        }).join(' / ');

        this.infoName.setText(`${boss.bossData.name} | 首领情报`);
        this.infoDesc.setText(`${boss.bossData.description || '首领正在施压。'}  弱点：${weaknessNames || '暂无'}`);
        this.infoActionBtn.setVisible(false);
        this.fitInfoDesc();
    }

    
    create() {
        // Clear stale listeners and state from previous runs (scene instance reused on restart)
        this.events.off('unlock-character');
        this.events.off('add-gold');
        this.events.off('show-toast');
        this.events.off('boss-steal-gold');
        this.events.off('boss-defeated');
        this.events.off('use-gold-ingot');
        this.events.off('endgame-phase-changed');
        this.events.off('harmony-progress');
        this.events.off('harmony-achieved');
        this.events.off('tile-cleanup');
        this.events.off('combo-display');
        this.unlockQueue = [];
        this.isShowingUnlock = false;
        this.unlockCloser = null;
        this.bossDefeatedCount = 0;
        this.mergeMoveCount = 0;
        this.highestLevelReached = 1;
        this.tagCounts = {};
        this.endingStyleScores = this.createEmptyEndingStyleScores();
        this.pendingLevel101Choice = false;
        this.level101ChoiceResolved = false;
        this.harmonyChallengeAccepted = false;
        this.chapterId = '';
        this.highTierMilestoneShown = false;

        // Add background
        // Use simple color for Game Scene as requested
        this.add.rectangle(360, 640, 720, 1280, 0x222222).setOrigin(0.5);
        
        // Layout constants: board-first, inventory and infoPanel in separate rows
        this.layout = computeGameLayout();
        const startX = 360 - this.layout.gridWidth / 2;
        const startY = this.layout.gridCenterY - this.layout.gridWidth / 2;

        // Draw grid lines
        const graphics = this.add.graphics();
        graphics.lineStyle(2, 0x444444);
        const tileSize = this.layout.gridWidth / 6;
        for (let i = 0; i <= 6; i++) {
            graphics.moveTo(startX, startY + i * tileSize);
            graphics.lineTo(startX + this.layout.gridWidth, startY + i * tileSize);
            graphics.moveTo(startX + i * tileSize, startY);
            graphics.lineTo(startX + i * tileSize, startY + this.layout.gridWidth);
        }
        graphics.strokePath();

        // VFX Layer (Above Grid)
        this.vfxLayer = this.add.container(0, 0);
        this.vfxLayer.setDepth(1000);

        // Initialize Managers
        this.saveManager = new SaveManager();
        this.runGold = Number(this.balanceConfig?.initialGold ?? 1000);

        this.deadlockHighlightDone = false;
        this.criticalWarningsShown = 0;

        this.balanceConfig = this.cache.json.get('balance') || {};
        this.chapterTracker = new ChapterTracker(this.cache.json.get('chapters') as ChapterDefinition[]);
        this.gameFeel = new GameFeel(this, this.balanceConfig.feel || {}, this.audioManager);
        this.sprintMovesLeft = Number(this.balanceConfig.modes?.sprintMoves ?? 30);
        const noUndo = this.runMode === 'daily' || this.runMode === 'sprint' || this.runMode === 'recipeHunt';
        if (noUndo) this.undoRemaining = 0;

        const savedRun = this.continueRun ? RunStateManager.getContinueSnapshot() : null;
        if (savedRun) {
            this.runMode = savedRun.mode || (savedRun.dailySeed || savedRun.dailyChallenge ? 'daily' : 'standard');
            this.dailySeed = savedRun.dailySeed || this.dailySeed;
            this.guestId = savedRun.guestId || this.guestId;
            this.routeLock = savedRun.routeLock || this.routeLock;
        }
        if (this.runMode === 'daily' && !this.dailySeed) this.dailySeed = localDateKey();

        const bootstrap = !savedRun && this.runMode === 'standard' && !this.dailySeed;

        // Initialize Grid
        this.grid = new Grid(this, startX, startY, this.layout.gridWidth, this.saveManager, bootstrap);
        CharacterAssetLoader.startLoadIfNeeded(this, () => this.refreshCharacterTextures());
        // Re-validate strips for already-loaded characters (fixes broken anim sheets from bad action art).
        CharacterAssetLoader.ensureAnimations(this, this.cache.json.get('characters') || []);
        if ((this.dailySeed || isShortMode(this.runMode)) && !savedRun) {
            const seedKey = this.dailySeed || `${this.runMode}-${Date.now()}`;
            this.grid.setSpawnRng(mulberry32(seedFromString(seedKey)));
            if (this.runMode === 'daily' || this.runMode === 'sprint') this.grid.setInputBufferEnabled(false);
            this.grid.bootstrapBoard();
        }
        if (this.runMode === 'recipeHunt') {
            this.grid.setRecipeChanceOverride(Number(this.balanceConfig.modes?.recipeHuntSpawnChance ?? 0.45));
        }
        this.bossManager = new BossManager(this, this.grid);
        if (this.runMode === 'bossRush') {
            this.bossManager.setSpawnTurnsOverride(Number(this.balanceConfig.modes?.bossRushInterval ?? 12));
        }
        this.grid.setHarmonyChallengeAccepted(false);

        this.pressureBar = this.add.graphics().setDepth(850);
        this.routeBars = this.add.graphics().setDepth(860);
        this.leadingRouteLabel = this.add.text(360, this.layout.routeBarY - 14, '', {
            fontFamily: 'Arial', fontSize: 13, color: '#ffd700'
        }).setOrigin(0.5).setDepth(861).setVisible(false);
        this.routeLabelTexts = ENDING_STYLE_ORDER.map((style, i) =>
            this.add.text(this.layout.sidePad + 40 + i * 108, this.layout.routeBarY + 10, ENDING_STYLE_META[style].label.slice(0, 2), {
                fontFamily: 'Arial', fontSize: 12, color: '#888888'
            }).setOrigin(0.5).setDepth(861).setVisible(false)
        );

        this.grid.onBeforeMove = () => this.captureUndoSnapshot();
        this.grid.onRecipeDiscovered = (recipe) => this.markRecipeDiscovery(recipe);
        if (savedRun) {
            this.pendingRestore = savedRun;
        } else if (this.runMode === 'standard') {
            this.applyStartItems();
        }

        const hy = this.layout.headerCenterY;
        this.add.rectangle(548, hy, 80, 36, 0x335577, 0.95).setStrokeStyle(2, 0xffffff, 0.25).setDepth(29);
        this.undoBtn = this.add.text(548, hy, `悔棋 ${this.undoRemaining}`, {
            fontFamily: 'Arial', fontSize: 16, color: '#ffffff'
        }).setOrigin(0.5).setDepth(30).setInteractive({ useHandCursor: true });
        this.undoBtn.on('pointerdown', () => this.useUndo());
        if (this.dailySeed || this.runMode === 'sprint' || this.runMode === 'recipeHunt') {
            this.undoBtn.setVisible(false);
        }
        if (this.runMode !== 'standard') {
            const label = this.runMode === 'daily'
                ? `今日挑战 · ${this.dailySeed}`
                : this.runMode === 'sprint'
                    ? `三十步冲分 · 剩 ${this.sprintMovesLeft}`
                    : MODE_LABELS[this.runMode];
            this.modeHudText = this.add.text(360, 12, label, {
                fontFamily: 'Arial', fontSize: 12, color: '#99ccff'
            }).setOrigin(0.5).setDepth(30);
        }

        this.audioManager.ensureContext().then(() => this.refreshBgm());

        if (this.textures.exists('top_bar_bg')) {
            const topBar = this.add.image(360, hy, 'top_bar_bg').setOrigin(0.5).setDepth(10);
            topBar.setDisplaySize(720, this.layout.headerH);
        } else {
            this.add.rectangle(360, hy, 720, this.layout.headerH, 0x111111, 0.88).setOrigin(0.5).setDepth(10);
        }
        this.add.rectangle(360, this.layout.headerH, 720, 2, 0x333333).setOrigin(0.5).setDepth(10);

        this.add.rectangle(360, this.layout.gridCenterY, this.layout.gridWidth + 8, this.layout.gridWidth + 8, 0x1a1a1a, 0.55)
            .setStrokeStyle(2, 0x555555, 0.5).setDepth(0);

        this.scoreText = this.add.text(248, hy, '0', {
            fontFamily: 'Arial Black', fontSize: 26, color: '#ffffff', stroke: '#000000', strokeThickness: 4
        }).setOrigin(0, 0.5).setDepth(30);

        this.add.text(this.layout.nextPreviewX, hy - 22, '下一个', {
            fontFamily: 'Arial', fontSize: 12, color: '#cccccc'
        }).setOrigin(0.5).setDepth(30);
        this.nextPreviewBox = this.add.rectangle(this.layout.nextPreviewX, hy + 8, 40, 40, 0x222244)
            .setStrokeStyle(2, 0x666699).setDepth(30);
        this.time.addEvent({ delay: 300, loop: true, callback: () => this.refreshNextPreview() });

        if (this.textures.exists('icon_score')) {
            this.add.image(232, hy, 'icon_score').setDisplaySize(28, 28).setOrigin(1, 0.5).setDepth(30);
        }

        this.add.rectangle(478, hy, 56, 36, 0x333333, 0.95).setStrokeStyle(2, 0xffffff, 0.25).setDepth(29);
        this.muteBtnText = this.add.text(478, hy, this.audioManager.isMuted() ? '静音' : '音效', {
            fontFamily: 'Arial', fontSize: 14, color: '#ffffff'
        }).setOrigin(0.5).setDepth(30).setInteractive({ useHandCursor: true });
        this.muteBtnText.on('pointerdown', () => {
            this.audioManager.toggleMuted();
            this.muteBtnText.setText(this.audioManager.isMuted() ? '静音' : '音效');
            if (this.audioManager.isMuted()) this.fileBgmSound?.stop();
            else this.refreshBgm();
        });

        this.add.rectangle(668, hy, 80, 36, 0x444444, 0.95).setStrokeStyle(2, 0xffffff, 0.25).setDepth(29);
        const menuBtn = this.add.text(668, hy, "菜单", {
            fontFamily: 'Arial', fontSize: 16, color: '#ffffff'
        }).setOrigin(0.5).setDepth(30).setInteractive({ useHandCursor: true });
        
        menuBtn.on('pointerdown', () => {
            this.persistRunState();
            this.fileBgmSound?.stop();
            this.audioManager.stopBgm();
            this.scene.start('MainMenu');
        });

        this.bindKeyboard();
        this.maybeShowFirstRunTips();

        this.grid.onScoreChange = (char, x, y, isCritical) => {
            const base = char.level * 10;
            const fx = x ?? (this.grid.getStartX() + this.layout.gridWidth / 2);
            const fy = y ?? this.layout.gridCenterY;
            const pairOn = this.tickPairAura();
            const pairMult = pairOn ? Number(this.balanceConfig.pairBonus?.multiplier ?? 1.25) : 1;
            const adjusted = this.gameFeel.onMerge(base, fx, fy, !!isCritical, this.mergeIndexInTurn, pairMult, pairOn) ?? base;
            if (this.runMode !== 'recipeHunt' || char.recipeOnly) {
                this.addScore(adjusted);
            }
            this.mergeIndexInTurn++;
            const bonus = Math.floor(Math.pow(char.level, 1.5));
            this.addGold(char.level * 10 + bonus);
            this.bossManager.onMerge(char);
            this.recordCharacterTags(char, Math.max(1, Math.floor(char.level / 5)));
            this.maybeAnnounceRouteLead(char);
            this.highestLevelReached = Math.max(this.highestLevelReached, char.level);
            const levelReward = this.chapterTracker.onReachLevel(char.level);
            if (levelReward) this.grantObjectiveReward(levelReward);
            this.gameFeel.maybeMilestone(char.tier, char.level);
            this.refreshProgressPanel();
            this.updatePressureBar();
            this.updateRouteBars();
        };

        this.grid.onMoveResolved = (hadMerge) => {
            this.mergeIndexInTurn = 0;
            this.gameFeel.resetCombo();
            // Ghost blocked cells must be cleared even when the swipe did not merge.
            this.bossManager.sanitizeOccupancy();
            if (hadMerge) {
                this.mergeMoveCount++;
                this.bossManager.nextTurn();
            }
            this.grid.packAfterExternalEffects();
            this.highestLevelReached = Math.max(this.highestLevelReached, this.grid.getMaxLevel());
            if (this.pairTurnsRemaining > 0) this.pairTurnsRemaining--;
            if (this.runMode === 'sprint') {
                this.sprintMovesLeft = Math.max(0, this.sprintMovesLeft - 1);
                this.modeHudText?.setText(`三十步冲分 · 剩 ${this.sprintMovesLeft}`);
                if (this.sprintMovesLeft <= 0) {
                    this.triggerGameOver(this.grid.getMaxLevel() >= 101 ? 'normalEnding' : 'deadlockEnding');
                    return;
                }
            }
            if (!isShortMode(this.runMode) && this.grid.getMaxLevel() >= 101 && !this.level101ChoiceResolved) {
                this.pendingLevel101Choice = true;
                this.maybeShowLevel101Choice();
            }
            this.refreshProgressPanel();
            this.refreshBgm();
            this.persistRunState();
            this.updateInfoPanel(this.grid.getSelectedTile());
        };

        // Grid Selection Listener
        this.grid.onTileSelected = (tile) => {
            if (tile && tile.character) {
                // Play Idle when selected
                tile.playIdle();
            }
            
            // Stop idle for previous tile if different
            this.grid.getAllTiles().forEach(t => {
                if (t !== tile && t.character) {
                    t.stopIdle();
                }
            });

            // Deselect Boss if active
            if (this.bossManager) {
                const activeBoss = this.bossManager.getActiveBoss();
                if (activeBoss) {
                    activeBoss.stopIdle();
                }
            }

            this.updateInfoPanel(tile);
        };

        // Gold UI Top Right
        if (this.textures.exists('icon_coin')) {
            this.add.image(360, hy, 'icon_coin').setDisplaySize(26, 26).setOrigin(1, 0.5).setDepth(30);
        }
        this.goldText = this.add.text(366, hy, `${this.runGold}`, {
            fontFamily: 'Arial Black', fontSize: 22, color: '#ffd700', stroke: '#000000', strokeThickness: 4
        }).setOrigin(0, 0.5).setDepth(30);

        this.overlayManager = new OverlayManager(this, (key, x, y, maxWidth, crop) => this.addTrimmedUiImage(key, x, y, maxWidth, crop));
        this.progressPanelUi = new ProgressPanel(this, this.layout.progressCenterY, this.layout.contentWidth, this.layout.progressH);
        this.progressPanel = this.progressPanelUi.container;
        this.progressTitleText = this.progressPanelUi.titleText;
        this.progressBodyText = this.progressPanelUi.bodyText;
        this.progressFooterText = this.progressPanelUi.footerText;

        this.createInfoPanel();
        this.createInventory();
        this.createShop();

        if (this.pendingRestore) {
            this.restoreRun(this.pendingRestore);
            this.pendingRestore = null;
        } else {
            this.score = 0;
            this.runGold = usesDailyWallet(this.runMode)
                ? this.saveManager.getDailyGold(this.dailySeed || localDateKey())
                : Number(this.balanceConfig.initialGold ?? 1000);
            this.scoreText.setText('0');
            this.goldText.setText(`${this.runGold}`);
            this.applyModeStartExtras();
        }

        this.time.delayedCall(80, () => {
            this.bossManager?.sanitizeOccupancy?.();
            this.persistRunState();
        });
        this.refreshProgressPanel();

        // Event Listeners
        this.events.on('unlock-character', (char: Character) => {
            this.unlockQueue.push(char);
            this.processUnlockQueue();
        });

        this.events.on('add-gold', (amount: number) => {
            this.addGold(amount);
        });

        this.events.on('show-toast', (msg: string) => {
            this.showToast(msg);
        });

        this.events.on('boss-steal-gold', (amount?: number) => {
            const stealAmount = amount || Math.floor(this.runGold * 0.1);
            if (stealAmount > 0 && this.runGold > 0) {
                const actualSteal = Math.min(stealAmount, this.runGold);
                this.addGold(-actualSteal);
                this.showToast(`毒雾掠夺！损失了 ${actualSteal}G!`);
            }
        });

        this.events.on('boss-defeated', (bossData: { id: string }) => {
            this.bossDefeatedCount++;
            this.grid.registerEndgameEvent('boss');
            this.showChapterToast('章节推进：这一关的期中考试你过了。');
            this.refreshProgressPanel();
            this.audioManager.play('boss_defeat');
            navigator.vibrate?.([30, 50, 80]);

            const reward = this.chapterTracker.onBossDefeated(bossData.id);
            if (reward) this.grantObjectiveReward(reward);

            const items: Item[] = this.cache.json.get('items');
            // Spec T0-7: 专属掉落自动进包（与三选一战利品叠加，不是互斥选项）
            this.grantBossExclusiveDrop(bossData.id, items);
            this.showBossDefeatChoice(bossData, items);
            if (this.runMode === 'bossRush' && this.bossDefeatedCount >= Number(this.balanceConfig.modes?.bossRushTarget ?? 3)) {
                this.time.delayedCall(600, () => this.triggerGameOver('normalEnding'));
            }
        });

        this.events.on('use-gold-ingot', () => {
            this.cashGoldIngot();
        });

        this.events.on('tile-cleanup', (_x: number, _y: number, count: number) => {
            if (count > 0) this.showToast(`低阶马匹已随时代离场 ×${count}`);
        });

        this.events.on('combo-display', (combo: number) => {
            const reward = this.chapterTracker.onCombo(combo);
            if (reward) this.grantObjectiveReward(reward);
        });

        this.events.on('boss-spawned', (bossData: any) => {
            this.showChapterToast(`首领降临：${bossData.name}`);
            this.refreshProgressPanel();
        });

        this.events.on('endgame-phase-changed', (snapshot: HarmonySnapshot) => {
            if (snapshot.phase === 'ascension') {
                this.showChapterToast("终章开启：91级后进入严谨推进阶段。");
            } else if (snapshot.phase === 'harmony') {
                if (this.harmonyChallengeAccepted) {
                    this.showChapterToast("宇宙大和谐启动：请稳定高阶盘面。");
                } else {
                    this.showChapterToast("Lv.101 现身：可选择封卷，或继续挑战大和谐。");
                }
            }
            this.refreshProgressPanel();
        });

        this.events.on('harmony-progress', (snapshot: HarmonySnapshot) => {
            if (snapshot.phase === 'harmony' && this.harmonyChallengeAccepted) {
                this.showChapterToast(`大和谐进度：101x${snapshot.level101Count}，共鸣 ${snapshot.stableMoves}/3`);
            }
            this.refreshProgressPanel();
        });

        this.events.on('harmony-achieved', (payload: { snapshot: HarmonySnapshot, endingChar: Character | null }) => {
            const best = this.grid.getBestCharacter();
            const rankedTags = Object.entries(this.tagCounts).sort((a, b) => b[1] - a[1]);
            const dominantTag = rankedTags[0]?.[0] || resolveSkillProfile(payload.endingChar || best).tags[0] || 'myth';
            const routeStyle = this.evaluateEndingRoute('trueEnding', payload.endingChar || best, payload.snapshot, dominantTag).style;
            const routeEndingChar = this.getRouteEndingCharacter(routeStyle);
            if (routeEndingChar) {
                this.saveManager.unlockCharacter(routeEndingChar.id);
                this.recordCharacterTags(routeEndingChar, 10);
            }
            this.showChapterToast("宇宙大和谐达成，真结局降临。");
            this.refreshProgressPanel();
            this.time.delayedCall(900, () => {
                this.triggerGameOver('trueEnding', routeEndingChar, payload.snapshot);
            });
        });

        if (this.debugBossId) {
            this.time.delayedCall(500, () => {
                const debugBand = this.getDebugSpawnBandForBoss(this.debugBossId!);
                this.grid.configureDebugSpawnBand(debugBand.floor, debugBand.ceiling);
                debugBand.seedLevels.forEach(level => {
                    this.grid.forceSpawnCharacter(level);
                });
                this.bossManager.forceSpawnBoss(this.debugBossId!);
                
                // Spawn weakness characters for testing
                const bossData = this.cache.json.get('bosses').find((b: any) => b.id === this.debugBossId);
                if (bossData && bossData.weakness) {
                    const characters = this.cache.json.get('characters');
                    bossData.weakness.forEach((weakId: string) => {
                        const char = characters.find((c: any) => c.id === weakId);
                        if (char) {
                            this.grid.forceSpawnCharacter(char.level);
                        }
                    });
                }
            });
        }
    }

    private refreshProgressPanel() {
        if (!this.progressPanel) return;

        const level = Math.max(this.highestLevelReached, this.grid?.getMaxLevel?.() || 1);
        const chapter = this.getChapterForLevel(level);
        const activeBoss = this.bossManager?.getActiveBoss?.() || null;
        const harmony = this.grid?.getHarmonySnapshot?.();

        if (chapter.id !== this.chapterId) {
            const prev = this.chapterId;
            this.chapterId = chapter.id;
            this.showPhaseBanner(chapter.title, chapter.toast);
            if (prev) this.fireChapterEvent(chapter.id);
        }

        if (!this.highTierMilestoneShown && level >= 95) {
            this.highTierMilestoneShown = true;
            this.showChapterToast('星盘开始发亮了，高阶角色已进入共鸣区。');
        }

        const tracked = this.chapterTracker.getCurrentChapter(level);
        const objective = this.chapterTracker.getActiveObjective(tracked);
        const objectiveDone = this.chapterTracker.getCompletedCount();
        const objectiveTotal = this.chapterTracker.getTotalCount();

        if (this.harmonyChallengeAccepted && harmony && harmony.phase === 'harmony') {
            this.progressTitleText.setText('大和谐');
            this.progressBodyText.setText('当前目标：稳定高阶盘面，补齐三项真结局条件。');
            this.progressFooterText.setText(`101×${harmony.level101Count} · ${objectiveDone}/${objectiveTotal}`);
            return;
        }

        if (activeBoss) {
            this.progressTitleText.setText(`第${this.getBossChapterIndex(activeBoss.bossData.id)}章`);
            this.progressBodyText.setText(objective ? `当前目标：${objective.text}` : '当前目标：组织克制角色');
            this.progressFooterText.setText(`Boss · ${objectiveDone}/${objectiveTotal}`);
            return;
        }

        this.progressTitleText.setText(chapter.title);
        this.progressBodyText.setText(objective ? `当前目标：${objective.text}` : `当前目标：${chapter.goal}`);
        this.progressFooterText.setText(`${objectiveDone}/${objectiveTotal}`);
        this.refreshShopIfNeeded();
    }

    private showPhaseBanner(title: string, subtitle: string) {
        this.overlayManager.showPhaseBanner(title, subtitle);
    }

    private getBossChapterIndex(bossId: string): number {
        const order = ['fire_monkey', 'miasma_bat', 'stone_golem', 'lava_beast', 'shadow_assassin', 'frost_wyrm', 'chaos_void'];
        const idx = order.indexOf(bossId);
        return idx >= 0 ? idx + 1 : 1;
    }

    private showChapterToast(msg: string) {
        this.overlayManager.showChapterToast(msg);
    }

    private showToast(msg: string, options?: { startY?: number; endY?: number; duration?: number; fontSize?: number }) {
        this.overlayManager.showToast(msg, options);
    }

    private processUnlockQueue() {
        if (this.isShowingUnlock || this.setpiecePlaying) return;
        if (this.unlockQueue.length === 0) {
            this.maybeShowLevel101Choice();
            return;
        }
        
        this.isShowingUnlock = true;
        const char = this.unlockQueue.shift()!;
        this.showUnlockOverlay(char);
    }

    private showUnlockOverlay(char: Character) {
        // Pause Game Logic
        this.infoPanel?.setVisible(false);
        const overlay = this.add.container(0, 0);
        overlay.setDepth(5200);

        // Dark Background
        const bg = this.add.rectangle(360, 640, 720, 1280, 0x000000, 0.85).setOrigin(0.5);
        bg.setInteractive(); // Block clicks
        overlay.add(bg);

        // Rays/Burst
        const rays = this.add.sprite(360, 640, 'flare');
        rays.setScale(4);
        rays.setAlpha(0.3);
        this.tweens.add({
            targets: rays,
            angle: 360,
            duration: 8000,
            repeat: -1
        });
        overlay.add(rays);

        // Title
        const title = this.add.text(360, 150, "新角色解锁！", {
            fontFamily: 'Arial Black', fontSize: 48, color: '#ffd700', stroke: '#000000', strokeThickness: 6
        }).setOrigin(0.5);
        overlay.add(title);

        const detailsContainer = buildCharacterCard(this, char, {
            x: 360,
            y: 620,
            width: 540,
            height: 700
        });
        overlay.add(detailsContainer);

        // Tap to Continue
        const tapText = this.add.text(360, 1096, "点击继续 · 空格", {
            fontFamily: 'Arial Black', fontSize: 32, color: '#ffffff', stroke: '#000000', strokeThickness: 4
        }).setOrigin(0.5);
        
        this.tweens.add({
            targets: tapText,
            alpha: 0.2,
            yoyo: true,
            repeat: -1,
            duration: 800
        });
        overlay.add(tapText);

        // Entrance animation
        detailsContainer.setScale(0.5);
        detailsContainer.setAlpha(0);
        this.tweens.add({
            targets: detailsContainer,
            scale: 1,
            alpha: 1,
            duration: 400,
            ease: 'Back.out'
        });

        const close = () => {
            if (!overlay.active || !this.unlockCloser) return;
            this.unlockCloser = null;
            bg.disableInteractive();
            this.tweens.add({
                targets: overlay,
                alpha: 0,
                duration: 200,
                onComplete: () => {
                    overlay.destroy();
                    this.isShowingUnlock = false;
                    this.infoPanel?.setVisible(true);
                    if (this.pendingLevel101Choice) this.maybeShowLevel101Choice();
                    else this.processUnlockQueue();
                }
            });
        };
        this.unlockCloser = close;
        bg.on('pointerdown', close);
    }

    private maybeShowLevel101Choice() {
        if (!this.pendingLevel101Choice || this.level101ChoiceResolved || this.isShowingUnlock) return;
        this.pendingLevel101Choice = false;
        this.showLevel101ChoiceOverlay();
    }

    private showLevel101ChoiceOverlay() {
        this.isShowingUnlock = true;
        this.infoPanel?.setVisible(false);
        const report = this.buildEndingReport('normalEnding', this.grid.getBestCharacter(), null, this.grid.getHarmonySnapshot());
        const overlay = this.add.container(0, 0);
        overlay.setDepth(2200);

        const bg = this.add.rectangle(360, 640, 720, 1280, 0x000000, 0.88).setOrigin(0.5).setInteractive();
        overlay.add(bg);

        const cardX = 360;
        const cardY = 630;
        const cardW = 620;
        const cardH = 828;

        if (this.textures.exists('ending_choice_card')) {
            const cardBg = this.add.image(cardX, cardY, 'ending_choice_card').setOrigin(0.5);
            cardBg.setDisplaySize(cardW, cardH);
            overlay.add(cardBg);
        } else {
            const card = this.add.rectangle(360, 620, 620, 760, 0x1a1035, 0.96).setOrigin(0.5);
            card.setStrokeStyle(4, 0xffd700);
            overlay.add(card);
        }

        const panel = this.add.container(cardX, cardY);
        overlay.add(panel);
        const contentW = cardW * UI_CROP.endingChoiceInner.w;
        const contentLeft = -contentW / 2 + 40;
        let cursorY = -cardH * 0.33 - 75;

        const title = this.add.text(0, cursorY, '宇宙神驹出场', {
            fontFamily: 'Arial Black', fontSize: UI_FONT.modalTitle - 8, color: '#333333'
        }).setOrigin(0.5, 0);
        panel.add(title);
        cursorY += title.height + 38;

        const subtitle = this.add.text(contentLeft, cursorY, '这一局已经可以体面收官，也可以继续整点更大的。', {
            fontFamily: 'Arial Black', fontSize: UI_FONT.modalSubtitle, color: '#ffffff',
            wordWrap: { width: contentW - 80, useAdvancedWrap: true },
            align: 'left'
        }).setOrigin(0, 0);
        panel.add(subtitle);
        cursorY += subtitle.height + 38;

        const harmony = report.harmony;
        const blocks = [
            {
                title: '当前结算预览',
                body: [
                    `当前终局角色：${report.endingChar?.name || '宇宙神驹'}`,
                    `最终得分预览：${report.score}`,
                    `Boss 击败：${report.bossDefeated}`,
                    `关键合成：${report.moveCount}`
                ].join('\n')
            },
            {
                title: '你现在可以选择：',
                body: [
                    '1. 结束游戏，直接进入这一版结局结算',
                    '2. 继续挑战“宇宙大和谐”，冲击隐藏真结局'
                ].join('\n')
            },
            {
                title: '大和谐目标：',
                body: [
                    `- 101 级数量至少 2 个，目前 ${harmony?.level101Count || 0}`,
                    `- 95 级以上占比至少 35%，目前 ${Math.round((harmony?.highTierRatio || 0) * 100)}%`,
                    `- 稳定共鸣至少 3 回合，目前 ${harmony?.stableMoves || 0}/3`
                ].join('\n')
            }
        ];

        blocks.forEach(block => {
            if (block.title.includes('大和谐目标')) {
                cursorY += 50;
            }
            const sectionTitle = this.add.text(contentLeft, cursorY, block.title, {
                fontFamily: 'Arial Black', fontSize: UI_FONT.sectionTitle, color: '#ffe082'
            }).setOrigin(0, 0);
            panel.add(sectionTitle);
            cursorY += sectionTitle.height + 10;

            const sectionBody = this.add.text(contentLeft, cursorY, block.body, {
                fontFamily: 'Arial', fontSize: UI_FONT.body, color: '#ffffff',
                wordWrap: { width: contentW, useAdvancedWrap: true },
                align: 'left',
                lineSpacing: 8
            }).setOrigin(0, 0);
            panel.add(sectionBody);
            cursorY += sectionBody.height + 18;
        });

        const buttonY = cardH * 0.5 - 78;
        const endBtn = this.add.rectangle(-118, buttonY, 220, 64, 0x8a1f1f, 1).setOrigin(0.5).setInteractive({ useHandCursor: true });
        endBtn.setStrokeStyle(3, 0xffffff, 1);
        const endText = this.add.text(-118, buttonY, '结束游戏', {
            fontFamily: 'Arial Black', fontSize: 24, color: '#ffffff'
        }).setOrigin(0.5);

        const challengeBtn = this.add.rectangle(118, buttonY, 220, 64, 0x1f6a3a, 1).setOrigin(0.5).setInteractive({ useHandCursor: true });
        challengeBtn.setStrokeStyle(3, 0xffffff, 1);
        const challengeText = this.add.text(118, buttonY, '挑战大和谐', {
            fontFamily: 'Arial Black', fontSize: 24, color: '#ffffff'
        }).setOrigin(0.5);

        panel.add([endBtn, endText, challengeBtn, challengeText]);

        const routeY = buttonY + 72;
        ROUTE_BUTTONS.forEach((route, i) => {
            const x = -195 + i * 130;
            const btn = this.add.rectangle(x, routeY, 118, 40, 0x2a2048, 1).setOrigin(0.5).setInteractive({ useHandCursor: true });
            btn.setStrokeStyle(2, 0xffd700, 0.85);
            const txt = this.add.text(x, routeY, route.label, {
                fontFamily: 'Arial Black', fontSize: 18, color: '#ffe082'
            }).setOrigin(0.5);
            panel.add([btn, txt]);
            btn.on('pointerdown', () => {
                overlay.destroy();
                this.level101ChoiceResolved = true;
                this.routeLock = route.style;
                this.endingStyleScores[route.style] += 20;
                this.isShowingUnlock = false;
                this.triggerGameOver('normalEnding');
            });
        });

        endBtn.on('pointerdown', () => {
            overlay.destroy();
            this.level101ChoiceResolved = true;
            this.isShowingUnlock = false;
            if (this.routeLock) {
                this.triggerGameOver('normalEnding');
            } else {
                this.showBoleSealOverlay();
            }
        });

        challengeBtn.on('pointerdown', () => {
            overlay.destroy();
            this.level101ChoiceResolved = true;
            this.harmonyChallengeAccepted = true;
            this.grid.setHarmonyChallengeAccepted(true);
            this.isShowingUnlock = false;
            this.infoPanel?.setVisible(true);
            this.showToast(this.routeLock ? '已锁路线仍会加权，去把终局凑成一对。' : '继续前进吧，去把终局凑成一对。');
            this.processUnlockQueue();
        });
    }

    public playActionAnimation(x: number, y: number, charId: string) {
        const animKey = `${charId}_action`;
        const sheetKey = `${charId}_anim_sheet`;
        
        if (!this.anims.exists(animKey)) return;
        if (this.activeActionVfxCount >= 8) return;

        // Overlay sprite for action
        const textureKey = this.textures.exists(sheetKey) ? sheetKey : charId;
        const sprite = this.add.sprite(x, y, textureKey);
        this.activeActionVfxCount++;
        
        sprite.play(animKey);
        
        // --- V5 Logic: Center Align (Matching Script Output) ---
        // The python script now centers the content within each frame cell.
        // So we should align the sprite's center to the tile's center.
        sprite.setOrigin(0.5, 0.5);

        const tileSize = this.grid.getTileSize();
        // Same content-box scale as board / idle so action does not jump in size.
        fitSpriteVisual(this, sprite, tileSize, charId, 0.96);

        this.vfxLayer.add(sprite);

        const finish = () => {
            if (!sprite.active) return;
            this.tweens.killTweensOf(sprite);
            sprite.destroy();
            this.activeActionVfxCount = Math.max(0, this.activeActionVfxCount - 1);
        };

        sprite.on('animationcomplete', () => {
            this.time.delayedCall(400, () => {
                this.tweens.add({
                    targets: sprite,
                    alpha: 0,
                    duration: 300,
                    onComplete: finish
                });
            });
        });
        this.time.delayedCall(1600, finish);
    }

    private createInfoPanel() {
        this.infoPanel = this.add.container(360, this.layout.infoPanelCenterY);
        this.infoPanel.setDepth(500);
        this.infoPanel.setVisible(true);

        const panelW = this.layout.contentWidth;
        const panelH = this.layout.infoH;
        const bg = this.add.rectangle(0, 0, panelW, panelH, 0x0d1118, 0.94);
        bg.setStrokeStyle(2, 0x8a6a2a, 0.75);
        this.infoPanel.add(bg);

        this.infoName = this.add.text(0, -18, '点选棋盘上的角色或道具', {
            fontFamily: 'Arial Black', fontSize: '18px', color: '#ffffff', stroke: '#000000', strokeThickness: 3, align: 'center'
        }).setOrigin(0.5);
        
        this.infoDesc = this.add.text(0, 14, '查看技能，或把背包道具拖到棋盘上', {
            fontFamily: 'Arial', fontSize: '15px', color: '#dddddd', wordWrap: { width: panelW - 40 }, stroke: '#000000', strokeThickness: 2, align: 'center'
        }).setOrigin(0.5);

        this.infoPanel.add([this.infoName, this.infoDesc]);

        this.infoActionBtn = this.add.container(panelW / 2 - 70, 0);
        this.infoActionBtn.setVisible(false);
        
        this.infoActionBg = this.add.rectangle(0, 0, 112, 44, 0x111111, 0.9) as any;
        this.infoActionBg.setStrokeStyle(2, 0xffd700);
        
        this.infoActionText = this.add.text(0, 0, '技能', { 
            fontFamily: 'Arial Black', fontSize: '18px', color: '#ffd700' 
        }).setOrigin(0.5);
        
        this.infoActionBtn.add([this.infoActionBg, this.infoActionText]);
        this.infoActionBg.setInteractive({ useHandCursor: true })
            .on('pointerdown', () => {
                this.useSkill();
            });

        this.infoPanel.add(this.infoActionBtn);
    }

    private useSkill() {
        const tile = this.grid.getSelectedTile();
        if (!tile) return;

        if (tile.item) {
            this.cancelSkillAim();
            this.useItemSkill(tile);
            return;
        }

        if (!tile.character || tile.skillUsed) return;

        const preview = this.grid.inspectSkill(tile);
        if (!preview.canExecute) {
            this.cancelSkillAim();
            this.showToast(preview.failReason || '现在无法释放');
            return;
        }

        if (preview.needsAim) {
            if (this.skillAimActive && this.pendingSkillTile === tile) {
                this.confirmSkillAim();
                return;
            }
            this.enterSkillAim(tile);
            return;
        }

        this.cancelSkillAim();
        this.executeCharacterSkill(tile);
    }

    private useItemSkill(tile: Tile) {
        if (!tile.item) return;
        this.grid.usePlacedItem(tile);
        this.updateInfoPanel(null);
    }

    private enterSkillAim(tile: Tile) {
        this.cancelSkillAim();
        this.skillAimActive = true;
        this.pendingSkillTile = tile;
        this.skillAimCell = { r: tile.row, c: tile.col };
        this.grid.setSkillAimCell(this.skillAimCell);
        this.infoActionText.setText('释放');
        this.renderSkillAimHighlights(tile);
        this.infoDesc.setText('点棋盘格子改 3×3 落点，再点「释放」');
        this.fitInfoDesc();
    }

    public retargetSkillAim(r: number, c: number) {
        if (!this.skillAimActive || !this.pendingSkillTile) return;
        this.skillAimCell = { r, c };
        this.grid.setSkillAimCell(this.skillAimCell);
        this.grid.selectTile(this.pendingSkillTile);
        this.renderSkillAimHighlights(this.pendingSkillTile);
        const preview = this.grid.inspectSkill(this.pendingSkillTile);
        this.infoDesc.setText(preview.canExecute
            ? `落点 ${r + 1}行 ${c + 1}列，再点「释放」`
            : (preview.failReason || '这个落点放不出，换一格'));
        this.fitInfoDesc();
    }

    private cancelSkillAim() {
        this.skillAimActive = false;
        this.pendingSkillTile = null;
        this.skillAimCell = null;
        this.grid?.setSkillAimCell(null);
        this.skillAimGraphics?.destroy();
        this.skillAimGraphics = null;
        if (this.infoActionText) this.infoActionText.setText('技能');
    }

    private confirmSkillAim() {
        const tile = this.pendingSkillTile;
        const aim = this.skillAimCell;
        this.skillAimActive = false;
        this.pendingSkillTile = null;
        this.skillAimGraphics?.destroy();
        this.skillAimGraphics = null;
        if (this.infoActionText) this.infoActionText.setText('技能');
        this.grid.setSkillAimCell(aim);
        if (tile) this.executeCharacterSkill(tile);
    }

    private renderSkillAimHighlights(tile: Tile) {
        this.skillAimGraphics?.destroy();
        this.skillAimGraphics = this.add.graphics().setDepth(780);
        const cells = this.grid.getSkillHighlightCells(tile);
        const size = this.grid.getTileSize();
        cells.forEach(({ r, c, color, alpha }) => {
            const px = this.grid.getPixel(r, c);
            this.skillAimGraphics!.fillStyle(color, alpha ?? 0.35);
            this.skillAimGraphics!.fillRect(px.x - size / 2, px.y - size / 2, size, size);
        });
        const aim = this.skillAimCell || { r: tile.row, c: tile.col };
        const center = this.grid.getPixel(aim.r, aim.c);
        this.skillAimGraphics!.lineStyle(3, 0xffe14a, 1);
        this.skillAimGraphics!.strokeRect(center.x - size / 2 + 3, center.y - size / 2 + 3, size - 6, size - 6);
    }

    private executeCharacterSkill(tile: Tile) {
        if (!tile?.character) return;
        if (this.setpiecePlaying) {
            this.showToast('演出还没结束');
            return;
        }
        if (this.isShowingUnlock) {
            this.showToast('先关掉弹窗再放技能');
            return;
        }

        const preview = this.grid.inspectSkill(tile);
        if (!preview.canExecute) {
            this.showToast(preview.failReason || '现在无法释放');
            this.grid.setSkillAimCell(null);
            return;
        }

        if (preview.setpiece) {
            this.setpiecePlaying = true;
            this.grid.setSkillLock(true);
            this.infoPanel?.setVisible(false);
            this.gameFeel.playSetpiece(preview.setpiece, () => {
                this.finishCharacterSkill(tile);
            }).catch((err: unknown) => {
                console.error(err);
                this.finishCharacterSkill(tile);
            }).finally(() => {
                this.setpiecePlaying = false;
                this.grid.setSkillLock(false);
                this.grid.setSkillAimCell(null);
                this.infoPanel?.setVisible(true);
                if (this.pendingLevel101Choice) this.maybeShowLevel101Choice();
                else this.processUnlockQueue();
            });
            return;
        }

        const quip = tile.character ? SKILL_QUIPS[tile.character.id] : undefined;
        if (quip && tile.character) {
            this.setpiecePlaying = true;
            this.grid.setSkillLock(true);
            this.gameFeel.playQuip(tile.character.name, quip, tile.character.id, () => {
                this.finishCharacterSkill(tile);
            }).catch((err: unknown) => {
                console.error(err);
                if (tile.character && !tile.skillUsed) this.finishCharacterSkill(tile);
            }).finally(() => {
                this.setpiecePlaying = false;
                this.grid.setSkillLock(false);
                this.grid.setSkillAimCell(null);
            });
            return;
        }

        this.finishCharacterSkill(tile);
        this.grid.setSkillAimCell(null);
    }

    private finishCharacterSkill(tile: Tile) {
        if (!tile.character) return;
        const result = this.grid.executeSkill(tile);
        this.applySkillResult(tile, result);
        if (result.consumed) {
            this.recordCharacterTags(tile.character, 2);
            const skillReward = this.chapterTracker.onSkillUse();
            if (skillReward) this.grantObjectiveReward(skillReward);
        }
        if (result.boardChanged) {
            this.bossManager?.sanitizeOccupancy?.();
            this.grid.packAfterExternalEffects();
        }
        this.updateInfoPanel(tile.toBeDestroyed || !tile.active ? null : tile);
    }

    private applySkillResult(tile: Tile, result: SkillResult) {
        for (const effect of result.sideEffects) {
            if (effect.kind === 'gold') this.addGold(effect.amount);
            if (effect.kind === 'gold_half_cost') this.addGold(-Math.floor(this.runGold * 0.5));
            if (effect.kind === 'gold_double') this.addGold(this.runGold);
            if (effect.kind === 'spawn_shop_item') {
                const items = ((this.cache.json.get('items') as Item[]) || []).filter(i => i.price > 0);
                const randomItem = Phaser.Utils.Array.GetRandom(items);
                if (randomItem && this.grid.spawnItem(randomItem)) {
                    result.toast = `神笔绘出：${randomItem.name}`;
                }
            }
            if (effect.kind === 'level101_choice' && !this.level101ChoiceResolved) {
                this.pendingLevel101Choice = true;
            }
        }

        const activeBoss = this.bossManager?.getActiveBoss?.();
        for (const action of result.bossActions) {
            if (action.kind === 'damage') {
                if (action.weakness && activeBoss) {
                    activeBoss.say(activeBoss.bossData.dialogue.weakness_hit);
                }
                this.bossManager?.takeDamage(action.amount);
            } else if (action.kind === 'freeze') {
                this.bossManager?.freeze(action.turns);
            } else if (action.kind === 'clear_effect') {
                this.grid.clearBossEffects(action.effectType);
                result.boardChanged = true;
            } else if (action.kind === 'break_invincible') {
                activeBoss?.setInvincible(false);
            } else if (action.kind === 'unfreeze_all') {
                this.grid.unfreezeAll();
                result.boardChanged = true;
            } else if (action.kind === 'cancel_telegraph') {
                this.bossManager?.cancelTelegraph?.();
            }
        }

        if (result.toast) this.showToast(result.toast);
        if (result.playAnim && tile.character && !tile.toBeDestroyed) {
            this.playActionAnimation(tile.x, tile.y, tile.character.id);
        }
        if (result.playSkillSound) this.audioManager.play('skill');
    }

    private updateInfoPanel(tile: Tile | null) {
        if (!this.infoName || !this.infoDesc || !this.infoActionBtn) return;
        if (this.skillAimActive) {
            if (this.pendingSkillTile) {
                this.grid.selectTile(this.pendingSkillTile);
                return;
            }
            this.cancelSkillAim();
        }
        if (!tile || (!tile.character && !tile.item)) {
            const activeBoss = this.bossManager?.getActiveBoss?.();
            if (activeBoss) {
                this.showBossInfo(activeBoss);
                return;
            }
            const harmony = this.grid?.getHarmonySnapshot?.();
            if (this.harmonyChallengeAccepted && harmony && harmony.phase === 'harmony') {
                this.infoName.setText('大和谐仪轨');
                this.infoDesc.setText(`101×${harmony.level101Count}/2 · 高阶 ${Math.round(harmony.highTierRatio * 100)}% · 稳定 ${harmony.stableMoves}/3`);
                this.fitInfoDesc();
                this.infoName.setOrigin(0, 0);
                this.infoName.setPosition(-this.layout.contentWidth / 2 + 18, -22);
                this.infoDesc.setOrigin(0, 0);
                this.infoDesc.setPosition(-this.layout.contentWidth / 2 + 18, 4);
                this.infoActionBtn.setVisible(false);
                return;
            }
            this.infoName.setText('点选一只马，看下一只在哪');
            this.infoDesc.setText(this.boardMergeCoach());
            this.infoName.setOrigin(0.5);
            this.infoName.setPosition(0, -16);
            this.infoDesc.setOrigin(0.5);
            this.infoDesc.setPosition(0, 12);
            this.infoActionBtn.setVisible(false);
            this.fitInfoDesc();
            return;
        }
        
        // Reset alignment for specific info (text shifted down 5px)
        this.infoName.setOrigin(0, 0);
        this.infoName.setPosition(-this.layout.contentWidth / 2 + 18, -22);
        this.infoDesc.setOrigin(0, 0);
        this.infoDesc.setPosition(-this.layout.contentWidth / 2 + 18, 4);

        if (tile.character) {
            const char = tile.character;
            this.infoName.setText(`${char.name} Lv.${char.level}`);
            const skillText = char.skill?.name
                ? `【${char.skill.name}】${char.skill.description || ''}`
                : (char.description || char.background || '暂无描述');
            this.infoDesc.setText(`${this.tileMergeCoach(tile)} ${skillText}`);
            
            // Check if character has active skill
            this.infoActionBtn.setVisible(true); 
            
            if (tile.skillUsed) {
                this.infoActionBg.setFillStyle(0x333333);
                this.infoActionBg.setStrokeStyle(2, 0x666666);
                this.infoActionText.setColor('#888888');
                this.infoActionText.setText("已使用");
                this.infoActionBg.disableInteractive();
            } else {
                this.infoActionBg.setFillStyle(0x111111);
                this.infoActionBg.setStrokeStyle(2, 0xffd700);
                this.infoActionText.setColor('#ffd700');
                this.infoActionText.setText(char.skill?.name || '技能');
                this.infoActionBg.setInteractive({ useHandCursor: true });
            }
            this.fitInfoDesc();

        } else if (tile.item) {
            const item = tile.item;
            this.infoName.setText(item.name);
            this.infoDesc.setText(item.description || '');
            this.infoActionBtn.setVisible(true);
            if (['item_cannon', 'item_tiger', 'item_deer_sign', 'item_brush', 'item_plum', 'item_whisk'].includes(item.id)) {
                this.infoActionBg.setFillStyle(0x111111);
                this.infoActionBg.setStrokeStyle(2, 0x00ffff);
                this.infoActionText.setColor('#00ffff');
                this.infoActionText.setText("使用");
                this.infoActionBg.setInteractive({ useHandCursor: true });
            } else {
                this.infoActionBg.setFillStyle(0x333333);
                this.infoActionBg.setStrokeStyle(2, 0x666666);
                this.infoActionText.setColor('#888888');
                this.infoActionText.setText("被动");
                this.infoActionBg.disableInteractive();
            }
            this.fitInfoDesc();
        }
    }

    private boardMergeCoach(): string {
        if (!this.grid) return '角标颜色分等级。点选后，棋盘上标「下一」的才是升级目标。';
        const pairs = this.grid.getPairCensus();
        const census = pairs.length
            ? `可合 ${pairs.map(p => `${p.level}级×${p.count}`).join(' · ')}`
            : '还没有同级对';
        return `${census}。点选后看棋盘上的「下一」，那是会合进去的等级。`;
    }

    private tileMergeCoach(tile: Tile): string {
        const lv = tile.character?.level;
        if (lv == null) return '';
        const next = this.grid.previewNextCharacter(lv);
        const onBoard = next ? this.grid.countLevel(next.level) : 0;
        if (!next) return '已经到终章。';
        if (onBoard > 0) return `棋盘「下一」= ${next.level} ${next.name} ×${onBoard}。`;
        return `下一只是 ${next.level} ${next.name}，盘上还没有。`;
    }

    update() {
        if (this.isShowingUnlock) {
            if (this.giveUpBtn) this.giveUpBtn.setVisible(false);
            return;
        }
        if (!this.gameOverTriggered && this.grid.isFull() && !this.grid.canMove()) {
            if (!this.deadlockHighlightDone) {
                this.deadlockHighlightDone = true;
                this.grid.getAllTiles().forEach(t => {
                    this.tweens.add({ targets: t, alpha: 0.45, yoyo: true, repeat: 2, duration: 250 });
                });
                this.time.delayedCall(Number(this.balanceConfig.tension?.deadlockHighlightMs ?? 1500), () => {
                    this.finalizeDeadlockCheck();
                });
                return;
            }
            this.finalizeDeadlockCheck();
        } else {
            this.deadlockHighlightDone = false;
            if (this.giveUpBtn) this.giveUpBtn.setVisible(false);
            this.lifesaverToastShown = false;
        }
        this.updatePressureBar();
        this.updateRouteBars();
    }

    private finalizeDeadlockCheck() {
        if (this.gameOverTriggered || !this.grid.isFull() || this.grid.canMove()) return;
            if (this.grid.hasLifesaverSkills()) {
                if (!this.lifesaverToastShown) {
                    this.showToast('还能翻');
                    this.lifesaverToastShown = true;
                    this.fillPressureBar();
                    void this.audioManager.playBgm('nearDeath');

                    if (!this.giveUpBtn) {
                        const giveUpY = this.layout.gridCenterY + this.layout.gridWidth / 2 - 40;
                        this.giveUpBtn = this.add.container(360, giveUpY);
                        const bg = this.add.rectangle(0, 0, 280, 60, 0xcc0000).setInteractive({ useHandCursor: true });
                        bg.setStrokeStyle(4, 0xffffff);
                        const txt = this.add.text(0, 0, deadlockGiveUpSnippet(this.grid.getBestCharacter()), {
                            fontFamily: 'Arial Black', fontSize: 20, color: '#ffffff',
                            wordWrap: { width: 260, useAdvancedWrap: true }, align: 'center'
                        }).setOrigin(0.5);
                        this.giveUpBtn.add([bg, txt]);
                        this.giveUpBtn.setDepth(2000);
                        
                        bg.on('pointerdown', () => {
                            this.triggerGameOver();
                        });
                    }
                    this.giveUpBtn.setVisible(true);

                    this.time.delayedCall(3000, () => {
                        this.lifesaverToastShown = false;
                    });
                }
            } else {
                this.triggerGameOver();
            }
    }

    private triggerGameOver(forcedType?: EndingType, endingChar?: Character | null, harmonySnapshot?: HarmonySnapshot) {
        if (this.gameOverTriggered) return;
        this.gameOverTriggered = true;
        RunStateManager.clear(persistSlotForMode(this.runMode));
        if (this.giveUpBtn) this.giveUpBtn.setVisible(false);
        const best = this.grid.getBestCharacter();
        const endingType = forcedType || (this.grid.getMaxLevel() >= 101 ? 'normalEnding' : 'deadlockEnding');
        if (endingType === 'trueEnding') void this.audioManager.playBgm('trueEnding');
        const report = this.buildEndingReport(endingType, best, endingChar || null, harmonySnapshot);

        const ratio = Number(this.balanceConfig.runGoldToScoreRatio ?? 10);
        this.score += Math.floor(this.runGold / ratio);
        report.score = this.score;
        if (!usesDailyWallet(this.runMode)) {
            const legacyReward = this.balanceConfig.legacyGoldRewards?.[endingType] ?? 100;
            this.saveManager.addLegacyGold(legacyReward);
        } else {
            this.saveManager.setDailyGold(this.dailySeed || localDateKey(), this.runGold);
        }
        if (this.dailySeed) {
            this.saveManager.setDailyBest(this.dailySeed, this.score);
        }

        this.audioManager.play(endingType === 'trueEnding' ? 'true_ending' : 'gameover');
        this.audioManager.stopBgm();
        this.time.delayedCall(1000, () => {
            this.scene.start('GameOver', { bestChar: best, score: this.score, report });
        });
    }

    private recordCharacterTags(char: Character | null, weight: number = 1) {
        if (!char) return;
        const profile = resolveSkillProfile(char);
        profile.tags.forEach(tag => {
            this.tagCounts[tag] = (this.tagCounts[tag] || 0) + weight;
        });
        this.recordEndingStyles(char, profile.tags, weight);
    }

    private recordEndingStyles(char: Character, tags: string[], weight: number) {
        const add = (style: EndingRouteStyle, amount: number) => {
            this.endingStyleScores[style] += amount;
        };

        if (char.faction === 'A') add('ancientClassic', weight * 1.6);
        if (char.faction === 'B') {
            add('animeMania', weight * 1.3);
            add('cyberSciFi', weight * 0.9);
        }
        if (char.faction === 'C') {
            add('animeMania', weight * 0.9);
            add('cyberSciFi', weight * 0.5);
        }
        if (char.faction === 'D') {
            add('mythLegend', weight * 1.7);
            add('ancientClassic', weight * 0.4);
        }

        if (tags.includes('machine')) {
            add('cyberSciFi', weight * 2.2);
            add('animeMania', weight * 0.8);
        }
        if (tags.includes('wealth')) add('cyberSciFi', weight * 1.5);
        if (tags.includes('strike')) add('ancientClassic', weight * 1.5);
        if (tags.includes('chaos')) add('animeMania', weight * 1.6);
        if (tags.includes('myth')) add('mythLegend', weight * 2.1);
        if (tags.includes('purify')) {
            add('mythLegend', weight * 1.1);
            add('ancientClassic', weight * 0.5);
        }
        if (tags.includes('control')) add('ancientClassic', weight * 0.9);
        if (tags.includes('harmony')) {
            add('mythLegend', weight * 1.0);
            add('cyberSciFi', weight * 0.8);
            add('animeMania', weight * 0.6);
            add('ancientClassic', weight * 0.6);
        }

        if (char.level >= 91) add('mythLegend', weight * 0.8);
        if (char.level >= 95) {
            add('cyberSciFi', weight * 0.6);
            add('ancientClassic', weight * 0.4);
        }

        ENDING_STYLE_ORDER.forEach(style => {
            if (ENDING_STYLE_ID_BOOSTS[style].includes(char.id)) {
                add(style, weight * 2.4);
            }
        });
    }

    private buildRouteScoreSummary(scores: Record<EndingRouteStyle, number>): string[] {
        return ENDING_STYLE_ORDER
            .slice()
            .sort((a, b) => scores[b] - scores[a])
            .map(style => `${ENDING_STYLE_META[style].label} ${scores[style].toFixed(1)}`);
    }

    private evaluateEndingRoute(
        endingType: EndingType,
        finalChar: Character | null,
        harmony: HarmonySnapshot,
        dominantTag: string
    ): { style?: EndingRouteStyle; scoreSummary?: string[] } {
        if (endingType === 'deadlockEnding') return {};

        const scores = { ...this.endingStyleScores };
        const add = (style: EndingRouteStyle, amount: number) => {
            scores[style] += amount;
        };

        switch (dominantTag) {
            case 'machine':
            case 'wealth':
                add('cyberSciFi', 5);
                break;
            case 'strike':
            case 'control':
                add('ancientClassic', 4);
                break;
            case 'chaos':
            case 'mystery':
                add('animeMania', 4);
                break;
            case 'myth':
            case 'purify':
            case 'harmony':
                add('mythLegend', 5);
                break;
        }

        if (harmony.highTierRatio >= 0.45) {
            add('cyberSciFi', 2);
            add('mythLegend', 2);
        }
        if (harmony.stableMoves >= 4) {
            add('ancientClassic', 2);
            add('mythLegend', 1);
        }
        if (harmony.level101Count >= 3) {
            add('animeMania', 1.5);
            add('mythLegend', 1.5);
        }
        if (harmony.lowLevelPollution <= 1) {
            add('ancientClassic', 1.5);
            add('mythLegend', 1.5);
        }
        if (this.bossDefeatedCount >= 4) {
            add('ancientClassic', 1.5);
            add('cyberSciFi', 1.5);
        }
        if (this.mergeMoveCount >= 80) add('ancientClassic', 1.2);
        if (this.highestLevelReached >= 101) {
            add('cyberSciFi', 0.8);
            add('mythLegend', 0.8);
        }

        if (finalChar) {
            ENDING_STYLE_ORDER.forEach(style => {
                if (ENDING_STYLE_ID_BOOSTS[style].includes(finalChar.id)) {
                    add(style, 4);
                }
            });
        }

        if (this.routeLock) {
            add(this.routeLock, Number(this.balanceConfig.modes?.routeLockBonus ?? 12));
        }

        const style = ENDING_STYLE_ORDER
            .slice()
            .sort((a, b) => scores[b] - scores[a])[0];

        return {
            style,
            scoreSummary: this.buildRouteScoreSummary(scores)
        };
    }

    private buildEndingRouteReasons(
        routeStyle: EndingRouteStyle,
        dominantTagLabel: string,
        harmony: HarmonySnapshot,
        finalChar: Character | null
    ): string[] {
        const reasons: string[] = [];
        const finalName = finalChar?.name || '终章主角';

        switch (routeStyle) {
            case 'cyberSciFi':
                reasons.push(`你的命运主调落在「${dominantTagLabel}」，机械、财富和高阶推进把 ${finalName} 推成了星港主角。`);
                reasons.push(`高阶占比 ${Math.round(harmony.highTierRatio * 100)}%，终章事件 ${harmony.endgameEventCount} 次，这一局更像一路超频到尽头。`);
                break;
            case 'ancientClassic':
                reasons.push(`你的路线更偏「${dominantTagLabel}」与稳扎稳打，像一幅从棋盘上慢慢铺开的群英长卷。`);
                reasons.push(`共鸣稳定 ${harmony.stableMoves}/3、低阶杂质 ${harmony.lowLevelPollution}，这局的收束气口非常讲究章法。`);
                break;
            case 'animeMania':
                reasons.push(`你的路线更偏「${dominantTagLabel}」与跨棚联动感，最后是靠名场面和热血感把 ${finalName} 顶上去的。`);
                reasons.push(`双星数量 ${harmony.level101Count}、关键合成 ${this.mergeMoveCount} 次，这局终章明显带着片尾大合照的气质。`);
                break;
            case 'mythLegend':
                reasons.push(`你的命运主调落在「${dominantTagLabel}」，祥瑞、神性与终章秩序共同把 ${finalName} 推成了诸天主角。`);
                reasons.push(`共鸣稳定 ${harmony.stableMoves}/3，高阶占比 ${Math.round(harmony.highTierRatio * 100)}%，这一局更像诸神会盟后的封卷。`);
                break;
        }

        return reasons;
    }

    private buildEndingReport(
        endingType: EndingType,
        bestChar: Character | null,
        endingChar: Character | null,
        harmonySnapshot?: HarmonySnapshot
    ): EndingReport {
        let finalChar = endingChar || bestChar;
        const harmony = harmonySnapshot || this.grid.getHarmonySnapshot();
        const rankedTags = Object.entries(this.tagCounts).sort((a, b) => b[1] - a[1]);
        const dominantTag = rankedTags[0]?.[0] || resolveSkillProfile(finalChar).tags[0] || 'myth';
        const dominantTagLabel = getDominantTagLabel(dominantTag);
        const routeResult = this.evaluateEndingRoute(endingType, finalChar, harmony, dominantTag);
        const routeStyle = routeResult.style;
        const routeMeta = routeStyle ? ENDING_STYLE_META[routeStyle] : null;
        if (endingType === 'trueEnding' && routeStyle) {
            finalChar = this.getRouteEndingCharacter(routeStyle) || finalChar;
        }
        const routeReasons = routeStyle ? this.buildEndingRouteReasons(routeStyle, dominantTagLabel, harmony, finalChar) : undefined;
        const fortune = buildFortuneLines({
            bestChar,
            endingType,
            routeStyle,
            foundHiddenRecipe: this.foundHiddenRecipeThisRun,
            dailySeed: this.dailySeed || undefined,
            score: this.score,
            moveCount: this.mergeMoveCount,
            boleNames: this.boleCharIds.map(id => {
                const roster: Character[] = this.cache.json.get('characters') || [];
                return roster.find(c => c.id === id)?.name || id;
            }),
            guestName: this.guestId
                ? ((this.cache.json.get('characters') as Character[]) || []).find(c => c.id === this.guestId)?.name
                : undefined
        });
        const titleMap: Record<EndingType, string> = {
            deadlockEnding: `${bestChar?.name || '这匹马'}的丧签`,
            normalEnding: '星穹封卷',
            trueEnding: '双马同谐'
        };

        const storyLines = endingType === 'trueEnding' && routeMeta
            ? [
                `这一局完成 ${this.mergeMoveCount} 次关键合成，击退 ${this.bossDefeatedCount} 位首领。`,
                routeMeta.summary,
                routeReasons?.[0] || `终章收在「${routeMeta.label}」。`
            ]
            : endingType === 'normalEnding' && routeMeta
                ? [
                    `这一局完成 ${this.mergeMoveCount} 次关键合成，击退 ${this.bossDefeatedCount} 位首领。`,
                    routeMeta.summary,
                    routeReasons?.[0] || `主调「${dominantTagLabel}」，收束在「${routeMeta.label}」，与 ${finalChar?.name || '命定之马'} 一并封卷。`
                ]
                : [
                    `这一局完成 ${this.mergeMoveCount} 次关键合成，击退 ${this.bossDefeatedCount} 位首领。`,
                    `主调「${dominantTagLabel}」，最高抵达 Lv.${this.highestLevelReached}。`,
                    `最终与 ${finalChar?.name || '命定之马'} 停在星穹边缘，把这一局写进命书。`
                ];

        return {
            endingType,
            score: this.score,
            bestChar,
            endingChar: finalChar,
            phase: this.grid.getEndgamePhase(),
            bossDefeated: this.bossDefeatedCount,
            moveCount: this.mergeMoveCount,
            highestLevelReached: this.highestLevelReached,
            dominantTag,
            dominantTagLabel,
            routeStyle,
            routeLabel: routeMeta?.label,
            routeSubtitle: routeMeta?.subtitle,
            routeReasons,
            routeScoreSummary: routeResult.scoreSummary,
            storyTitle: routeMeta?.title || titleMap[endingType],
            storyLines,
            blessing: finalChar?.greeting || "马年大吉，万事如意！",
            harmony,
            chapterObjectivesDone: this.chapterTracker.getCompletedCount(),
            chapterObjectivesTotal: this.chapterTracker.getTotalCount(),
            dailySeed: this.dailySeed || undefined,
            fortuneLines: fortune.lines,
            fortuneTone: fortune.tone,
            mode: this.runMode,
            guestName: this.guestId
                ? ((this.cache.json.get('characters') as Character[]) || []).find(c => c.id === this.guestId)?.name
                : undefined,
            boleNames: this.boleCharIds.map(id => {
                const roster: Character[] = this.cache.json.get('characters') || [];
                return roster.find(c => c.id === id)?.name || id;
            })
        };
    }

    private addScore(amount: number) {
        this.score += amount;
        this.scoreText.setText(`${this.score}`);
    }

    private addGold(amount: number) {
        const cap = Number(this.balanceConfig.runGoldCap ?? 5000);
        this.runGold = Math.max(0, Math.min(cap, this.runGold + amount));
        this.goldText?.setText(`${this.runGold}`);
        if (usesDailyWallet(this.runMode)) {
            this.saveManager.setDailyGold(this.dailySeed || localDateKey(), this.runGold);
        }
    }

    private addInventoryItem(item: Item) {
        if (this.inventory.length >= 3) {
            if (item.id === 'item_gold_ingot') {
                this.cashGoldIngot();
                return;
            }
            const sell = Math.max(50, Math.floor((item.price || 100) * 0.5));
            this.addGold(sell);
            this.showToast(`背包已满，${item.name}折算为 ${sell}G`);
            return;
        }
        this.inventory.push(item);
        this.updateInventoryUI();
        this.showToast(`获得道具：${item.name}`);
    }

    private cashGoldIngot() {
        const reward = (this.balanceConfig.boss?.goldIngotBase ?? 500) as number
            + this.bossDefeatedCount * ((this.balanceConfig.boss?.goldIngotPerBossIndex ?? 100) as number);
        this.addGold(reward);
        this.showToast(`金元宝兑现：+${reward}G`);
        this.audioManager.play('unlock');
    }

    private grantBossExclusiveDrop(bossId: string, items: Item[]) {
        if (bossId === 'fire_monkey') {
            const monkey = items.find(i => i.id === 'item_monkey');
            if (monkey) this.addInventoryItem(monkey);
        } else {
            const ingot = items.find(i => i.id === 'item_gold_ingot');
            if (ingot) this.addInventoryItem(ingot);
        }
    }

    private activateInventoryItem(item: Item): boolean {
        if (item.id === 'item_gold_ingot') {
            this.cashGoldIngot();
            return true;
        }
        if (item.id === 'item_whisk') {
            this.grid.smartShuffle();
            this.showToast('马尾拂尘：棋盘已重排');
            return true;
        }
        if (item.id === 'item_plum') {
            this.grid.clearAllNegativeEffects();
            this.showToast('青梅煮酒：全场净化');
            return true;
        }
        if (item.id === 'item_tiger') {
            return this.grid.applyTigerEffect();
        }
        return false;
    }

    private persistRunState() {
        if (this.gameOverTriggered) return;
        const runtime = this.grid.exportRuntimeState();
        const preview = this.grid.getNextSpawnPreview();
        RunStateManager.save(buildRunSnapshot({
            score: this.score,
            runGold: this.runGold,
            inventory: this.inventory,
            grid: this.grid,
            bossManager: this.bossManager,
            meta: {
                harmonyChallengeAccepted: this.harmonyChallengeAccepted,
                harmonyStableMoves: runtime.harmonyStableMoves,
                endgameEventCount: runtime.endgameEventCount,
                harmonyAchieved: runtime.harmonyAchieved,
                mergeMoveCount: this.mergeMoveCount,
                bossDefeatedCount: this.bossDefeatedCount,
                highestLevelReached: this.highestLevelReached,
                tagCounts: this.tagCounts,
                endingStyleScores: this.endingStyleScores,
                pendingLevel101Choice: this.pendingLevel101Choice,
                level101ChoiceResolved: this.level101ChoiceResolved,
                chapterObjectivesDone: this.chapterTracker.getDoneIds(),
                criticalPityCounter: runtime.criticalPityCounter,
                undoRemaining: this.undoRemaining,
                dailyChallenge: !!this.dailySeed,
                mode: this.runMode,
                dailySeed: this.dailySeed || undefined,
                guestId: this.guestId,
                routeLock: this.routeLock,
                sprintMovesLeft: this.sprintMovesLeft,
                pairTurnsRemaining: this.pairTurnsRemaining,
                chapterEventsFired: Array.from(this.chapterEventsFired),
                recipeHelpForced: this.grid.getRecipeHelpForced(),
                extraLowSpawns: this.grid.getExtraLowSpawns(),
                recipeHuntFound: this.recipeHuntFound,
                boleCharIds: this.boleCharIds,
                nextSpawn: preview ? {
                    kind: preview.kind === 'item' ? 'item' : 'character',
                    charId: preview.char?.id,
                    itemId: preview.item?.id,
                    level: preview.level
                } : undefined
            }
        }));
    }

    private refreshCharacterTextures() {
        this.grid?.getAllTiles().forEach(tile => tile.refreshSprite());
        this.refreshNextPreview();
    }

    private refreshNextPreview() {
        if (!this.nextPreviewBox) return;
        if (this.nextPreviewIcon) {
            this.nextPreviewIcon.destroy();
            this.nextPreviewIcon = null;
        }
        const preview = this.grid?.getNextSpawnPreview?.();
        if (!preview) return;
        if (preview.kind === 'item' && preview.item) {
            if (this.textures.exists(preview.item.id)) {
                this.nextPreviewIcon = this.add.image(this.layout.nextPreviewX, this.layout.headerCenterY + 8, preview.item.id).setDisplaySize(36, 36).setDepth(31);
            } else {
                this.nextPreviewIcon = this.add.text(this.layout.nextPreviewX, this.layout.headerCenterY + 8, preview.item.icon || '道', { fontSize: '20px' }).setOrigin(0.5).setDepth(31);
            }
        } else if (preview.char) {
            const key = this.textures.exists(preview.char.id) ? preview.char.id : null;
            if (key) {
                this.nextPreviewIcon = this.add.image(this.layout.nextPreviewX, this.layout.headerCenterY + 8, key).setDisplaySize(36, 36).setDepth(31);
            } else {
                this.nextPreviewIcon = this.add.text(this.layout.nextPreviewX, this.layout.headerCenterY + 8, `${preview.char.level}`, { fontSize: '16px' }).setOrigin(0.5).setDepth(31);
                CharacterAssetLoader.ensureCharacter(this, preview.char, () => this.refreshNextPreview());
            }
        }
    }

    private createShop() {
        this.shopPanel?.destroy(true);
        const allItems: Item[] = (this.cache.json.get('items') as Item[]).filter(item => item.price > 0);
        const chapter = this.getChapterIndexForLevel(this.grid?.getMaxLevel?.() || 1);
        const slotCount = Number(this.balanceConfig.shopDaily?.slotCount ?? 4);
        const items = rotateShopItems(allItems, chapter, this.dailySeed || this.runMode, slotCount);
        this.shopPanel = createShopPanel(
            this,
            this.layout.shopCenterY,
            items,
            (item) => this.buyItem(item),
            (item) => this.getShopPrice(item),
            this.layout.contentWidth,
            this.layout.shopH
        );
        this.lastShopChapter = this.getChapterIndexForLevel(this.grid?.getMaxLevel?.() || 1);
    }

    private refreshShopIfNeeded() {
        if (!this.grid) return;
        const chapter = this.getChapterIndexForLevel(this.grid.getMaxLevel());
        if (chapter === this.lastShopChapter && this.shopPanel) return;
        this.createShop();
    }

    private getShopPrice(item: Item) {
        const chapterIndex = this.getChapterIndexForLevel(this.grid.getMaxLevel());
        const multiplier = 1 + chapterIndex * Number(this.balanceConfig.economy?.shopTierPriceMultiplier ?? 0.3);
        return Math.floor(item.price * multiplier);
    }

    private buyItem(item: Item) {
        const price = this.getShopPrice(item);
        if (this.runGold >= price) {
            if (this.inventory.length < 3) {
                this.addGold(-price);
                this.inventory.push(item);
                this.updateInventoryUI();
                this.showToast(`已购买 ${item.name}（${price}G）`);
                this.audioManager.play('click');
            } else {
                this.showToast('背包已满！');
            }
        } else {
            this.showToast('金币不足！');
        }
    }

    private getChapterIndexForLevel(level: number): number {
        if (level >= 91) return 4;
        if (level >= 76) return 3;
        if (level >= 46) return 2;
        if (level >= 16) return 1;
        return 0;
    }

    private createInventory() {
        // Row 1: above InfoPanel (shows when nothing selected)
        this.inventoryContainer = this.add.container(360, this.layout.inventoryCenterY);
        this.updateInventoryUI();
    }

    private updateInventoryUI() {
        if (!this.inventoryContainer) return;
        renderInventoryPanel(
            this,
            this.inventoryContainer,
            this.inventory,
            this.grid,
            () => this.updateInventoryUI(),
            (item) => this.activateInventoryItem(item),
            this.layout.contentWidth,
            this.layout.inventoryH
        );
    }

    private restoreRun(snapshot: RunStateSnapshot) {
        this.score = snapshot.score;
        this.runGold = snapshot.runGold;
        this.mergeMoveCount = snapshot.mergeMoveCount;
        this.bossDefeatedCount = snapshot.bossDefeatedCount;
        this.highestLevelReached = snapshot.highestLevelReached;
        this.tagCounts = { ...snapshot.tagCounts };
        this.endingStyleScores = { ...this.createEmptyEndingStyleScores(), ...snapshot.endingStyleScores };
        this.pendingLevel101Choice = snapshot.pendingLevel101Choice;
        this.level101ChoiceResolved = snapshot.level101ChoiceResolved;
        this.harmonyChallengeAccepted = snapshot.harmonyChallengeAccepted;
        this.undoRemaining = snapshot.undoRemaining ?? 1;
        this.runMode = snapshot.mode || (snapshot.dailySeed || snapshot.dailyChallenge ? 'daily' : 'standard');
        this.dailySeed = snapshot.dailySeed || this.dailySeed;
        this.guestId = snapshot.guestId || this.guestId;
        this.routeLock = snapshot.routeLock || this.routeLock;
        this.sprintMovesLeft = snapshot.sprintMovesLeft ?? this.sprintMovesLeft;
        this.pairTurnsRemaining = snapshot.pairTurnsRemaining ?? 0;
        this.chapterEventsFired = new Set(snapshot.chapterEventsFired || []);
        this.recipeHuntFound = snapshot.recipeHuntFound ?? 0;
        this.boleCharIds = snapshot.boleCharIds || [];
        if (snapshot.recipeHelpForced) this.grid.setRecipeHelpForced(snapshot.recipeHelpForced);
        if (snapshot.extraLowSpawns) this.grid.setExtraLowSpawns(snapshot.extraLowSpawns);
        this.chapterTracker = new ChapterTracker(
            this.cache.json.get('chapters') as ChapterDefinition[],
            snapshot.chapterObjectivesDone || []
        );
        this.grid.restoreBlocked(snapshot.blocked);
        this.grid.restoreFromSnapshot(snapshot.tiles);
        this.grid.applyRuntimeState(snapshot);
        this.grid.setNextSpawnFromSaved(snapshot.nextSpawn);
        this.grid.setHarmonyChallengeAccepted(snapshot.harmonyChallengeAccepted);
        if (snapshot.boss) {
            this.bossManager.restoreState({
                ...snapshot.boss,
                telegraphSkill: snapshot.boss.telegraphSkill
            });
        }
        this.bossManager.sanitizeOccupancy();
        const items: Item[] = this.cache.json.get('items');
        this.inventory = snapshot.inventory.map(id => findItemById(items, id)).filter((i): i is Item => !!i);
        this.scoreText?.setText(`${this.score}`);
        this.goldText?.setText(`${this.runGold}`);
        this.undoBtn?.setText(`悔棋 ${this.undoRemaining}`);
        this.updateInventoryUI();
        this.refreshProgressPanel();
        this.updateRouteBars();
        if (this.runMode === 'bossRush') {
            this.bossManager.setSpawnTurnsOverride(Number(this.balanceConfig.modes?.bossRushInterval ?? 12));
        }
        if (this.runMode === 'recipeHunt') {
            this.grid.setRecipeChanceOverride(Number(this.balanceConfig.modes?.recipeHuntSpawnChance ?? 0.45));
        }
        this.modeHudText?.setText(
            this.runMode === 'daily'
                ? `今日挑战 · ${this.dailySeed}`
                : this.runMode === 'sprint'
                    ? `三十步冲分 · 剩 ${this.sprintMovesLeft}`
                    : MODE_LABELS[this.runMode]
        );
    }

    private applyStartItems() {
        const items: Item[] = this.cache.json.get('items');
        for (const id of this.startItems) {
            const item = findItemById(items, id);
            if (item && this.inventory.length < 3) this.inventory.push(item);
        }
        this.updateInventoryUI();
    }

    private captureUndoSnapshot() {
        if (this.undoRemaining <= 0 || this.dailySeed) return;
        this.undoSnapshot = this.grid.exportUndoSnapshot();
        this.undoScore = this.score;
        this.undoGold = this.runGold;
        this.undoInventory = this.inventory.map(i => i.id);
    }

    private useUndo() {
        if (this.undoRemaining <= 0 || !this.undoSnapshot) {
            this.showToast('本局悔棋已用尽');
            return;
        }
        this.grid.restoreUndoSnapshot(this.undoSnapshot);
        this.bossManager.sanitizeOccupancy();
        this.score = this.undoScore;
        this.runGold = this.undoGold;
        const items: Item[] = this.cache.json.get('items') || [];
        this.inventory = this.undoInventory.map(id => findItemById(items, id)).filter((i): i is Item => !!i);
        this.scoreText.setText(`${this.score}`);
        this.goldText.setText(`${this.runGold}`);
        this.updateInventoryUI();
        this.undoRemaining--;
        this.undoSnapshot = null;
        this.undoBtn.setText(`悔棋 ${this.undoRemaining}`);
        if (this.undoRemaining <= 0) this.undoBtn.setColor('#888888');
        this.refreshNextPreview();
        this.showToast('时光倒流：盘面与金币已恢复');
    }

    private updatePressureBar() {
        if (!this.pressureBar || !this.grid) return;
        const rate = this.grid.getOccupancyRate();
        const warn = Number(this.balanceConfig.tension?.pressureBarThreshold ?? 0.7);
        const crit = Number(this.balanceConfig.tension?.pressureBarCritical ?? 0.85);
        this.pressureBar.clear();
        if (rate < warn) return;
        const color = rate >= crit ? 0xff4444 : 0xffcc00;
        const startX = this.grid.getStartX();
        const startY = this.grid.getStartY() - 8;
        const w = this.grid.getTileSize() * 6;
        this.pressureBar.fillStyle(color, rate >= crit ? 0.9 : 0.7);
        this.pressureBar.fillRect(startX, startY, w, 4);
        if (rate >= crit && this.criticalWarningsShown < Number(this.balanceConfig.tension?.criticalWarningMaxPerRun ?? 2)) {
            this.criticalWarningsShown++;
            this.showToast('盘面告急！');
        }
    }

    private getLeadingRoute(): EndingRouteStyle | null {
        let best: EndingRouteStyle | null = null;
        let bestScore = -1;
        for (const style of ENDING_STYLE_ORDER) {
            const score = this.endingStyleScores[style];
            if (score > bestScore) {
                bestScore = score;
                best = style;
            }
        }
        return bestScore > 0 ? best : null;
    }

    private maybeAnnounceRouteLead(char: Character) {
        const isHighTier = char.tier >= 4 || char.rarity === 'SSR' || char.rarity === 'Hidden';
        if (!isHighTier) return;
        if (!this.harmonyChallengeAccepted && this.grid.getMaxLevel() < 91) return;
        const lead = this.getLeadingRoute();
        if (!lead || lead === this.lastLeadingRoute) return;
        this.lastLeadingRoute = lead;
        this.showToast(`命运偏向了【${ENDING_STYLE_META[lead].label}】`);
    }

    private updateRouteBars() {
        if (!this.routeBars) return;
        this.routeBars.clear();
        const show = this.harmonyChallengeAccepted || this.grid.getMaxLevel() >= 91;
        this.leadingRouteLabel?.setVisible(show);
        this.routeLabelTexts.forEach(t => t.setVisible(show));
        if (!show) return;

        const colors = this.balanceConfig.routes || {};
        const max = Math.max(...ENDING_STYLE_ORDER.map(s => this.endingStyleScores[s]), 1);
        const lead = this.getLeadingRoute();
        if (lead) {
            this.leadingRouteLabel.setText(`命运领先：${ENDING_STYLE_META[lead].label}`);
            this.lastLeadingRoute = lead;
        } else {
            this.leadingRouteLabel.setText('命运倾向：尚未成型');
        }

        ENDING_STYLE_ORDER.forEach((style, i) => {
            const val = this.endingStyleScores[style] / max;
            const hex = colors[style] || '#ffffff';
            const color = Phaser.Display.Color.HexStringToColor(hex).color;
            const x = this.layout.sidePad + 8 + i * 168;
            this.routeBars.fillStyle(0x222233, 0.6);
            this.routeBars.fillRect(x, this.layout.routeBarY, 96, 6);
            this.routeBars.fillStyle(color, style === lead ? 1 : 0.75);
            this.routeBars.fillRect(x, this.layout.routeBarY, 96 * Math.max(0.08, val), 6);
            const label = this.routeLabelTexts[i];
            if (label) {
                const shortName: Record<EndingRouteStyle, string> = {
                    cyberSciFi: '赛博',
                    ancientClassic: '古风',
                    animeMania: '动漫',
                    mythLegend: '神话'
                };
                label.setColor(style === lead ? '#ffd700' : '#aaaaaa');
                label.setText(shortName[style]);
            }
        });
    }

    private grantObjectiveReward(reward: { objective: { text: string }; reward: number }) {
        this.addGold(reward.reward);
        this.showToast(`目标完成：${reward.objective.text} +${reward.reward}G`);
        this.audioManager.play('unlock');
        this.refreshProgressPanel();
    }

    private showBossDefeatChoice(bossData: { id: string }, items: Item[]) {
        const overlay = this.add.container(0, 0).setDepth(5000);
        const dim = this.add.rectangle(360, 640, 720, 1280, 0x000000, 0.72).setInteractive();
        const panel = this.add.container(360, 640);
        const bg = this.add.rectangle(0, 0, 620, 420, 0x111122, 0.95).setStrokeStyle(3, 0xffd700);
        const title = this.add.text(0, -160, '击败首领！选择战利品', { fontFamily: 'Arial Black', fontSize: 28, color: '#ffd700' }).setOrigin(0.5);
        panel.add([bg, title]);
        overlay.add([dim, panel]);

        const mkBtn = (label: string, y: number, onPick: () => void) => {
            const btn = this.add.text(0, y, label, {
                fontFamily: 'Arial Black', fontSize: 22, color: '#ffffff', backgroundColor: '#334466', padding: { x: 16, y: 10 }
            }).setOrigin(0.5).setInteractive({ useHandCursor: true });
            btn.on('pointerdown', () => { overlay.destroy(true); onPick(); });
            panel.add(btn);
        };

        const goldReward = Number(this.balanceConfig.boss?.defeatChoiceGoldMultiplier ?? 150) * Math.max(1, this.bossDefeatedCount);
        mkBtn(`金币 ×${goldReward}`, -60, () => this.addGold(goldReward));
        mkBtn('随机道具', 20, () => {
            const pool = items.filter(i => i.price > 0);
            const pick = pool[Math.floor(Math.random() * pool.length)];
            if (pick) this.addInventoryItem(pick);
        });
        mkBtn('下一生成 = 最高级-1', 100, () => {
            const lv = Math.max(1, this.grid.getMaxLevel() - 1);
            const chars: Character[] = this.cache.json.get('characters');
            const target = chars.find(c => c.level === lv && !c.hiddenEnding && !c.recipeOnly);
            if (target) this.grid.setNextSpawnFromSaved({ kind: 'character', charId: target.id, level: lv });
        });

        const tip = bossData.id === 'fire_monkey'
            ? '已额外获得：猴子（拖到马上可连升两级）'
            : '已额外获得：金元宝（点击背包中的元宝兑现金币）';
        panel.add(this.add.text(0, 170, tip, {
            fontFamily: 'Arial', fontSize: 16, color: '#cccccc', align: 'center',
            wordWrap: { width: 560 }
        }).setOrigin(0.5));
    }

    private markRecipeDiscovery(recipe: Recipe) {
        const key = recipe.ingredients.slice().sort().join('+');
        if (!this.saveManager.markRecipeFound(key)) return;
        this.foundHiddenRecipeThisRun = true;
        this.recipeHuntFound++;
        const reward = Number(this.balanceConfig.recipeDiscoveryReward ?? 200);
        this.addGold(reward);
        if (this.runMode === 'recipeHunt') this.addScore(reward);
        this.showToast(`发现新配方：${recipe.desc}！+${reward}G`);
        const chapterReward = this.chapterTracker.onRecipeMutation();
        if (chapterReward) this.grantObjectiveReward(chapterReward);
        this.boostRouteForHiddenRecipe(recipe.result);
        if (this.runMode === 'recipeHunt' && this.recipeHuntFound >= Number(this.balanceConfig.modes?.recipeHuntTarget ?? 3)) {
            this.time.delayedCall(400, () => this.triggerGameOver('normalEnding'));
        }
    }

    private boostRouteForHiddenRecipe(resultId: string) {
        const routeByHidden: Record<string, EndingRouteStyle> = {
            auntie_ma: 'animeMania',
            toilet_head: 'animeMania',
            pixel_censor: 'animeMania',
            derby_girl: 'animeMania',
            cow_horse: 'cyberSciFi',
            coder_feng: 'cyberSciFi',
            magic_paint: 'cyberSciFi',
            tech_giants: 'cyberSciFi'
        };
        const style = routeByHidden[resultId];
        if (!style) return;
        this.endingStyleScores[style] += 8;
    }

    public canOfferLevel101Choice() {
        return !this.level101ChoiceResolved;
    }

    private fitInfoDesc(text?: string) {
        if (!this.infoDesc) return;
        const reserved = this.infoActionBtn?.visible ? 132 : 36;
        const maxW = Math.max(180, this.layout.contentWidth - reserved);
        const maxH = Math.max(36, this.layout.infoH - 40);
        fitWrappedText(this.infoDesc, text ?? this.infoDesc.text, maxW, maxH, 15, 11);
    }

    private isBoardInputLocked() {
        return this.gameOverTriggered || this.isShowingUnlock || this.firstRunTipOpen || this.pendingLevel101Choice || this.setpiecePlaying || this.skillAimActive;
    }

    private bindKeyboard() {
        this.input.keyboard?.addCapture('SPACE');
        this.input.keyboard?.on('keydown', (event: KeyboardEvent) => {
            if ((event.code === 'Space' || event.code === 'Enter') && !event.repeat && this.unlockCloser) {
                event.preventDefault();
                this.unlockCloser();
                return;
            }
            if (this.isBoardInputLocked()) return;
            const code = event.code;
            if (code === 'ArrowLeft' || code === 'KeyA') this.grid.swipe(-1, 0);
            else if (code === 'ArrowRight' || code === 'KeyD') this.grid.swipe(1, 0);
            else if (code === 'ArrowUp' || code === 'KeyW') this.grid.swipe(0, -1);
            else if (code === 'ArrowDown' || code === 'KeyS') this.grid.swipe(0, 1);
            else if (code === 'KeyZ' || code === 'Backspace') this.useUndo();
        });
    }

    private maybeShowFirstRunTips() {
        if (this.dailySeed || this.continueRun) return;
        try {
            if (localStorage.getItem('horse_merge_seen_tips') === '1') return;
        } catch {
            return;
        }
        this.time.delayedCall(450, () => {
            this.firstRunTipOpen = true;
            const layer = this.add.container(360, 640).setDepth(6500);
            const dim = this.add.rectangle(0, 0, 720, 1280, 0x000000, 0.68).setInteractive();
            const card = this.add.rectangle(0, 0, 580, 430, 0x111133, 0.97).setStrokeStyle(3, 0xffd700);
            const title = this.add.text(0, -160, '怎么玩', {
                fontFamily: 'Arial Black', fontSize: 36, color: '#ffd700'
            }).setOrigin(0.5);
            const body = this.add.text(0, -10, [
                '合成看等级，不看长相：两只同级就能合',
                '角标颜色分等级。点选后，棋盘上标「下一」的是升级目标',
                '背包道具拖到棋盘使用，金元宝点一下兑现',
                '桌面端也可用方向键或 WASD，Z 悔棋，空格关闭解锁卡'
            ].join('\n'), {
                fontFamily: 'Arial', fontSize: 22, color: '#ffffff', align: 'center', lineSpacing: 12,
                wordWrap: { width: 500 }
            }).setOrigin(0.5);
            const btnBg = this.add.rectangle(0, 160, 220, 56, 0x335577).setStrokeStyle(2, 0xffffff).setInteractive({ useHandCursor: true });
            const btn = this.add.text(0, 160, '知道了', {
                fontFamily: 'Arial Black', fontSize: 26, color: '#ffffff'
            }).setOrigin(0.5);
            const dismiss = () => {
                try { localStorage.setItem('horse_merge_seen_tips', '1'); } catch { /* ignore */ }
                this.firstRunTipOpen = false;
                layer.destroy(true);
            };
            dim.on('pointerdown', dismiss);
            btnBg.on('pointerdown', dismiss);
            layer.add([dim, card, title, body, btnBg, btn]);
        });
    }

    private applyModeStartExtras() {
        if (this.runMode === 'daily') {
            const roster: Character[] = this.cache.json.get('characters') || [];
            const guest = pickDailyGuest(this.dailySeed || localDateKey(), roster);
            if (guest) {
                this.guestId = guest.id;
                this.grid.forceSpawnById(guest.id);
                this.saveManager.markGuestSeen(guest.id);
                this.showToast(`今日客串：${guest.name}`);
            }
        }
        if (this.runMode === 'bossRush') {
            const band = this.getDebugSpawnBandForBoss('miasma_bat');
            this.grid.configureDebugSpawnBand(band.floor, band.ceiling);
            band.seedLevels.slice(0, 4).forEach(level => this.grid.forceSpawnCharacter(level));
        }
        if (this.runMode === 'sprint' || this.runMode === 'recipeHunt') {
            this.undoRemaining = 0;
            this.undoBtn?.setVisible(false);
        }
    }

    private tickPairAura(): boolean {
        const pair = findActivePair(this.grid.getBoardCharacterIds());
        if (pair && this.pairTurnsRemaining <= 0) {
            this.pairTurnsRemaining = Number(this.balanceConfig.pairBonus?.turns ?? 8);
            this.showToast('成双：合成加分光环开启');
        }
        return this.pairTurnsRemaining > 0;
    }

    private fireChapterEvent(chapterId: string) {
        if (this.chapterEventsFired.has(chapterId)) return;
        if (chapterId === 'chapter_start' || chapterId === 'chapter_harmony') return;
        this.chapterEventsFired.add(chapterId);
        if (chapterId === 'chapter_mutation') {
            this.grid.setRecipeHelpForced(Number(this.balanceConfig.events?.recipeHelpSpawns ?? 5));
            this.showToast('奇种涌现：下几次生成必中一半配方材料');
        } else if (chapterId === 'chapter_myth') {
            this.bossManager.advanceSpawnClock(Number(this.balanceConfig.events?.mythBossAdvance ?? 8));
            this.showToast('神话加速：下一次 Boss 提前到来');
        } else if (chapterId === 'chapter_star') {
            this.grid.setExtraLowSpawns(Number(this.balanceConfig.events?.starExtraLowTurns ?? 6));
            this.showToast('终章星穹：低段生成再降一档，先把盘面养活');
        }
    }

    private refreshBgm() {
        const palette: BgmPalette = this.lifesaverToastShown
            ? 'nearDeath'
            : this.harmonyChallengeAccepted || this.highestLevelReached >= 76
                ? 'finale'
                : 'standard';
        const key = `bgm_${palette}`;
        if (this.cache.audio.exists(key)) {
            try {
                this.audioManager.stopBgm();
                if (this.audioManager.isMuted()) return;
                if (!this.fileBgmSound || this.fileBgmSound.key !== key) {
                    this.fileBgmSound?.stop();
                    this.fileBgmSound = this.sound.get(key) || this.sound.add(key, {
                        loop: true,
                        volume: this.audioManager.getVolume() * 0.35
                    });
                }
                if (!this.fileBgmSound.isPlaying) this.fileBgmSound.play();
                return;
            } catch {
                this.fileBgmSound = null;
                if (this.cache.audio.exists(key)) this.cache.audio.remove(key);
            }
        }
        this.fileBgmSound?.stop();
        void this.audioManager.playBgm(palette);
    }

    private fillPressureBar() {
        if (!this.pressureBar || !this.grid) return;
        const startX = this.grid.getStartX();
        const startY = this.grid.getStartY() - 8;
        const w = this.grid.getTileSize() * 6;
        this.pressureBar.clear();
        this.pressureBar.fillStyle(0xff4444, 1);
        this.pressureBar.fillRect(startX, startY, w, 4);
    }

    private showBoleSealOverlay() {
        const top = this.grid.getTopCharacters(6);
        if (top.length < 2) {
            this.triggerGameOver('normalEnding');
            return;
        }
        this.isShowingUnlock = true;
        const layer = this.add.container(0, 0).setDepth(2300);
        const dim = this.add.rectangle(360, 640, 720, 1280, 0x000000, 0.86).setInteractive();
        const title = this.add.text(360, 220, '伯乐封卷', {
            fontFamily: 'Arial Black', fontSize: 36, color: '#ffd700'
        }).setOrigin(0.5);
        const hint = this.add.text(360, 270, '点两匹最高气口的马，替你封卷', {
            fontFamily: 'Arial', fontSize: 20, color: '#ffffff'
        }).setOrigin(0.5);
        layer.add([dim, title, hint]);
        const picked: string[] = [];
        top.forEach((char, i) => {
            const x = 160 + (i % 3) * 200;
            const y = 420 + Math.floor(i / 3) * 220;
            const bg = this.add.rectangle(x, y, 170, 190, 0x222244).setStrokeStyle(2, 0x888899).setInteractive({ useHandCursor: true });
            const name = this.add.text(x, y + 70, char.name, {
                fontFamily: 'Arial Black', fontSize: 18, color: '#ffffff',
                wordWrap: { width: 150, useAdvancedWrap: true }, align: 'center'
            }).setOrigin(0.5);
            layer.add(bg);
            if (this.textures.exists(char.id)) {
                layer.add(this.add.image(x, y - 16, char.id).setDisplaySize(96, 96));
            }
            layer.add(name);
            bg.on('pointerdown', () => {
                if (picked.includes(char.id)) {
                    picked.splice(picked.indexOf(char.id), 1);
                    bg.setStrokeStyle(2, 0x888899);
                } else if (picked.length < 2) {
                    picked.push(char.id);
                    bg.setStrokeStyle(3, 0xffd700);
                }
            });
        });
        const ok = this.add.rectangle(360, 980, 280, 56, 0x335577).setStrokeStyle(2, 0xffffff).setInteractive({ useHandCursor: true });
        const okText = this.add.text(360, 980, '确认封卷', {
            fontFamily: 'Arial Black', fontSize: 24, color: '#ffffff'
        }).setOrigin(0.5);
        ok.on('pointerdown', () => {
            if (picked.length < 2) return;
            this.boleCharIds = picked;
            picked.forEach(id => {
                const roster: Character[] = this.cache.json.get('characters') || [];
                const char = roster.find(c => c.id === id);
                if (char) this.recordCharacterTags(char, 6);
            });
            layer.destroy(true);
            this.isShowingUnlock = false;
            this.triggerGameOver('normalEnding');
        });
        layer.add([ok, okText]);
    }
}
