import { chromium } from 'playwright';

const URL = 'http://127.0.0.1:5173/';

function boardKey(tiles) {
    return tiles
        .map(t => `${t.r},${t.c}:${t.kind === 'character' ? `${t.charId}@${t.level ?? ''}` : t.itemId}`)
        .sort()
        .join('|');
}

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 420, height: 760 } });
await page.goto(URL, { waitUntil: 'networkidle' });
await page.waitForTimeout(1200);

const started = await page.evaluate(async () => {
    const game = window.__game;
    if (!game) return { ok: false, reason: 'no __game' };
    const menu = game.scene.getScene('MainMenu');
    if (menu && menu.scene.isActive()) {
        localStorage.removeItem('horse_merge_run_v1');
        menu.scene.start('Game', { startItems: [] });
    }
    for (let i = 0; i < 40; i++) {
        const sc = game.scene.getScene('Game');
        if (sc?.scene?.isActive?.() && sc.grid) return { ok: true };
        await new Promise(r => setTimeout(r, 100));
    }
    return { ok: false, reason: 'Game scene not ready' };
});

if (!started.ok) {
    console.log('START_FAIL', started);
    await browser.close();
    process.exit(1);
}

await page.waitForTimeout(600);

const dump = () => page.evaluate(() => {
    const sc = window.__game.scene.getScene('Game');
    const tiles = sc.grid.exportTiles().map(t => {
        const char = t.charId ? (sc.cache.json.get('characters') || []).find(c => c.id === t.charId) : null;
        return { ...t, level: char?.level ?? null, name: char?.name ?? t.itemId };
    });
    const blocked = sc.grid.exportBlocked();
    const blockedCells = [];
    blocked.forEach((row, r) => row.forEach((v, c) => { if (v) blockedCells.push(`${r},${c}`); }));
    return {
        tiles,
        count: tiles.length,
        blockedCells,
        maxLevel: sc.grid.getMaxLevel()
    };
});

const swipe = (x, y) => page.evaluate(([dx, dy]) => {
    const sc = window.__game.scene.getScene('Game');
    sc.grid.swipe(dx, dy);
}, [x, y]);

const dirs = [
    [0, 1, '下'],
    [0, -1, '上'],
    [1, 0, '右'],
    [-1, 0, '左'],
    [0, 1, '下'],
    [1, 0, '右'],
    [0, -1, '上'],
    [-1, 0, '左'],
    [0, 1, '下'],
    [1, 0, '右'],
    [0, -1, '上'],
    [-1, 0, '左'],
    [0, 1, '下'],
    [1, 0, '右'],
    [-1, 0, '左'],
    [0, -1, '上']
];

let before = await dump();
console.log('INIT', `pieces=${before.count}`, `max=${before.maxLevel}`, `blocked=${before.blockedCells.join(';') || 'none'}`);
console.log('BOARD', before.tiles.map(t => `(${t.r},${t.c})${t.name}Lv${t.level}`).join(' '));

const problems = [];
for (const [dx, dy, name] of dirs) {
    const prev = before;
    await swipe(dx, dy);
    await page.waitForTimeout(700);
    const after = await dump();
    const prevIds = new Map(prev.tiles.map(t => [`${t.r},${t.c}:${t.charId || t.itemId}`, t]));
    const afterKeys = new Set(after.tiles.map(t => `${t.charId || t.itemId}@${t.r},${t.c}`));
    const disappeared = prev.tiles.filter(t => {
        if (t.kind !== 'character') return !after.tiles.some(x => x.itemId === t.itemId);
        return !after.tiles.some(x => x.charId === t.charId && x.level === t.level)
            && !after.tiles.some(x => x.level === (t.level || 0) + 1);
    });
    const lost = prev.count - after.count;
    // A legal swipe: at most one spawn (+1) and merges reduce count. Net change typically -merges+1.
    // Illegal: many pieces gone without same-level partners.
    const sameLevelPairs = [];
    const byLevel = new Map();
    for (const t of prev.tiles) {
        if (t.level == null) continue;
        if (!byLevel.has(t.level)) byLevel.set(t.level, []);
        byLevel.get(t.level).push(t);
    }
    for (const [lv, list] of byLevel) {
        if (list.length >= 2) sameLevelPairs.push(`${lv}x${list.length}`);
    }
    console.log(
        `MOVE ${name}`,
        `pieces ${prev.count}->${after.count} (Δ${after.count - prev.count})`,
        `max=${after.maxLevel}`,
        `sameLevel=${sameLevelPairs.join(',') || 'none'}`,
        `blocked=${after.blockedCells.join(';') || 'none'}`
    );
    console.log('  AFTER', after.tiles.map(t => `(${t.r},${t.c})${t.name}Lv${t.level}`).join(' '));
    if (lost >= 2 && sameLevelPairs.length === 0) {
        problems.push(`${name}: 无同级可合成却少了 ${lost} 枚`);
    }
    if (disappeared.length >= 3) {
        problems.push(`${name}: 大量消失 ${disappeared.map(t => `${t.name}Lv${t.level}`).join(',')}`);
    }
    if (name === '下') {
        const byCol = new Map();
        for (const t of after.tiles) {
            if (!byCol.has(t.c)) byCol.set(t.c, []);
            byCol.get(t.c).push(t.r);
        }
        for (const [c, rows] of byCol) {
            rows.sort((a, b) => a - b);
            const expected = Array.from({ length: rows.length }, (_, i) => 6 - rows.length + i);
            if (rows.join(',') !== expected.join(',')) {
                problems.push(`下落后第${c}列有空洞: rows=${rows.join(',')}`);
            }
        }
    }
    before = after;
}

console.log('PROBLEMS', problems.length ? problems.join(' | ') : 'none');
await browser.close();
process.exit(problems.length ? 2 : 0);
