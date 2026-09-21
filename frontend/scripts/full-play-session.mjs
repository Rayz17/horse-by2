import { chromium } from 'playwright';
import { mkdirSync, writeFileSync } from 'node:fs';

const URL = 'http://127.0.0.1:5173/';
const OUT = '/tmp/horse-play-session';
mkdirSync(OUT, { recursive: true });

const notes = [];
const shot = async (page, name) => {
    const path = `${OUT}/${name}.png`;
    await page.screenshot({ path, fullPage: true });
    return path;
};
const note = (area, severity, title, detail) => {
    notes.push({ area, severity, title, detail });
    console.log(`[${severity}] ${area} · ${title}${detail ? ' — ' + detail : ''}`);
};

const waitScene = async (page, key, ms = 20000) => {
    await page.waitForFunction((k) => window.__game?.scene?.isActive?.(k), key, { timeout: ms });
};

const evalGame = (page, fn, arg) => page.evaluate(fn, arg);

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 720, height: 1280 } });
const pageErrors = [];
page.on('pageerror', err => pageErrors.push(err.message));

await page.addInitScript(() => {
    localStorage.setItem('horse_merge_seen_tips', '1');
    localStorage.removeItem('horse_merge_run_v1');
    localStorage.removeItem('horse_merge_run_side_v1');
});

await page.goto(URL, { waitUntil: 'domcontentloaded', timeout: 45000 });
await waitScene(page, 'MainMenu');
await page.waitForTimeout(500);
await shot(page, '01-main-menu');

const menuLayout = await page.evaluate(() => {
    const scene = window.__game.scene.getScene('MainMenu');
    return scene.children.list.filter(o => o.type === 'Text').map(t => ({
        text: t.text, x: Math.round(t.x), y: Math.round(t.y), w: Math.round(t.width), h: Math.round(t.height)
    }));
});
const title = menuLayout.find(t => t.text.includes('Horse'));
const shortBtn = menuLayout.find(t => t.text === '短局');
const startBtn = menuLayout.find(t => t.text.includes('开始'));
if (shortBtn && startBtn && Math.abs(shortBtn.y - startBtn.y) < 8 && (startBtn.x + startBtn.w / 2) > (shortBtn.x - shortBtn.w / 2)) {
    note('排版', 'medium', '开始游戏与短局挤在同一行', `start=${startBtn.x},${startBtn.y} short=${shortBtn.x},${shortBtn.y}`);
}
if (menuLayout.some(t => t.y > 1200)) note('排版', 'low', '主菜单底部元素贴近屏幕底', '');
console.log('MENU', JSON.stringify(menuLayout.filter(t => /开始|短局|图鉴|今日|静音|音效|Horse/.test(t.text))));

// Gallery
await page.evaluate(() => window.__game.scene.getScene('MainMenu').scene.start('Gallery'));
await waitScene(page, 'Gallery');
await page.waitForTimeout(600);
await shot(page, '02-gallery-chars');
const gal = await page.evaluate(() => {
    const scene = window.__game.scene.getScene('Gallery');
    const texts = scene.children.list.filter(o => o.type === 'Text').map(t => ({
        text: t.text, x: Math.round(t.x), y: Math.round(t.y)
    }));
    return texts;
});
const progress = gal.find(t => /角色/.test(t.text));
if (progress && /角色 0\/101/.test(progress.text)) {
    note('功能', 'medium', '图鉴完成度分母把 recipeOnly 也算进公开角色', progress.text);
}
await page.mouse.click(580, 148);
await page.waitForTimeout(400);
await shot(page, '03-gallery-recipes');
await page.mouse.click(360, 360);
await page.waitForTimeout(400);
await shot(page, '04-recipe-hint-detail');

