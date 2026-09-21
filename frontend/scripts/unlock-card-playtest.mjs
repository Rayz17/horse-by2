import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';

const OUT = '/tmp/horse-unlock';
mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 720, height: 1280 }, deviceScaleFactor: 1 });
page.on('pageerror', err => console.log('PAGEERROR', err.message));

await page.addInitScript(() => {
  localStorage.setItem('horse_merge_seen_tips', '1');
});

await page.goto('http://127.0.0.1:5173/', { waitUntil: 'domcontentloaded', timeout: 30000 });
await page.waitForFunction(() => window.__game && window.__game.scene.isActive('MainMenu'), { timeout: 45000 });

await page.evaluate(() => {
  window.__game.scene.getScene('MainMenu').scene.start('Game', { dailySeed: 'unlock-card-20260819' });
});
await page.waitForFunction(() => window.__game?.scene?.getScene('Game')?.grid, { timeout: 20000 });
await page.waitForTimeout(800);

await page.evaluate(() => {
  const scene = window.__game.scene.getScene('Game');
  const chars = scene.cache.json.get('characters');
  const piplup = chars.find(c => c.id === 'piplup_cosplay');
  scene.showUnlockOverlay(piplup);
});
await page.waitForTimeout(900);
await page.screenshot({ path: `${OUT}/unlock-piplup.png` });

await page.evaluate(() => {
  const scene = window.__game.scene.getScene('Game');
  const overlay = scene.children.list.find(o => o.type === 'Container' && o.depth >= 5200);
  overlay?.destroy(true);
  scene.isShowingUnlock = false;
  scene.scene.start('Gallery');
});
await page.waitForFunction(() => window.__game.scene.isActive('Gallery'), { timeout: 15000 });
await page.waitForTimeout(600);
await page.evaluate(() => {
  const g = window.__game.scene.getScene('Gallery');
  const piplup = g.characters.find(c => c.id === 'piplup_cosplay');
  g.showCharDetails(piplup);
});
await page.waitForTimeout(600);
await page.screenshot({ path: `${OUT}/gallery-piplup.png` });

await browser.close();
console.log('SHOTS', OUT);
