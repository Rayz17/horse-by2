import { Character } from '../types';
import { seedFromString } from './rng';

export function pickDailyGuest(dailySeed: string, characters: Character[]): Character | null {
    const pool = characters.filter(c =>
        !c.hiddenEnding && (
            c.recipeOnly || (c.level >= 8 && c.level <= 40)
        )
    );
    if (pool.length === 0) return null;
    const idx = Math.abs(seedFromString(dailySeed)) % pool.length;
    return pool[idx];
}
