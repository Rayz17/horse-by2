import { chromium } from 'playwright';

const URL = process.env.PLAYTEST_URL || 'http://127.0.0.1:5173/';
const results = [];
const note = (name, ok, detail = '') => {
    results.push({ name, ok, detail });
    console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ' — ' + detail : ''}`);
};

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 720, height: 1280 } });
page.on('pageerror', err => console.log('PAGEERROR', err.message));

await page.addInitScript(() => {
    localStorage.setItem('horse_merge_seen_tips', '1');
    localStorage.removeItem('horse_merge_run_v1');
    localStorage.removeItem('horse_merge_run_side_v1');
});

await page.goto(URL, { waitUntil: 'domcontentloaded', timeout: 45000 });
await page.waitForFunction(() => window.__game?.scene?.isActive?.('MainMenu'), { timeout: 45000 });
await page.waitForTimeout(400);

const menu = await page.evaluate(() => {
    const scene = window.__game.scene.getScene('MainMenu');
    const texts = scene.children.list.filter(o => o.type === 'Text').map(t => t.text);
    return {
        texts,
        hasShort: texts.some(t => String(t).includes('短局')),
        hasGallery: texts.some(t => String(t).includes('图鉴')),
        hasDaily: texts.some(t => String(t).includes('今日挑战')),
        hasMute: texts.some(t => String(t).includes('音效') || String(t).includes('静音'))
    };
});
note('主菜单有短局入口', menu.hasShort, menu.texts.filter(t => /短局|开始|图鉴|今日/.test(t)).join(' | '));
note('主菜单有图鉴/今日挑战', menu.hasGallery && menu.hasDaily);

await page.evaluate(() => window.__game.scene.getScene('MainMenu').scene.start('Gallery'));
await page.waitForFunction(() => window.__game.scene.isActive('Gallery'), { timeout: 15000 });
await page.waitForTimeout(500);

const gallery = await page.evaluate(() => {
    const scene = window.__game.scene.getScene('Gallery');
    const texts = scene.children.list.filter(o => o.type === 'Text').map(t => t.text);
    const recipes = scene.cache.json.get('recipes') || [];
    const hinted = recipes.filter(r => r.hint);
    return {
        progress: texts.find(t => /角色\s+\d+\/\d+/.test(t)) || '',
        recipeCount: recipes.length,
        hinted: hinted.length,
        hints: hinted.map(r => r.hint)
    };
});
note('图鉴有完成度行', /角色\s+\d+\/\d+/.test(gallery.progress), gallery.progress);
note('未发现配方有 hint', gallery.hinted === gallery.recipeCount && gallery.recipeCount >= 8, `${gallery.hinted}/${gallery.recipeCount} ${gallery.hints.join(',')}`);

await page.evaluate(() => window.__game.scene.getScene('Gallery').scene.start('MainMenu'));
await page.waitForFunction(() => window.__game.scene.isActive('MainMenu'), { timeout: 10000 });

const daily = await page.evaluate(async () => {
    const menu = window.__game.scene.getScene('MainMenu');
    const dateKey = new Date().toLocaleDateString('en-CA').replace(/-/g, '');
    localStorage.removeItem('horse_merge_run_side_v1');
    menu.scene.start('Game', { mode: 'daily', dailySeed: dateKey });
    for (let i = 0; i < 50; i++) {
        const sc = window.__game.scene.getScene('Game');
        if (sc?.scene?.isActive?.() && sc.grid) break;
        await new Promise(r => setTimeout(r, 80));
    }
    const sc = window.__game.scene.getScene('Game');
    sc.persistRunState?.();
    const raw = localStorage.getItem('horse_merge_run_side_v1');
    const snap = raw ? JSON.parse(raw) : null;
    const std = localStorage.getItem('horse_merge_run_v1');
    return {
        mode: sc.runMode,
        dailySeed: sc.dailySeed,
        guestId: sc.guestId,
        snapMode: snap?.mode,
        snapSeed: snap?.dailySeed,
        standardPolluted: !!std,
        muteText: sc.muteBtnText?.text
    };
});
note('今日挑战进局并记下客串', daily.mode === 'daily' && !!daily.guestId, JSON.stringify(daily));
note('今日挑战写入 side 档且不污染标准档', daily.snapMode === 'daily' && daily.snapSeed && !daily.standardPolluted);
note('局内有静音钮', !!daily.muteText, daily.muteText);

const continueDaily = await page.evaluate(async () => {
    const sc = window.__game.scene.getScene('Game');
    sc.persistRunState?.();
    sc.audioManager?.stopBgm?.();
    sc.scene.start('MainMenu');
    for (let i = 0; i < 30; i++) {
        if (window.__game.scene.isActive('MainMenu')) break;
        await new Promise(r => setTimeout(r, 80));
    }
    const menu = window.__game.scene.getScene('MainMenu');
    const snap = JSON.parse(localStorage.getItem('horse_merge_run_side_v1') || 'null');
    menu.scene.start('Game', {
        mode: snap?.mode || 'daily',
        continueRun: true,
        dailySeed: snap?.dailySeed,
        guestId: snap?.guestId
    });
    for (let i = 0; i < 50; i++) {
        const game = window.__game.scene.getScene('Game');
        if (game?.scene?.isActive?.() && game.grid) break;
        await new Promise(r => setTimeout(r, 80));
    }
    const game = window.__game.scene.getScene('Game');
    return { mode: game.runMode, dailySeed: game.dailySeed, guestId: game.guestId };
});
note('今日挑战续玩保住每日规则', continueDaily.mode === 'daily' && !!continueDaily.dailySeed, JSON.stringify(continueDaily));

const shortModes = [];
for (const mode of ['sprint', 'bossRush', 'recipeHunt']) {
    const info = await page.evaluate(async (runMode) => {
        localStorage.setItem('horse_merge_run_v1', JSON.stringify({
            schemaVersion: 2, mode: 'standard', score: 123, runGold: 1000, inventory: [],
            tiles: [], blocked: [], endgamePhase: 'normal', harmonyChallengeAccepted: false,
            harmonyStableMoves: 0, endgameEventCount: 0, harmonyAchieved: false,
            minActiveLevel: 1, maxProgressLevel: 8, mergeMoveCount: 3, bossDefeatedCount: 0,
            highestLevelReached: 8, tagCounts: {}, endingStyleScores: {},
            pendingLevel101Choice: false, level101ChoiceResolved: false,
            chapterObjectivesDone: [], criticalPityCounter: 0, undoRemaining: 1
        }));
        localStorage.removeItem('horse_merge_run_side_v1');
        const current = window.__game.scene.getScene('Game') || window.__game.scene.getScene('MainMenu');
        current.scene.start('Game', { mode: runMode });
        for (let i = 0; i < 50; i++) {
            const sc = window.__game.scene.getScene('Game');
            if (sc?.scene?.isActive?.() && sc.grid && sc.runMode === runMode) break;
            await new Promise(r => setTimeout(r, 80));
        }
        const sc = window.__game.scene.getScene('Game');
        sc.persistRunState?.();
        const std = JSON.parse(localStorage.getItem('horse_merge_run_v1') || 'null');
        const side = JSON.parse(localStorage.getItem('horse_merge_run_side_v1') || 'null');
        const items = sc.shopPanel ? sc.shopPanel.list.length : 0;
        return {
            mode: sc.runMode,
            sprintLeft: sc.sprintMovesLeft,
            shopKids: items,
            stdScore: std?.score,
            sideMode: side?.mode,
            undoHidden: !sc.undoBtn?.visible
        };
    }, mode);
    shortModes.push(info);
    note(`${mode} 能进局且不覆盖标准档`, info.mode === mode && info.stdScore === 123, JSON.stringify(info));
}
note('冲分无悔棋并倒数步数', shortModes[0]?.undoHidden && shortModes[0]?.sprintLeft === 30);

const juice = await page.evaluate(async () => {
    const sc = window.__game.scene.getScene('Game');
    sc.chapterEventsFired = new Set();
    sc.chapterId = 'chapter_start';
    sc.highestLevelReached = 16;
    sc.fireChapterEvent('chapter_mutation');
    const help = sc.grid.getRecipeHelpForced();
    sc.fireChapterEvent('chapter_myth');
    sc.fireChapterEvent('chapter_star');
    const extraLow = sc.grid.getExtraLowSpawns();
    const pairOn = typeof sc.tickPairAura === 'function';
    const bole = typeof sc.showBoleSealOverlay === 'function';
    sc.showLevel101ChoiceOverlay();
    const overlayTexts = sc.children.list
        .flatMap(o => (o.list ? o.list : [o]))
        .flatMap(o => (o.list ? o.list : [o]))
        .filter(o => o.type === 'Text')
        .map(t => t.text);
    const hasRoutes = ['赛博', '古风', '动漫', '神话'].every(label => overlayTexts.some(t => String(t).includes(label)));
    return { help, extraLow, pairOn, bole, hasRoutes, overlayTexts: overlayTexts.slice(0, 20) };
});
note('切章事件会改生成', juice.help >= 5 && juice.extraLow >= 1, JSON.stringify({ help: juice.help, extraLow: juice.extraLow }));
note('成双/伯乐方法在', juice.pairOn && juice.bole);
note('101 能点四路线', juice.hasRoutes, (juice.overlayTexts || []).join(' | '));

const fortune = await page.evaluate(() => {
    const sc = window.__game.scene.getScene('Game');
    const report = sc.buildEndingReport('deadlockEnding', sc.grid.getBestCharacter(), null, sc.grid.getHarmonySnapshot());
    return {
        lines: report.fortuneLines || [],
        title: report.storyTitle,
        tone: report.fortuneTone
    };
});
note('死局有三句签和丧签标题', (fortune.lines?.length || 0) >= 3 && !!fortune.title, JSON.stringify(fortune));

const mute = await page.evaluate(() => {
    const sc = window.__game.scene.getScene('Game');
    const before = sc.audioManager.isMuted();
    sc.audioManager.toggleMuted();
    const after = sc.audioManager.isMuted();
    sc.muteBtnText?.setText(after ? '静音' : '音效');
    const sceneStillGame = sc.scene.isActive();
    sc.audioManager.setMuted(before);
    return { flipped: before !== after, sceneStillGame, label: sc.muteBtnText?.text };
});
note('局内静音立刻生效且不重开场景', mute.flipped && mute.sceneStillGame, JSON.stringify(mute));

const shop = await page.evaluate(() => {
    const sc = window.__game.scene.getScene('Game');
    const items = (sc.cache.json.get('items') || []).filter(i => i.price > 0);
    sc.createShop();
    const interactive = [];
    const walk = (node) => {
        if (!node) return;
        if (node.input?.enabled && node.parentContainer) interactive.push(1);
        (node.list || []).forEach(walk);
    };
    walk(sc.shopPanel);
    return { buyable: items.length, shopButtons: interactive.length };
});
note('商店按章只上有限货架', shop.shopButtons <= 4 && shop.buyable >= 4, JSON.stringify(shop));

const pwa = await page.evaluate(async () => {
    const man = await fetch('./manifest.webmanifest').then(r => ({ ok: r.ok, type: r.headers.get('content-type') })).catch(() => ({ ok: false }));
    const icon = document.querySelector('link[rel="icon"]')?.getAttribute('href') || '';
    return { manOk: man.ok, noViteSvg: !icon.includes('vite.svg'), theme: document.querySelector('meta[name="theme-color"]')?.content };
});
note('PWA 清单与无 vite.svg', pwa.manOk && pwa.noViteSvg, JSON.stringify(pwa));

await browser.close();
const failed = results.filter(r => !r.ok);
console.log(`\n${results.length - failed.length}/${results.length} passed`);
if (failed.length) process.exit(1);
