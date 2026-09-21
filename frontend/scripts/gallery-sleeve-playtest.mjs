import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';

const OUT = '/tmp/horse-gallery';
mkdirSync(OUT, { recursive: true });

const recipeKeys = [
  'rock_horse+sophist_white',
  'black_sheep+dark_prince',
  'don_quixote+trojan_wood',
  'alexander_mt+patriot_yue',
  'gundam_kim+mobile_horse',
  'any_horse+item_brush',
  'qilin_myth+sun_chariot',
  'merry_go+samurai_mech'
];

const extraUnlocks = [
  'auntie_ma', 'cow_horse', 'toilet_head', 'coder_feng', 'pixel_censor',
  'magic_paint', 'derby_girl', 'tech_giants', 'cosmic_one',
  'great_harmony_cyber_sci_fi', 'great_harmony_ancient_classic',
  'great_harmony_anime_mania'
];

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 720, height: 1280 }, deviceScaleFactor: 1 });
page.on('pageerror', err => console.log('PAGEERROR', err.message));

await page.addInitScript(({ extraUnlocks, recipeKeys }) => {
  localStorage.setItem('horse_merge_recipes_found', JSON.stringify(recipeKeys));
  localStorage.setItem('horse_merge_seen_tips', '1');
  window.__galleryExtraUnlocks = extraUnlocks;
}, { extraUnlocks, recipeKeys });

await page.goto('http://127.0.0.1:5173/', { waitUntil: 'domcontentloaded', timeout: 30000 });
await page.waitForFunction(() => window.__game && window.__game.scene.isActive('MainMenu'), { timeout: 45000 });

await page.evaluate(() => {
  const chars = window.__game.cache.json.get('characters') || [];
  const extras = window.__galleryExtraUnlocks || [];
  const ids = chars.filter(c => c.level <= 20 || extras.includes(c.id) || c.hiddenEnding).map(c => c.id);
  localStorage.setItem('horse_merge_unlocked_chars', JSON.stringify(Array.from(new Set([...ids, ...extras]))));
  const menu = window.__game.scene.getScene('MainMenu');
  menu.scene.start('Gallery');
});
await page.waitForFunction(() => window.__game.scene.isActive('Gallery'), { timeout: 15000 });
await page.waitForTimeout(1800);
await page.screenshot({ path: `${OUT}/gallery-p1.png` });

const pageInfo = await page.evaluate(() => {
  const g = window.__game.scene.getScene('Gallery');
  return {
    maxPages: g.maxPages,
    tab: g.currentTab,
    textures: ['border_hidden', 'border_ssr', 'border_n', 'great_harmony_cyber_sci_fi'].map(k => ({
      k, ok: g.textures.exists(k)
    }))
  };
});
console.log('PAGEINFO', JSON.stringify(pageInfo));

await page.evaluate(() => {
  const g = window.__game.scene.getScene('Gallery');
  g.changePage(g.maxPages - 1);
});
await page.waitForTimeout(800);
await page.screenshot({ path: `${OUT}/gallery-endings.png` });

await page.evaluate(() => {
  const g = window.__game.scene.getScene('Gallery');
  g.switchTab('recipe');
});
await page.waitForTimeout(800);
await page.screenshot({ path: `${OUT}/gallery-recipes.png` });

await browser.close();
console.log('SHOTS', OUT);
