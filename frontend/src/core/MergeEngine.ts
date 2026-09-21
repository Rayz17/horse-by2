import { Character, Item, Recipe } from '../types';

export interface MergeContext {
    recipes: Recipe[];
    charMap: Map<string, Character>;
    getReasonableSpikeCap: () => number;
    onRecipeUsed?: (recipe: Recipe) => void;
}

export class MergeEngine {
    static resolve(tileA: { character?: Character | null; item?: Item | null }, tileB: { character?: Character | null; item?: Item | null }, ctx: MergeContext, findByLevel: (level: number) => Character | null): Character | null {
        let unit: Character | null = null;
        let item: Item | null = null;

        if (tileA.character && tileB.item) {
            unit = tileA.character;
            item = tileB.item;
        } else if (tileA.item && tileB.character) {
            unit = tileB.character;
            item = tileA.item;
        }

        if (unit && item) {
            const catalyst = ctx.recipes.find(r =>
                r.type === 'catalyst' &&
                r.ingredients.includes('any_horse') &&
                r.ingredients.includes(item!.id)
            ) || ctx.recipes.find(r =>
                r.type === 'catalyst' &&
                r.ingredients.includes(unit!.id) &&
                r.ingredients.includes(item!.id)
            );

            if (catalyst) {
                const resultChar = ctx.charMap.get(catalyst.result);
                if (resultChar) {
                    if (resultChar.level > ctx.getReasonableSpikeCap()) return null;
                    if (catalyst.ingredients.includes('any_horse') && unit.level < resultChar.level - 10) {
                        return null;
                    }
                    ctx.onRecipeUsed?.(catalyst);
                    return resultChar;
                }
            }
            return null;
        }

        if (tileA.character && tileB.character) {
            const a = tileA.character;
            const b = tileB.character;
            const mutation = ctx.recipes.find(r =>
                r.type === 'mutation' &&
                r.ingredients.length === 2 &&
                ((r.ingredients[0] === a.id && r.ingredients[1] === b.id) ||
                    (r.ingredients[0] === b.id && r.ingredients[1] === a.id))
            );

            if (mutation) {
                const resultChar = ctx.charMap.get(mutation.result) || null;
                if (resultChar && resultChar.level <= ctx.getReasonableSpikeCap()) {
                    const peak = Math.max(a.level, b.level);
                    if (resultChar.level < peak - 10) return null;
                    ctx.onRecipeUsed?.(mutation);
                    return resultChar;
                }
                return null;
            }

            if (a.level === b.level) {
                const nextChar = findByLevel(a.level + 1);
                if (nextChar?.hiddenEnding || nextChar?.recipeOnly) return null;
                return nextChar;
            }
        }

        return null;
    }

    static rollCritical(base: Character, findByLevel: (level: number) => Character | null, rate: number, pityForce: boolean): { result: Character; isCritical: boolean } {
        let result = base;
        let isCritical = false;
        if (pityForce || Math.random() < rate) {
            const critChar = findByLevel(base.level + 1);
            if (critChar && !critChar.hiddenEnding) {
                result = critChar;
                isCritical = true;
            }
        }
        return { result, isCritical };
    }
}
