import { Character, EndgamePhase, Item } from '../types';

export interface SpawnBalance {
    lowSegmentRatio: number;
    midSegmentRatio: number;
    highSegmentRatio: number;
    cannonReliefChance: number;
    cannonReliefCooldown: number;
    emptyBoardThreshold: number;
    deadlockEmptySpots: number;
    weaknessSpawnChance: number;
    recipeSpawnChance: number;
}

export interface SpawnDecision {
    kind: 'character' | 'item' | 'none';
    level?: number;
    char?: Character;
    item?: Item;
    reason?: string;
}

export class SpawnSystem {
    private cannonReliefCounter = 0;
    private rng: () => number;

    constructor(rng: () => number = Math.random) {
        this.rng = rng;
    }

    setRng(rng: () => number) {
        this.rng = rng;
    }

    resetCounters() {
        this.cannonReliefCounter = 0;
    }

    getCannonReliefCounter() {
        return this.cannonReliefCounter;
    }

    decideSpawn(params: {
        emptySpots: number;
        occupiedCount: number;
        minActiveLevel: number;
        maxLevel: number;
        phase: EndgamePhase;
        protectedCharIds: string[];
        debugFloor: number | null;
        debugCeiling: number | null;
        items: Item[];
        neededChar: Character | null;
        weaknessChar: Character | null;
        findByLevel: (level: number, excludeHidden?: boolean) => Character | null;
        balance: SpawnBalance;
        forceRecipeHelp?: boolean;
        extraLowDrop?: boolean;
        recipeChanceOverride?: number;
    }): SpawnDecision {
        const {
            emptySpots, occupiedCount, minActiveLevel, maxLevel, phase,
            debugFloor, debugCeiling, items, neededChar, weaknessChar,
            findByLevel, balance, forceRecipeHelp, extraLowDrop, recipeChanceOverride
        } = params;

        if (emptySpots === 0) return { kind: 'none' };

        if (occupiedCount < balance.emptyBoardThreshold) {
            const char = findByLevel(minActiveLevel, true);
            if (char) return { kind: 'character', char, level: char.level, reason: 'empty_board_pity' };
        }

        if (emptySpots < balance.deadlockEmptySpots) {
            this.cannonReliefCounter++;
            if (this.cannonReliefCounter >= balance.cannonReliefCooldown && this.rng() < balance.cannonReliefChance) {
                this.cannonReliefCounter = 0;
                const cannon = items.find(i => i.id === 'item_cannon');
                if (cannon) return { kind: 'item', item: cannon, reason: 'cannon_relief' };
            }
        } else {
            this.cannonReliefCounter++;
        }

        if (weaknessChar && this.rng() < balance.weaknessSpawnChance) {
            return { kind: 'character', char: weaknessChar, level: weaknessChar.level, reason: 'weakness' };
        }

        const recipeChance = recipeChanceOverride ?? balance.recipeSpawnChance;
        if (neededChar && (forceRecipeHelp || this.rng() < recipeChance)) {
            return { kind: 'character', char: neededChar, level: neededChar.level, reason: 'recipe_help' };
        }

        let level = minActiveLevel;
        if (debugFloor !== null && debugCeiling !== null) {
            level = Math.floor(this.rng() * (Math.max(debugFloor, debugCeiling) - debugFloor + 1)) + debugFloor;
        } else if (phase !== 'normal') {
            if (this.rng() < 0.45) {
                level = this.rng() < 0.5 ? minActiveLevel : Math.min(minActiveLevel + 1, maxLevel);
            } else {
                const floor = Math.max(minActiveLevel + 1, maxLevel - 6);
                const ceiling = Math.max(floor, maxLevel - 4);
                level = Math.floor(this.rng() * (ceiling - floor + 1)) + floor;
            }
        } else if (maxLevel <= 4) {
            level = this.rng() < 0.8 ? 1 : 2;
        } else {
            const roll = this.rng();
            const lowRatio = extraLowDrop ? Math.min(0.85, balance.lowSegmentRatio + 0.25) : balance.lowSegmentRatio;
            if (roll < lowRatio) {
                level = this.rng() < 0.5 ? minActiveLevel : minActiveLevel + 1;
            } else if (roll < lowRatio + balance.midSegmentRatio) {
                const floor = Math.max(minActiveLevel + 1, maxLevel - 5);
                const ceiling = Math.max(floor, maxLevel - 3);
                level = Math.floor(this.rng() * (ceiling - floor + 1)) + floor;
            } else {
                const floor = Math.max(minActiveLevel + 2, maxLevel - 4);
                const ceiling = Math.max(floor, maxLevel - 2);
                level = Math.floor(this.rng() * (ceiling - floor + 1)) + floor;
            }
        }

        let char = findByLevel(level, true);
        if (!char) char = findByLevel(minActiveLevel, true);
        if (!char) return { kind: 'none' };
        return { kind: 'character', char, level: char.level, reason: 'standard' };
    }
}
