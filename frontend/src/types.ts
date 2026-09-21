import Phaser from 'phaser';

export type SkillTrigger = 'manual' | 'on_merge' | 'on_boss' | 'on_deadlock' | 'on_endgame';

export type EndgamePhase = 'normal' | 'ascension' | 'harmony' | 'trueEnding';

export type EndingType = 'deadlockEnding' | 'normalEnding' | 'trueEnding';

export type EndingRouteStyle = 'cyberSciFi' | 'ancientClassic' | 'animeMania' | 'mythLegend';

export interface CharacterSkill {
    name: string;
    description: string;
    type?: string;
    params?: any;
    trigger?: SkillTrigger;
    tags?: string[];
    priority?: string;
}

export interface Character {
    id: string;
    name: string;
    level: number;
    tier: number;
    faction: string;
    rarity: string;
    description: string;
    origin: string;
    background: string;
    skill: CharacterSkill;
    greeting: string;
    assetId?: string;
    hiddenEnding?: boolean;
    endingTier?: boolean;
    unlockBy?: string;
    recipeOnly?: boolean;
}

export interface Item {
    id: string;
    name: string;
    price: number;
    description: string;
    icon?: string;
}

export interface Recipe {
    id?: string;
    type: "catalyst" | "mutation";
    ingredients: string[];
    result: string;
    desc: string;
    hint?: string;
}

export interface BossData {
    id: string;
    name: string;
    hp: number;
    maxHp: number;
    weakness: string[];
    dialogue: {
        spawn: string;
        skill: string;
        hit: string;
        weakness_hit: string;
        defeat: string;
    };
    skill: {
        id: string;
        name: string;
        desc: string;
    };
    description?: string;
}

export interface SkillProfile {
    type: string;
    trigger: SkillTrigger;
    tags: string[];
    priority: string;
}

export interface SkillHighlightCell {
    r: number;
    c: number;
    color: number;
    alpha?: number;
}

export type SkillBossAction =
    | { kind: 'damage'; amount: number; weakness?: boolean }
    | { kind: 'freeze'; turns: number }
    | { kind: 'clear_effect'; effectType?: string }
    | { kind: 'break_invincible' }
    | { kind: 'unfreeze_all' }
    | { kind: 'cancel_telegraph' };

export type SkillSetpieceId =
    | 'dacha'
    | 'overtime'
    | 'pollute'
    | 'debug'
    | 'censor'
    | 'paint'
    | 'derby'
    | 'giants'
    | 'cosmic'
    | 'quip'
    | 'cannon'
    | 'zankanto'
    | 'sekiba'
    | 'meteor'
    | 'upgrade'
    | 'bomb'
    | 'snipe'
    | 'freeze'
    | 'summon'
    | 'economy'
    | 'clear'
    | 'shuffle'
    | 'heal'
    | 'transform';

export interface SkillSetpiece {
    id: SkillSetpieceId;
    stamp: string;
    casterName: string;
    textureKey?: string;
    cells: Array<{ r: number; c: number }>;
    logs?: string[];
    brief?: boolean;
}

export type SkillSideEffect =
    | { kind: 'gold'; amount: number }
    | { kind: 'gold_half_cost' }
    | { kind: 'gold_double' }
    | { kind: 'spawn_shop_item' }
    | { kind: 'level101_choice' };

export interface SkillPreview {
    type: string;
    canExecute: boolean;
    needsAim: boolean;
    relievesDeadlock: boolean;
    cells: SkillHighlightCell[];
    failReason?: string;
    setpiece?: SkillSetpiece;
}

export interface SkillResult {
    consumed: boolean;
    boardChanged: boolean;
    toast?: string;
    playAnim: boolean;
    playSkillSound: boolean;
    sideEffects: SkillSideEffect[];
    bossActions: SkillBossAction[];
    setpiece?: SkillSetpiece;
}

export interface HarmonySnapshot {
    phase: EndgamePhase;
    maxLevel: number;
    level101Count: number;
    level95PlusCount: number;
    effectiveCellCount: number;
    highTierRatio: number;
    lowLevelPollution: number;
    stableMoves: number;
    endgameEventCount: number;
    harmonyReady: boolean;
}

export type RunMode = 'standard' | 'daily' | 'sprint' | 'bossRush' | 'recipeHunt';

export type BgmPalette = 'standard' | 'finale' | 'nearDeath' | 'trueEnding';

export interface RunConfig {
    mode: RunMode;
    continueRun?: boolean;
    dailySeed?: string;
    startItems?: string[];
    bossId?: string;
    guestId?: string;
    routeLock?: EndingRouteStyle;
}

export interface BalanceConfig {
    criticalRate: number;
    criticalPityThreshold: number;
    bossSpawnTurnsNormal: number;
    bossSpawnTurnsEndgame: number;
    harmony: {
        level101Min: number;
        highTierRatioMin: number;
        stableMovesMin: number;
        endgameEventsMin: number;
    };
    initialGold: number;
    initialLegacyGold: number;
    legacyGoldCap: number;
    runGoldCap?: number;
    runGoldToScoreRatio: number;
    legacyGoldRewards: Record<string, number>;
    spawn: Record<string, number>;
    feel: Record<string, number | boolean>;
    tension: Record<string, number>;
    undo: Record<string, number | boolean>;
    boss: Record<string, number | boolean>;
    economy: Record<string, number>;
    chapters: Record<string, number>;
    recipeDiscoveryReward: number;
    routes: Record<string, string>;
    modes?: Record<string, number>;
    fortune?: Record<string, number | string>;
    pairBonus?: { multiplier: number; turns: number };
    events?: Record<string, number>;
    audio?: Record<string, number>;
    shopDaily?: { slotCount: number };
}

export interface ChapterObjective {
    id: string;
    text: string;
    type: string;
    target: number | string;
    reward: number;
}

export interface ChapterDefinition {
    id: string;
    tier: number;
    title: string;
    objectives: ChapterObjective[];
}

export interface GameSceneLike {
    onBossSelected(boss: unknown): void;
    playActionAnimation(x: number, y: number, charId: string): void;
    grid: import('./objects/Grid').Grid;
    bossManager: import('./managers/BossManager').BossManager;
    events: Phaser.Events.EventEmitter;
    cache: Phaser.Cache.CacheManager;
    add: Phaser.GameObjects.GameObjectFactory;
    tweens: Phaser.Tweens.TweenManager;
    time: Phaser.Time.Clock;
    textures: Phaser.Textures.TextureManager;
    registry: Phaser.Data.DataManager;
}

export interface EndingReport {
    endingType: EndingType;
    score: number;
    bestChar: Character | null;
    endingChar: Character | null;
    phase: EndgamePhase;
    bossDefeated: number;
    moveCount: number;
    highestLevelReached: number;
    dominantTag: string;
    dominantTagLabel: string;
    routeStyle?: EndingRouteStyle;
    routeLabel?: string;
    routeSubtitle?: string;
    routeReasons?: string[];
    routeScoreSummary?: string[];
    storyTitle: string;
    storyLines: string[];
    blessing: string;
    chapterObjectivesDone?: number;
    chapterObjectivesTotal?: number;
    dailySeed?: string;
    harmony?: HarmonySnapshot;
    fortuneLines?: string[];
    fortuneTone?: 'auspicious' | 'loss';
    mode?: RunMode;
    guestName?: string;
    boleNames?: string[];
}