// Short overlay via menu
await page.evaluate(() => window.__game.scene.getScene('Gallery').scene.start('MainMenu'));
await waitScene(page, 'MainMenu');
await page.waitForTimeout(300);
await page.evaluate(() => window.__game.scene.getScene('MainMenu').showShortModeOverlay());
await page.waitForTimeout(300);
await shot(page, '05-short-overlay');

// ===== Run 1: sprint play 30 swipes =====
await page.evaluate(() => {
    localStorage.removeItem('horse_merge_run_side_v1');
    window.__game.scene.getScene('MainMenu').scene.start('Game', { mode: 'sprint' });
});
await waitScene(page, 'Game');
await page.waitForTimeout(700);
await shot(page, '06-sprint-start');

const swipe = async (dx, dy) => {
    await page.evaluate(([x, y]) => {
        const sc = window.__game.scene.getScene('Game');
        sc.grid.swipe(x, y);
    }, [dx, dy]);
    await page.waitForTimeout(220);
};

const dirs = [[0, 1], [0, -1], [1, 0], [-1, 0]];
for (let i = 0; i < 32; i++) {
    await swipe(...dirs[i % 4]);
    const state = await evalGame(page, () => {
        const sc = window.__game.scene.getScene('Game');
        return {
            scene: sc?.scene?.isActive?.() ? 'Game' : (window.__game.scene.isActive('GameOver') ? 'GameOver' : 'other'),
            left: sc?.sprintMovesLeft,
            score: sc?.score,
            max: sc?.grid?.getMaxLevel?.()
        };
    });
    if (state.scene === 'GameOver' || (state.left === 0 && i > 5)) break;
}
await page.waitForTimeout(1400);
const afterSprint = await page.evaluate(() => ({
    gameOver: window.__game.scene.isActive('GameOver'),
    game: window.__game.scene.isActive('Game'),
    texts: (window.__game.scene.getScene(window.__game.scene.isActive('GameOver') ? 'GameOver' : 'Game')
        .children.list.filter(o => o.type === 'Text').slice(0, 12).map(t => t.text))
}));
await shot(page, afterSprint.gameOver ? '07-sprint-gameover' : '07-sprint-still-playing');
if (!afterSprint.gameOver) {
    note('功能', 'high', '三十步冲分滑满后未稳定进入结算', JSON.stringify(afterSprint));
    await page.evaluate(() => {
        const sc = window.__game.scene.getScene('Game');
        if (sc) sc.triggerGameOver(sc.grid.getMaxLevel() >= 101 ? 'normalEnding' : 'deadlockEnding');
    });
    await page.waitForTimeout(1200);
}
await waitScene(page, 'GameOver').catch(() => {});
await page.waitForTimeout(400);
await shot(page, '08-sprint-over-card');
const over1 = await page.evaluate(() => {
    const sc = window.__game.scene.getScene('GameOver');
    return sc.children.list.filter(o => o.type === 'Text').map(t => ({
        text: t.text, x: Math.round(t.x), y: Math.round(t.y), w: Math.round(t.width)
    }));
});
const longTitle = over1.find(t => t.y < 100 && t.text.length > 18);
if (longTitle) note('排版', 'medium', '死局/短局标题过长容易顶栏溢出', `${longTitle.text.slice(0, 40)} y=${longTitle.y} w=${longTitle.w}`);
const share = over1.find(t => t.text.includes('炫耀'));
if (share && share.y > 1100) note('排版', 'low', '炫耀按钮偏下，手机 Home 条可能挡住', `y=${share.y}`);

// Fortune generate
await page.evaluate(() => {
    const sc = window.__game.scene.getScene('GameOver');
    sc.generateFortuneCard?.();
});
await page.waitForTimeout(800);
await shot(page, '09-fortune-card-flash');

await page.evaluate(() => window.__game.scene.getScene('GameOver').scene.start('MainMenu'));
await waitScene(page, 'MainMenu');

