/**
 * 冒烟回归脚本：覆盖三类历史事故
 *  1. 图鉴崩溃：玩过一局（延迟加载的立绘全部就位）后打开图鉴，
 *     ensureCharacter 的同步 onReady 回调曾导致 showPage 无限递归（栈溢出、全场景失活）。
 *  2. 悔棋竞态：滑动结算（250ms delayedCall）落定前按 Z 悔棋，
 *     滞后的结算回调（补落子/压实）曾覆盖已回滚的盘面。
 *  3. 基础对局流：主菜单 → 开局 → 键盘滑动合成 → 回主菜单。
 *
 * 用法：
 *   node scripts/smoke-regression.mjs                 # 自带 vite dev server (端口 8199)
 *   BASE_URL=http://127.0.0.1:4173 node scripts/...  # 针对已启动的服务（如 vite preview）
 */
import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import { setTimeout as sleep } from 'node:timers/promises';
import { fileURLToPath } from 'node:url';

const PORT = 8199;
let BASE_URL = process.env.BASE_URL || '';
const FRONTEND_DIR = fileURLToPath(new URL('..', import.meta.url));

const results = [];
const check = (name, ok, detail = '') => {
  results.push(ok);
  console.log(`${ok ? 'PASS' : 'FAIL'} ${name}${detail ? ' — ' + detail : ''}`);
};

let server;
let serverPort = PORT;

async function startServer() {
  if (process.env.BASE_URL) return;
  // 端口可能被其他进程占用（探测到 200 也未必是我们的游戏），
  // 依次尝试多个端口，并校验返回内容里确实有本项目的入口脚本。
  for (let offset = 0; offset < 5; offset++) {
    serverPort = PORT + offset;
    const url = `http://127.0.0.1:${serverPort}/`;
    server = spawn('npx', ['vite', '--port', String(serverPort), '--strictPort'], {
      cwd: FRONTEND_DIR,
      stdio: 'ignore',
      detached: true,
    });
    let owned = false;
    for (let i = 0; i < 40; i++) {
      try {
        const res = await fetch(url);
        const html = await res.text();
        if (res.ok && html.includes('/src/main.ts')) { owned = true; break; }
      } catch { /* not ready yet */ }
      await sleep(500);
    }
    if (owned) {
      BASE_URL = url;
      console.log(`vite dev server ready at ${url}`);
      return;
    }
    killServer();
  }
  throw new Error(`no free port for vite dev server (tried ${PORT}..${PORT + 4})`);
}

function killServer() {
  if (!server) return;
  try { process.kill(-server.pid, 'SIGTERM'); } catch { /* already gone */ }
  server = null;
}

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 720, height: 1280 } });

const pageErrors = [];
page.on('pageerror', (err) => pageErrors.push(String(err?.message || err)));

