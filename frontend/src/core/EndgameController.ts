import { Character, EndgamePhase, HarmonySnapshot } from '../types';

export interface EndgameBalance {
    level101Min: number;
    highTierRatioMin: number;
    stableMovesMin: number;
    endgameEventsMin: number;
}

export class EndgameController {
    phase: EndgamePhase = 'normal';
    harmonyStableMoves = 0;
    endgameEventCount = 0;
    harmonyAchieved = false;
    harmonyChallengeAccepted = false;
    lastHarmonySignature = '';

    constructor(private balance: EndgameBalance) {}

    updateBalance(balance: EndgameBalance) {
        this.balance = balance;
    }

    getPhase() {
        return this.phase;
    }

    setHarmonyChallengeAccepted(accepted: boolean) {
        this.harmonyChallengeAccepted = accepted;
        if (!accepted) {
            this.harmonyStableMoves = 0;
            this.lastHarmonySignature = '';
        }
    }

    registerEndgameEvent(maxLevel: number) {
        if (maxLevel >= 91) this.endgameEventCount++;
    }

    updatePhase(maxLevel: number): EndgamePhase {
        let next: EndgamePhase = 'normal';
        if (this.harmonyAchieved) next = 'trueEnding';
        else if (maxLevel >= 101) next = 'harmony';
        else if (maxLevel >= 91) next = 'ascension';
        this.phase = next;
        return next;
    }

    markHarmonyAchieved() {
        this.harmonyAchieved = true;
        this.phase = 'trueEnding';
    }

    buildSnapshot(tiles: Array<{ character?: Character | null }>, maxLevel: number): HarmonySnapshot {
        let occupiedCharacterCount = 0;
        let level101Count = 0;
        let level95PlusCount = 0;
        let lowLevelPollution = 0;

        for (const tile of tiles) {
            if (!tile.character || tile.character.hiddenEnding) continue;
            occupiedCharacterCount++;
            if (tile.character.level >= 101) level101Count++;
            if (tile.character.level >= 95) level95PlusCount++;
            if (tile.character.level < 85) lowLevelPollution++;
        }

        const effectiveCellCount = occupiedCharacterCount;
        const highTierRatio = effectiveCellCount > 0 ? level95PlusCount / effectiveCellCount : 0;
        const harmonyReady = !this.harmonyAchieved &&
            this.harmonyChallengeAccepted &&
            level101Count >= this.balance.level101Min &&
            highTierRatio >= this.balance.highTierRatioMin &&
            this.harmonyStableMoves >= this.balance.stableMovesMin &&
            this.endgameEventCount >= this.balance.endgameEventsMin;

        return {
            phase: this.phase,
            maxLevel,
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

    updateHarmonyStableMoves(signature: string) {
        if (signature === this.lastHarmonySignature) {
            this.harmonyStableMoves++;
        } else {
            this.harmonyStableMoves = 1;
            this.lastHarmonySignature = signature;
        }
    }

    resetStableMoves() {
        this.harmonyStableMoves = 0;
        this.lastHarmonySignature = '';
    }

    getEndingCharacter(characters: Character[], routeStyle?: string): Character | null {
        if (routeStyle) {
            const suffixMap: Record<string, string> = {
                cyberSciFi: 'true_ending_cyber',
                ancientClassic: 'true_ending_ancient',
                animeMania: 'true_ending_anime',
                mythLegend: 'true_ending_myth'
            };
            const unlockBy = suffixMap[routeStyle];
            if (unlockBy) {
                return characters.find(c => c.hiddenEnding && c.unlockBy === unlockBy) || null;
            }
        }
        return characters.find(c => c.hiddenEnding && typeof c.unlockBy === 'string' && c.unlockBy.startsWith('true_ending')) || null;
    }
}
