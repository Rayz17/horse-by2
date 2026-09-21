import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';

const OUT = '/tmp/horse-hidden';
mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 720, height: 1280 }, deviceScaleFactor: 1 });
page.on('pageerror', err => console.log('PAGEERROR', err.message));

await page.addInitScript(() => localStorage.setItem('horse_merge_seen_tips', '1'));
await page.goto('http://127.0.0.1:5173/', { waitUntil: 'domcontentloaded', timeout: 30000 });
await page.waitForFunction(() => window.__game?.scene?.isActive('MainMenu'), { timeout: 45000 });

await page.evaluate(() => {
  window.__game.scene.getScene('MainMenu').scene.start('Game', { dailySeed: 'hidden-vis-20260818' });
});
await page.waitForFunction(() => window.__game?.scene?.getScene('Game')?.grid, { timeout: 20000 });
await page.waitForTimeout(900);

const specs = [
  { id: 'cow_horse', extra: [['black_sheep', 2, 3], ['black_sheep', 2, 4]], dir: { x: 1, y: 0 }, name: 'overtime' },
  { id: 'toilet_head', extra: [['bamboo_horse', 2, 3], ['piplup_cosplay', 3, 2]], name: 'pollute' },
  { id: 'coder_feng', extra: [['bamboo_horse', 4, 1], ['bamboo_horse', 4, 2]], freeze: true, name: 'debug' },
  { id: 'pixel_censor', extra: [['bamboo_horse', 2, 3], ['white_base', 1, 2]], name: 'censor' },
  { id: 'magic_paint', extra: [], name: 'paint' },
  { id: 'derby_girl', extra: [['bamboo_horse', 2, 3], ['bamboo_horse', 2, 4]], dir: { x: 1, y: 0 }, name: 'derby' },
  { id: 'tech_giants', extra: [['bamboo_horse', 0, 0], ['bamboo_horse', 0, 1]], name: 'giants' },
  { id: 'cosmic_one', extra: [['bamboo_horse', 5, 5]], name: 'cosmic' }
];

for (const spec of specs) {
  await page.evaluate((spec) => {
    const scene = window.__game.scene.getScene('Game');
    const grid = scene.grid;
    scene.unlockQueue = [];
    scene.isShowingUnlock = false;
    scene.pendingLevel101Choice = false;
    if (spec.id === 'cosmic_one') scene.level101ChoiceResolved = false;
    scene.children.list.slice().forEach(obj => {
      if (obj.type === 'Container' && obj.depth >= 2200) obj.destroy(true);
    });
    scene.infoPanel?.setVisible(true);
    for (let r = 0; r < 6; r++) {
      for (let c = 0; c < 6; c++) {
        const t = grid.tiles[r][c];
        if (t) grid.destroyTile(t);
      }
    }
    grid.createTileAt({ r: 2, c: 2 }, grid.charMap.get(spec.id));
    for (const [id, r, c] of spec.extra) {
      grid.createTileAt({ r, c }, grid.charMap.get(id));
      if (spec.freeze) grid.tiles[r][c]?.setFrozen(true);
    }
    if (spec.dir) grid.lastMoveDir = spec.dir;
    scene.unlockQueue = [];
    scene.isShowingUnlock = false;
    scene.children.list.slice().forEach(obj => {
      if (obj.type === 'Container' && obj.depth >= 2200) obj.destroy(true);
    });
    scene.executeCharacterSkill(grid.tiles[2][2]);
  }, spec);

  await page.waitForFunction(() => window.__game.scene.getScene('Game').setpiecePlaying === true, { timeout: 3000 }).catch(() => {});
  await page.waitForTimeout(520);
  await page.screenshot({ path: `${OUT}/vis-${spec.name}-mid.png`, fullPage: true });
  await page.waitForFunction(() => window.__game.scene.getScene('Game').setpiecePlaying === false, { timeout: 8000 }).catch(() => {});
  await page.waitForTimeout(150);
  await page.evaluate(() => {
    const scene = window.__game.scene.getScene('Game');
    scene.unlockQueue = [];
    scene.children.list.slice().forEach(obj => {
      if (obj.type === 'Container' && obj.depth >= 4000) obj.destroy(true);
    });
  });
  await page.screenshot({ path: `${OUT}/vis-${spec.name}-end.png`, fullPage: true });
  console.log('captured', spec.name);
}

await browser.close();