try {
  await startServer();

  // 提前标记“已读新手引导”，避免引导弹窗挡住棋盘输入
  await page.addInitScript(() => localStorage.setItem('horse_merge_seen_tips', '1'));

  await page.goto(BASE_URL, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForFunction(
    () => window.__game && window.__game.scene.isActive('MainMenu'),
    null, { timeout: 60000 }
  );
  check('主菜单加载', true);

  // 与开局补给「跳过，直接开局」等价的开局调用
  await page.evaluate(() => {
    window.__game.scene.getScene('MainMenu').scene.start('Game', { mode: 'standard', startItems: [] });
  });
  await page.waitForFunction(() => window.__game.scene.isActive('Game'), null, { timeout: 30000 });
  await page.waitForTimeout(800);
  check('进入对局', true);

  const dismissOverlays = async () => {
    // 合成可能连发多张解锁卡，清空整个队列（fade 期间 unlockCloser 为 null，需多轮探测）
    for (let i = 0; i < 15; i++) {
      const state = await page.evaluate(() => {
        const s = window.__game.scene.getScene('Game');
        if (s.isShowingUnlock && s.unlockCloser) { s.unlockCloser(); return 'closed'; }
        return s.isShowingUnlock ? 'fading' : 'clear';
      });
      if (state === 'clear') return true;
      await page.waitForTimeout(400);
    }
    return !(await page.evaluate(() => window.__game.scene.getScene('Game').isShowingUnlock));
  };

  const sig = () => page.evaluate(() => {
    const g = window.__game.scene.getScene('Game').grid;
    return JSON.stringify(
      g.getAllTiles().map(t => [t.row, t.col, t.character ? t.character.level : -1]).sort((a, b) => a[0] - b[0] || a[1] - b[1])
    );
  });
  const resetUndo = () => page.evaluate(() => {
    const s = window.__game.scene.getScene('Game');
    s.undoRemaining = 1;
    s.undoBtn?.setText('悔棋 1');
  });
  const getUndoRemaining = () => page.evaluate(() => window.__game.scene.getScene('Game').undoRemaining);
  const pressKey = (key) => page.keyboard.press(key);

  /**
   * 悔棋一次并确认真正触发：Z 键在解锁卡等弹窗打开时会被输入锁吞掉，
   * 因此读取 undoRemaining 确认消耗，未触发则清理弹窗后重试。
   */
  const undoWithVerify = async () => {
    for (let i = 0; i < 3; i++) {
      await dismissOverlays();
      const before = await getUndoRemaining();
      await pressKey('KeyZ');
      await page.waitForTimeout(500);
      if ((await getUndoRemaining()) < before) return true;
    }
    return false;
  };

  // —— 找有效方向，并把盘面养到 ≥6 子 ——
  // 空盘 pity（occupied < emptyBoardThreshold=4）会在后续结算里自动补子，
  // 低于阈值的盘面上做悔棋断言会撞上游戏自己的安全网，属于无效测试。
  // 合并会吃掉棋子，滑动自然增长在 CI 上偶发不达标，因此用调试生成接口
  // 在每次断言前即时保证规模（ensureTiles），保证前置条件确定性成立。
  const DIRECTIONS = ['ArrowRight', 'ArrowUp', 'ArrowLeft', 'ArrowDown'];
  const tileCount = () => page.evaluate(() => window.__game.scene.getScene('Game').grid.getAllTiles().length);
  const ensureTiles = async () => page.evaluate(() => {
    const grid = window.__game.scene.getScene('Game').grid;
    let guard = 0;
    while (grid.getAllTiles().length < 6 && guard++ < 10) grid.forceSpawnCharacter(1);
    return grid.getAllTiles().length;
  });
  let validDir = null;
  for (let i = 0; i < 12; i++) {
    await dismissOverlays();
    await ensureTiles();
    const dir = DIRECTIONS[i % 4];
    const before = await sig();
    await pressKey(dir);
    await page.waitForTimeout(700);
    if ((await sig()) !== before) validDir = dir;
    if (validDir && (await tileCount()) >= 6) break;
  }
  check('棋盘可动且规模健康', !!validDir && (await tileCount()) >= 6,
    `dir=${validDir} tiles=${await tileCount()}`);

  let plainUndoOk = false;
  let plainUndoDetail = '';
  if (validDir) {
    // 慢环境下偶发一次不干净的移动链（输入缓冲等），失败后整体重试一次
    for (let attempt = 0; attempt < 2 && !plainUndoOk; attempt++) {
      await dismissOverlays();
      await ensureTiles();
      await resetUndo();
      const before = await sig();
      await pressKey(validDir);
      await page.waitForTimeout(1000);
      const fired = await undoWithVerify();
      await page.waitForTimeout(700);
      const after = await sig();
      plainUndoOk = fired && after === before;
      if (!plainUndoOk) {
        plainUndoDetail = `attempt${attempt + 1} undoFired=${fired} tiles ${JSON.parse(before).length}→${JSON.parse(after).length}`;
      }
    }
    check('悔棋回滚（结算完成后）', plainUndoOk, plainUndoOk ? '' : plainUndoDetail);
  }

  // —— 悔棋竞态：滑动后 60ms 内立刻 Z（250ms 结算窗口内）——
  let raceUndoOk = false;
  if (validDir) {
    await dismissOverlays();
    await ensureTiles();
    await resetUndo();
    const before = await sig();
    await pressKey(validDir);
    await page.waitForTimeout(60);
    await pressKey('KeyZ');
    await page.waitForTimeout(1200);
    await dismissOverlays();
    await page.waitForTimeout(400);
    const raceFired = (await getUndoRemaining()) === 0; // Z 确实触发（未被弹窗吞掉）
    const after = await sig();
    raceUndoOk = raceFired && after === before;
    check('悔棋竞态（滑动后立即 Z）', raceUndoOk,
      raceUndoOk ? '盘面未被滞后结算覆盖' : `undoFired=${raceFired} tiles ${JSON.parse(before).length}→${JSON.parse(after).length}`);
  }

  // —— 等延迟加载的角色贴图全部就位（复现图鉴崩溃的前提；未就位则显式失败）——
  let deferredReady = true;
  try {
    await page.waitForFunction(() => {
      const g = window.__game;
      const chars = g.cache.json.get('characters') || [];
      return chars.filter(c => c.level > 35 && !c.hiddenEnding)
        .every(c => g.textures.exists(c.id));
    }, null, { timeout: 120000 });
  } catch {
    deferredReady = false;
  }
  const deferredState = await page.evaluate(() => {
    const g = window.__game;
    const chars = (g.cache.json.get('characters') || []).filter(c => c.level > 35 && !c.hiddenEnding);
    return `${chars.filter(c => g.textures.exists(c.id)).length}/${chars.length}`;
  });
  check('延迟立绘全部就位（图鉴崩溃前提）', deferredReady, deferredState);
  await page.waitForTimeout(1000);

  // —— 回主菜单再开图鉴（历史崩溃点）——
  await dismissOverlays();
  await page.evaluate(() => window.__game.scene.getScene('Game').scene.start('MainMenu'));
  await page.waitForFunction(() => window.__game.scene.isActive('MainMenu'), null, { timeout: 30000 });
  await page.evaluate(() => window.__game.scene.getScene('MainMenu').scene.start('Gallery'));
  await page.waitForFunction(() => window.__game.scene.isActive('Gallery'), null, { timeout: 30000 });
  await page.waitForTimeout(3500); // 崩溃发生在 create 期间的同步回调链上

  const galleryAlive = await page.evaluate(() => {
    const g = window.__game;
    const gal = g.scene.getScene('Gallery');
    return {
      active: gal?.sys.isActive() === true,
      anySceneActive: g.scene.scenes.some(s => s.sys.isActive()),
      cards: gal?.container ? gal.container.list.length : -1,
      pageText: gal?.pageText ? gal.pageText.text : '',
    };
  });
  check('图鉴打开后场景存活', galleryAlive.active && galleryAlive.anySceneActive, `cards=${galleryAlive.cards}`);
  check('图鉴列表已渲染', galleryAlive.cards >= 18, `container.list=${galleryAlive.cards}`);

  const stackErrors = pageErrors.filter(e => /Maximum call stack|RangeError/i.test(e));
  check('无栈溢出/未捕获异常', stackErrors.length === 0, stackErrors.join(' | ').slice(0, 200));
  if (pageErrors.length > 0) console.log('pageerrors:', pageErrors.slice(0, 5).join(' | '));
} catch (err) {
  results.push(false);
  console.log('FAIL 脚本执行异常 —', err?.message || err);
} finally {
  await browser.close();
  killServer();
}

const failed = results.filter(r => !r).length;
console.log(`\nsmoke-regression: ${results.length - failed}/${results.length} passed`);
process.exit(failed === 0 ? 0 : 1);
