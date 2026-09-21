import { Character, EndgamePhase, EndingRouteStyle, Item, RunMode } from '../types';
import { persistSlotForMode } from '../utils/runConfig';

export const RUN_STATE_KEY = 'horse_merge_run_v1';
export const RUN_SIDE_STATE_KEY = 'horse_merge_run_side_v1';
export const RUN_STATE_VERSION = 2;

export type RunSlot = 'standard' | 'side';

export interface RunTileSnapshot {
    r: number;
    c: number;
    kind: 'character' | 'item' | 'empty';
    charId?: string;
    itemId?: string;
    frozen?: boolean;
    skillUsed?: boolean;
}

export interface RunStateSnapshot {
    schemaVersion: number;
    score: number;
    runGold: number;
    inventory: string[];
    boss?: {
        id: string;
        hp: number;
        turns: number;
        frozenTurns: number;
        enraged: boolean;
        telegraphSkill?: string;
        obstacleCount: number;
        r?: number;
        c?: number;
    } | null;
    endgamePhase: EndgamePhase;
    harmonyChallengeAccepted: boolean;
    harmonyStableMoves: number;
    endgameEventCount: number;
    harmonyAchieved: boolean;
    minActiveLevel: number;
    maxProgressLevel: number;
    mergeMoveCount: number;
    bossDefeatedCount: number;
    highestLevelReached: number;
    tagCounts: Record<string, number>;
    endingStyleScores: Record<string, number>;
    pendingLevel101Choice: boolean;
    level101ChoiceResolved: boolean;
    chapterObjectivesDone: string[];
    criticalPityCounter: number;
    undoRemaining: number;
    nextSpawn?: { kind: 'character' | 'item'; charId?: string; itemId?: string; level?: number };
    tiles: RunTileSnapshot[];
    blocked: boolean[][];
    seed?: number;
    dailyChallenge?: boolean;
    criticalWarningsShown?: number;
    mode?: RunMode;
    dailySeed?: string;
    guestId?: string;
    routeLock?: EndingRouteStyle;
    sprintMovesLeft?: number;
    pairTurnsRemaining?: number;
    chapterEventsFired?: string[];
    recipeHelpForced?: number;
    extraLowSpawns?: number;
    recipeHuntFound?: number;
    boleCharIds?: string[];
}

function storageKey(slot: RunSlot) {
    return slot === 'standard' ? RUN_STATE_KEY : RUN_SIDE_STATE_KEY;
}

export class RunStateManager {
    static save(snapshot: RunStateSnapshot, slot?: RunSlot) {
        const resolved = slot || persistSlotForMode(snapshot.mode || (snapshot.dailyChallenge ? 'daily' : 'standard'));
        try {
            localStorage.setItem(storageKey(resolved), JSON.stringify(snapshot));
        } catch {
            // ignore quota errors
        }
    }

    static load(slot: RunSlot = 'standard'): RunStateSnapshot | null {
        try {
            const raw = localStorage.getItem(storageKey(slot));
            if (!raw) return null;
            const parsed = JSON.parse(raw) as RunStateSnapshot;
            if (parsed.schemaVersion !== RUN_STATE_VERSION && parsed.schemaVersion !== 1) {
                localStorage.removeItem(storageKey(slot));
                return null;
            }
            if (parsed.schemaVersion === 1) {
                parsed.schemaVersion = RUN_STATE_VERSION;
                parsed.mode = parsed.dailyChallenge ? 'daily' : 'standard';
            }
            return parsed;
        } catch {
            localStorage.removeItem(storageKey(slot));
            return null;
        }
    }

    static loadAny(): RunStateSnapshot | null {
        return this.load('standard') || this.load('side');
    }

    static clear(slot?: RunSlot) {
        if (slot) {
            localStorage.removeItem(storageKey(slot));
            return;
        }
        localStorage.removeItem(RUN_STATE_KEY);
        localStorage.removeItem(RUN_SIDE_STATE_KEY);
    }

    static hasValidRun(slot?: RunSlot): boolean {
        if (slot) return this.load(slot) !== null;
        return this.loadAny() !== null;
    }

    static getContinueLabel(): string | null {
        const standard = this.load('standard');
        if (standard) {
            return `继续上局（Lv.${standard.highestLevelReached} · 分数 ${standard.score}）`;
        }
        const side = this.load('side');
        if (!side) return null;
        const mode = side.mode || (side.dailyChallenge ? 'daily' : 'standard');
        const tag = mode === 'daily' ? '今日挑战' : mode === 'sprint' ? '冲分' : mode === 'bossRush' ? 'Rush' : '猎人';
        return `继续${tag}（Lv.${side.highestLevelReached} · 分数 ${side.score}）`;
    }

    static getContinueSnapshot(): RunStateSnapshot | null {
        return this.loadAny();
    }
}

export interface BuildRunStateParams {
    score: number;
    runGold: number;
    inventory: Item[];
    grid: {
        exportTiles: () => RunTileSnapshot[];
        exportBlocked: () => boolean[][];
        getEndgamePhase: () => EndgamePhase;
        getMinActiveLevel: () => number;
        getMaxProgressLevel: () => number;
    };
    bossManager?: {
        exportState: () => RunStateSnapshot['boss'];
    } | null;
    meta: Omit<RunStateSnapshot, 'schemaVersion' | 'score' | 'runGold' | 'inventory' | 'tiles' | 'blocked' | 'minActiveLevel' | 'maxProgressLevel' | 'endgamePhase'>;
}

export function buildRunSnapshot(params: BuildRunStateParams): RunStateSnapshot {
    return {
        schemaVersion: RUN_STATE_VERSION,
        score: params.score,
        runGold: params.runGold,
        inventory: params.inventory.map(i => i.id),
        tiles: params.grid.exportTiles(),
        blocked: params.grid.exportBlocked(),
        endgamePhase: params.grid.getEndgamePhase(),
        minActiveLevel: params.grid.getMinActiveLevel(),
        maxProgressLevel: params.grid.getMaxProgressLevel(),
        boss: params.bossManager?.exportState() ?? null,
        ...params.meta
    };
}

export function findCharacterById(characters: Character[], id: string) {
    return characters.find(c => c.id === id) || null;
}

export function findItemById(items: Item[], id: string) {
    return items.find(i => i.id === id) || null;
}