// ===== Run 2: daily guest + mute + shop =====
await page.evaluate(() => {
    const key = `${new Date().getFullYear()}${String(new Date().getMonth() + 1).padStart(2, '0')}${String(new Date().getDate()).padStart(2, '0')}`;
    window.__game.scene.getScene('MainMenu').scene.start('Game', { mode: 'daily', dailySeed: key });
});
await waitScene(page, 'Game');
await page.waitForTimeout(800);
await shot(page, '10-daily-guest');
const dailyInfo = await evalGame(page, () => {
    const sc = window.__game.scene.getScene('Game');
    const toasts = sc.children.list.filter(o => o.type === 'Text').map(t => t.text);
    return {
        guestId: sc.guestId,
        gold: sc.runGold,
        mute: sc.muteBtnText?.text,
        shopSlots: (sc.shopPanel?.list || []).length,
        hud: sc.modeHudText?.text,
        undoVisible: sc.undoBtn?.visible
    };
});
if (!dailyInfo.guestId) note('功能', 'high', '今日挑战未见客串马', JSON.stringify(dailyInfo));
if (dailyInfo.undoVisible) note('功能', 'medium', '今日挑战悔棋仍可见', '');
await page.mouse.click(478, 40);
await page.waitForTimeout(200);
const muted = await evalGame(page, () => window.__game.scene.getScene('Game').audioManager.isMuted());
await shot(page, '11-daily-muted');
if (!muted) note('交互', 'medium', '点击顶栏静音热区未切到静音', '坐标 478,40');
for (let i = 0; i < 8; i++) await swipe(...dirs[i % 4]);
await shot(page, '12-daily-after-swipes');

// Shop click
await page.mouse.click(180, 1188);
await page.waitForTimeout(300);
const goldAfterBuy = await evalGame(page, () => window.__game.scene.getScene('Game').runGold);
await shot(page, '13-daily-shop-click');

// Continue check
await page.evaluate(() => {
    const sc = window.__game.scene.getScene('Game');
    sc.persistRunState();
    sc.scene.start('MainMenu');
});
await waitScene(page, 'MainMenu');
await page.waitForTimeout(400);
await shot(page, '14-continue-after-daily');
const continueLabel = await page.evaluate(() => {
    const scene = window.__game.scene.getScene('MainMenu');
    return scene.children.list.filter(o => o.type === 'Text').map(t => t.text).find(t => String(t).includes('继续'));
});
if (!continueLabel) note('功能', 'high', '今日挑战回菜单后没有继续入口', '');

// ===== Run 3: 101 route seal =====
await page.evaluate(() => {
    window.__game.scene.getScene('MainMenu').scene.start('Game', { mode: 'standard', startItems: [] });
});
await waitScene(page, 'Game');
await page.waitForTimeout(500);
await page.evaluate(() => {
    const sc = window.__game.scene.getScene('Game');
    sc.highestLevelReached = 101;
    sc.showLevel101ChoiceOverlay();
});
await page.waitForTimeout(400);
await shot(page, '15-101-overlay');
const routeHit = await page.evaluate(() => {
    const sc = window.__game.scene.getScene('Game');
    const texts = [];
    const walk = (n) => {
        if (!n) return;
        if (n.type === 'Text') texts.push({ text: n.text, x: Math.round(n.x), y: Math.round(n.y), vis: n.visible });
        (n.list || []).forEach(walk);
    };
    sc.children.list.forEach(walk);
    return texts.filter(t => /赛博|古风|动漫|神话|结束游戏|挑战大和谐|宇宙神驹/.test(t.text));
});
if (!routeHit.some(t => t.text === '赛博')) note('功能', 'high', '101 分流上看不到四路线按钮文案', JSON.stringify(routeHit));
await page.evaluate(() => {
    const sc = window.__game.scene.getScene('Game');
    sc.routeLock = 'cyberSciFi';
    sc.endingStyleScores.cyberSciFi += 20;
    sc.level101ChoiceResolved = true;
    sc.isShowingUnlock = false;
    sc.triggerGameOver('normalEnding');
});
await page.waitForTimeout(1400);
await waitScene(page, 'GameOver').catch(() => {});
await shot(page, '16-route-seal-over');

