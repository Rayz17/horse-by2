export const PAIR_TABLE: Array<[string, string]> = [
    ['bamboo_horse', 'white_base'],
    ['sophist_white', 'auntie_ma'],
    ['qilin_myth', 'derby_girl'],
    ['piplup_cosplay', 'pony_pink'],
    ['bole_sage', 'cosmic_one'],
    ['gundam_kim', 'mobile_horse'],
    ['patriot_yue', 'alexander_mt'],
    ['black_sheep', 'cow_horse']
];

export function findActivePair(ids: Set<string>): [string, string] | null {
    for (const [a, b] of PAIR_TABLE) {
        if (ids.has(a) && ids.has(b)) return [a, b];
    }
    return null;
}
