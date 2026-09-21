import { Character, EndingReport, EndingRouteStyle, EndingType, Recipe } from '../types';
import { mulberry32, seedFromString } from './rng';

const AUSPICIOUS = [
    '今日宜合不宜散，成双的人最先看见路。',
    '贵人在左，冷笑话在右，这一局两边都站着。',
    '棋盘虽挤，气口还在；先把最高那一匹养亮。',
    '隐藏配方在听，听岔一次，世界就多一只梗。',
    '封卷不是认输，是把这一路气质钉进命书。',
    '真结局不靠运气，靠你把盘面收拾成会发光的形状。',
    '客串的马只待一天，见过就算缘分，不必强留。',
    '三十步也能冲出名字，短局里同样能成双。'
];

const LOSS = [
    '盘面满了，故事没满；最高那匹还想再翻一次。',
    '死局不是句号，是这匹马把丧签念到一半。',
    '气口被堵住时，先听棋盘最高梗的半句话。',
    '合不成的那一步，往往是下一局的材料。',
    '放弃前先看一眼最高马：它比通用 Game Over 更像你。',
    '今日损在贪快，明日吉在留空。',
    '还能翻。压力条拉满的时候，才配叫仪式。',
    '伯乐没点名的那两匹，下次再请它们封卷。'
];

const ROUTE_LINE: Record<EndingRouteStyle, string> = {
    cyberSciFi: '路线落在赛博：主机还在超频，签文带着电流。',
    ancientClassic: '路线落在古风：长卷未合，签文像一枚朱印。',
    animeMania: '路线落在动漫：片尾曲还没放完，签文先喊一声成双。',
    mythLegend: '路线落在神话：星穹未散，签文像一记天门。'
};

export function fortuneSeed(report: Pick<EndingReport, 'dailySeed' | 'score' | 'moveCount' | 'endingType'>): number {
    const key = report.dailySeed || `run-${report.score}-${report.moveCount}-${report.endingType}`;
    return seedFromString(key);
}

export function pickLines(rng: () => number, pool: string[], count: number): string[] {
    const copy = [...pool];
    const out: string[] = [];
    while (out.length < count && copy.length) {
        const i = Math.floor(rng() * copy.length);
        out.push(copy.splice(i, 1)[0]);
    }
    return out;
}

export function buildFortuneLines(input: {
    bestChar: Character | null;
    endingType: EndingType;
    routeStyle?: EndingRouteStyle;
    foundHiddenRecipe: boolean;
    dailySeed?: string;
    score: number;
    moveCount: number;
    boleNames?: string[];
    guestName?: string;
}): { lines: string[]; tone: 'auspicious' | 'loss' } {
    const tone: 'auspicious' | 'loss' = input.endingType === 'deadlockEnding' ? 'loss' : 'auspicious';
    const rng = mulberry32(fortuneSeed({
        dailySeed: input.dailySeed,
        score: input.score,
        moveCount: input.moveCount,
        endingType: input.endingType
    }));
    const pool = tone === 'loss' ? LOSS : AUSPICIOUS;
    const lines = pickLines(rng, pool, 3);
    const name = input.bestChar?.name || '无名马';
    lines[0] = tone === 'loss'
        ? `${name} 的丧签：${lines[0]}`
        : `${name} 压轴：${lines[0]}`;
    if (input.routeStyle) {
        lines[1] = ROUTE_LINE[input.routeStyle];
    }
    if (input.foundHiddenRecipe) {
        lines[2] = '隐藏配方已被你听岔进图鉴，签文为此加一笔吉。';
    } else if (input.boleNames?.length) {
        lines[2] = `伯乐点名：${input.boleNames.join('、')}。这两匹替你封卷。`;
    } else if (input.guestName) {
        lines[2] = `今日客串是${input.guestName}。见过不算解锁，但签文记得它。`;
    }
    return { lines, tone };
}

export function deadlockGiveUpSnippet(best: Character | null): string {
    const name = best?.name || '这匹马';
    const half = LOSS[0].slice(0, 10);
    return `${name}：${half}`;
}

export function recipeHint(recipe: Recipe): string {
    return recipe.hint || '听岔一次，世界就多一只梗。';
}
