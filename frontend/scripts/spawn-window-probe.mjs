/**
 * 生成窗口回归：驱动一局 70 步，包装 SpawnSystem.decideSpawn 记录每次决策，
 * 断言没有任何角色生成越过节奏保护窗口（≤ max(2, 棋盘最高等级-2)）。
 * 背景：Boss 弱点补位分支曾无视窗口原级砸下高级角色（低级盘面刷出 Lv.15/21/43…），
 * 抬高生成上限后不断滚出 37 级左右的角色。
 *
 * 用法：node scripts/spawn-window-probe.mjs   （自带 vite dev server，端口 8202）
 */
import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import { setTimeout as sleep } from 'node:timers/promises';
import { fileURLToPath } from 'node:url';

const PORT = 8202;
let BASE_URL = process.env.BASE_URL || '';
const FRONTEND_DIR = fileURLToPath(new URL('..', import.meta.url));

let server;
async function startServer() {
  if (process.env.BASE_URL) return;
  for (let offset = 0; offset < 5; offset++) {
    const port = PORT + offset;
    const url = `http://127.0.0.1:${port}/`;
    server = spawn('npx', ['vite', '--port', String(port), '--strictPort'], {
      cwd: FRONTEND_DIR, stdio: 'ignore', detached: true,
    });
    let owned = false;
    for (let i = 0; i < 40; i++) {
      try {
        const res = await fetch(url);
        const html = await res.text();
        if (res.ok && html.includes('/src/main.ts')) { owned = true; break; }
      } catch { /* not ready */ }
      await sleep(500);
    }
    if (owned) { BASE_URL = url; return; }
    try { process.kill(-server.pid, 'SIGTERM'); } catch { /* gone */ }
  }
  throw new Error('no free port for vite dev server');
}

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 720, height: 1280 } });
let failed = false;

try {
  await startServer();
  await page.addInitScript(() => localStorage.setItem('horse_merge_seen_tips', '1'));
  await page.goto(BASE_URL, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForFunction(() => window.__game && window.__game.scene.isActive('MainMenu'), null, { timeout: 60000 });
  await page.evaluate(() => window.__game.scene.getScene('MainMenu').scene.start('Game', { mode: 'standard', startItems: [] }));
  await page.waitForFunction(() => window.__game.scene.isActive('Game'), null, { timeout: 30000 });
  await page.waitForTimeout(1200);

  // 仪表：包装 decideSpawn
  await page.evaluate(() => {
    const grid = window.__game.scene.getScene('Game').grid;
    window.__spawnLog = [];
    const sys = grid.spawnSystem;
    const orig = sys.decideSpawn.bind(sys);
    sys.decideSpawn = (params) => {
      const res = orig(params);
      window.__spawnLog.push({
        reason: res.reason, kind: res.kind,
        lvl: res.char ? res.char.level : null,
        boardMax: params.maxLevel, minActive: params.minActiveLevel,
      });
      return res;
    };
  });

  const dirs = ['ArrowRight', 'ArrowUp', 'ArrowLeft', 'ArrowDown'];
  const dismiss = async () => {
    for (let i = 0; i < 12; i++) {
      const st = await page.evaluate(() => {
        const s = window.__game.scene.getScene('Game');
        if (s.isShowingUnlock && s.unlockCloser) { s.unlockCloser(); return 'c'; }
        return s.isShowingUnlock ? 'w' : 'clear';
      });
      if (st === 'clear') return;
      await page.waitForTimeout(420);
    }
  };

  for (let i = 0; i < 70; i++) {
    await dismiss();
    await page.keyboard.press(dirs[i % 4]);
    await page.waitForTimeout(500);
  }
  await dismiss();

  const { log, violations, byReason } = await page.evaluate(() => {
    const log = window.__spawnLog;
    const violations = log.filter(e =>
      e.kind === 'character' && e.lvl > Math.max(2, e.boardMax - 2)
    );
    const byReason = {};
    log.forEach(e => { byReason[e.reason] = (byReason[e.reason] || 0) + 1; });
    return { log, violations, byReason };
  });

  console.log(`spawn decisions: ${log.length}, by reason: ${JSON.stringify(byReason)}`);
  if (violations.length > 0) {
    failed = true;
    console.log('FAIL 越窗生成:');
    violations.slice(0, 10).forEach(v => console.log('  ', JSON.stringify(v)));
  } else {
    console.log('PASS 所有生成均在节奏保护窗口内');
  }
} catch (err) {
  failed = true;
  console.log('FAIL 脚本执行异常 —', err?.message || err);
} finally {
  await browser.close();
  if (server) { try { process.kill(-server.pid, 'SIGTERM'); } catch { /* gone */ } }
}

process.exit(failed ? 1 : 0);