// ===== Run 4: bole + deadlock ritual =====
await page.evaluate(() => window.__game.scene.getScene('GameOver').scene.start('Game', { mode: 'standard', startItems: [] }));
await waitScene(page, 'Game');
await page.waitForTimeout(400);
await page.evaluate(() => {
    const sc = window.__game.scene.getScene('Game');
    sc.showBoleSealOverlay();
});
await page.waitForTimeout(400);
await shot(page, '17-bole-overlay');
const boleTexts = await page.evaluate(() => {
    const sc = window.__game.scene.getScene('Game');
    const texts = [];
    const walk = (n) => { if (n?.type === 'Text') texts.push(n.text); (n.list || []).forEach(walk); };
    sc.children.list.forEach(walk);
    return texts.filter(t => /伯乐|确认封卷|点两/.test(t));
});
if (!boleTexts.length) note('功能', 'medium', '伯乐封卷层文案未出现（盘面马不足两只？）', '');

await page.evaluate(() => {
    const sc = window.__game.scene.getScene('Game');
    sc.finalizeDeadlockCheck();
});
await page.waitForTimeout(400);
await shot(page, '18-deadlock-ritual');
const giveUp = await page.evaluate(() => {
    const sc = window.__game.scene.getScene('Game');
    return sc.giveUpBtn ? { vis: sc.giveUpBtn.visible, y: sc.giveUpBtn.y } : null;
});
if (!giveUp?.vis) note('趣味', 'medium', '濒死仪式未出现放弃钮（盘面未满或仍可滑动）', JSON.stringify(giveUp));

// Pair + chapter events visual
await page.evaluate(() => {
    const sc = window.__game.scene.getScene('Game');
    sc.grid.forceSpawnById('bamboo_horse');
    sc.grid.forceSpawnById('white_base');
    sc.tickPairAura();
    sc.chapterEventsFired = new Set();
    sc.fireChapterEvent('chapter_mutation');
});
await page.waitForTimeout(600);
await shot(page, '19-pair-and-event');

// Quip
await page.evaluate(() => {
    const sc = window.__game.scene.getScene('Game');
    const tile = sc.grid.getAllTiles().find(t => t.character && t.character.id === 'bamboo_horse');
    if (tile) sc.executeCharacterSkill(tile);
});
await page.waitForTimeout(200);
await shot(page, '20-bamboo-quip');

// Boss rush start
await page.evaluate(() => {
    const sc = window.__game.scene.getScene('Game');
    sc.scene.start('Game', { mode: 'bossRush' });
});
await waitScene(page, 'Game');
await page.waitForTimeout(800);
await shot(page, '21-boss-rush');
const rush = await evalGame(page, () => {
    const sc = window.__game.scene.getScene('Game');
    return { mode: sc.runMode, max: sc.grid.getMaxLevel(), hud: sc.modeHudText?.text };
});
if (rush.max < 16) note('趣味', 'low', 'Boss Rush 开局等级带偏弱，爬坡仍长', JSON.stringify(rush));

await page.evaluate(() => {
    const sc = window.__game.scene.getScene('Game');
    sc.triggerGameOver('normalEnding');
});
await page.waitForTimeout(1200);
await shot(page, '22-bossrush-over');

if (pageErrors.length) {
    const uniq = [...new Set(pageErrors)];
    note('效果', 'medium', '页面运行期错误', uniq.join(' | '));
}

writeFileSync(`${OUT}/notes.json`, JSON.stringify({ notes, menuLayout, dailyInfo, routeHit, over1, pageErrors }, null, 2));
console.log(`\nSHOTS ${OUT}`);
console.log(`NOTES ${notes.length}`);
await browser.close();
