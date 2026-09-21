import { Item } from '../types';
import { mulberry32, seedFromString } from './rng';

export function rotateShopItems(items: Item[], chapterIndex: number, seedKey: string, slotCount = 4): Item[] {
    const buyable = items.filter(i => i.price > 0);
    if (buyable.length <= slotCount) return buyable;
    const rng = mulberry32(seedFromString(`${seedKey}-shop-${chapterIndex}`));
    const copy = [...buyable];
    for (let i = copy.length - 1; i > 0; i--) {
        const j = Math.floor(rng() * (i + 1));
        [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    const start = (chapterIndex * slotCount) % copy.length;
    const out: Item[] = [];
    for (let i = 0; i < slotCount; i++) {
        out.push(copy[(start + i) % copy.length]);
    }
    return out;
}
