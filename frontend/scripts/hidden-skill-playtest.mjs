import { chromium } from 'playwright';
import { mkdirSync, writeFileSync } from 'node:fs';

const OUT = '/tmp/horse-hidden';
mkdirSync(OUT, { recursive: true });

const results = [];
const note = (name, ok, detail = '') => {
  results.push({ name, ok: !!ok, detail });
  console.log(`${ok ? 'PASS' : 'FAIL'} ${name}${detail ? ' — ' + detail : ''}`);
};

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 720, height: 1280 }, deviceScaleFactor: 1 });
page.on('pageerror', err => console.log('PAGEERROR', err.message));
page.on('console', msg => {
  if (msg.type() === 'error') console.log('CONSOLE', msg.text());
});

await page.addInitScript(() => {
  localStorage.setItem('horse_merge_seen_tips', '1');
});

await page.goto('http://127.0.0.1:5173/', { waitUntil: 'domcontentloaded', timeout: 30000 });
await page.waitForFunction(() => window.__game && window.__game.scene.isActive('MainMenu'), { timeout: 45000 });

const boot = async (bossId) => {
  await page.evaluate((id) => {
    const menu = window.__game.scene.getScene('MainMenu');
    menu.scene.start('Game', id ? { bossId: id, dailySeed: 'hidden-play-20260818' } : { dailySeed: 'hidden-play-20260818' });
  }, bossId || null);
  await page.waitForFunction(() => {
    const s = window.__game?.scene?.getScene('Game');
    return s && s.sys.settings.active && s.grid;
  }, { timeout: 20000 });
  await page.waitForTimeout(800);
};

const helpers = () => page.evaluate(() => {
  const scene = window.__game.scene.getScene('Game');
  const grid = scene.grid;
  const clear = () => {
    for (let r = 0; r < 6; r++) {
      for (let c = 0; c < 6; c++) {
        const t = grid.tiles[r][c];
        if (t) grid.destroyTile(t);
      }
    }
  };
  const snap = () => {
    const cells = [];
    for (let r = 0; r < 6; r++) {
      for (let c = 0; c < 6; c++) {
        const t = grid.tiles[r][c];
        if (!t) continue;
        cells.push({
          r, c,
          id: t.character?.id || t.item?.id || null,
          name: t.character?.name || t.item?.name || '',
          lv: t.character?.level || 0,
          used: !!t.skillUsed,
          frozen: !!t.isFrozen
        });
      }
    }
    return cells;
  };
  const place = (id, r, c) => {
    const char = grid.charMap.get(id);
    if (!char) throw new Error('missing ' + id);
    return grid.createTileAt({ r, c }, char);
  };
  return { scene, grid, clear, snap, place };
});

await boot();

const logic = await page.evaluate(async () => {
  const scene = window.__game.scene.getScene('Game');
  const grid = scene.grid;
  const out = [];
  const sleep = (ms) => new Promise(r => setTimeout(r, ms));
  const clear = () => {
    for (let r = 0; r < 6; r++) {
      for (let c = 0; c < 6; c++) {
        const t = grid.tiles[r][c];
        if (t) grid.destroyTile(t);
      }
    }
  };
  const snap = () => {
    const cells = [];
    for (let r = 0; r < 6; r++) {
      for (let c = 0; c < 6; c++) {
        const t = grid.tiles[r][c];
        if (t?.character) cells.push({ r, c, id: t.character.id, name: t.character.name, lv: t.character.level, used: t.skillUsed });
      }
    }
    return cells;
  };
  const place = (id, r, c) => {
    grid.createTileAt({ r, c }, grid.charMap.get(id));
    return grid.tiles[r][c];
  };
  const fire = async (tile) => {
    scene.executeCharacterSkill(tile);
    const started = Date.now();
    while (scene.setpiecePlaying && Date.now() - started < 4000) await sleep(50);
    await sleep(200);
  };

  clear();
  place('sophist_white', 2, 2);
  place('rock_horse', 2, 3);
  grid.swipe(1, 0);
  await sleep(400);
  const auntie = snap().find(t => t.id === 'auntie_ma');
  out.push({ name: '配方：白马非马+洛克人马=马冬梅', ok: !!auntie, detail: snap().map(t => t.name).join(',') });

  clear();
  const cow = place('cow_horse', 2, 1);
  place('black_sheep', 2, 2);
  place('black_sheep', 2, 3);
  grid.lastMoveDir = { x: 1, y: 0 };
  const ot = grid.inspectSkill(cow);
  out.push({ name: '加班不进瞄准态', ok: ot.canExecute && !ot.needsAim && ot.setpiece?.id === 'overtime', detail: JSON.stringify({ can: ot.canExecute, aim: ot.needsAim, id: ot.setpiece?.id }) });
  await fire(cow);
  const afterOt = snap();
  out.push({ name: '加班同行合成', ok: afterOt.some(t => t.id === 'cow_horse') && afterOt.filter(t => t.id === 'black_sheep').length < 2, detail: afterOt.map(t => `${t.name}@${t.r},${t.c}`).join(' | ') });

  clear();
  const toilet = place('toilet_head', 0, 0);
  place('bamboo_horse', 4, 3);
  place('piplup_cosplay', 4, 4);
  place('white_base', 5, 3);
  grid.setSkillAimCell({ r: 4, c: 4 });
  const pollutePrev = grid.inspectSkill(toilet);
  const aimedFar = pollutePrev.cells.some(c => c.r === 4 && c.c === 4) && !pollutePrev.cells.some(c => c.r === 0 && c.c === 1);
  out.push({ name: '马桶瞄准落在远端 3×3', ok: pollutePrev.canExecute && aimedFar, detail: pollutePrev.cells.map(c => `${c.r},${c.c}`).join(' ') });
  const beforeIds = snap().filter(t => t.r >= 4).map(t => `${t.r},${t.c}:${t.id}`).sort().join('|');
  await fire(toilet);
  const afterPollute = snap();
  const toiletStay = afterPollute.some(t => t.id === 'toilet_head' && t.r === 0 && t.c === 0);
  const afterIds = afterPollute.filter(t => t.r >= 4).map(t => `${t.r},${t.c}:${t.id}`).sort().join('|');
  out.push({ name: '马桶远端换位且自己不动', ok: toiletStay && afterIds !== beforeIds && afterPollute.filter(t => t.r >= 4).length === 3, detail: `before=${beforeIds} after=${afterIds}` });

  clear();
  const censor = place('pixel_censor', 2, 2);
  place('bamboo_horse', 2, 3);
  place('piplup_cosplay', 1, 2);
  place('white_base', 3, 2);
  const cenPrev = grid.inspectSkill(censor);
  out.push({ name: '马赛克需要瞄准', ok: cenPrev.canExecute && cenPrev.needsAim, detail: `cells=${cenPrev.cells.length}` });
  await fire(censor);
  const afterCen = snap();
  out.push({ name: '马赛克抹掉圈内普通棋、自己留下', ok: afterCen.some(t => t.id === 'pixel_censor') && afterCen.length === 1, detail: afterCen.map(t => t.name).join(',') });

  clear();
  const paint = place('magic_paint', 2, 2);
  const paintPrev = grid.inspectSkill(paint);
  out.push({ name: '神笔不进瞄准态', ok: paintPrev.canExecute && !paintPrev.needsAim, detail: paintPrev.setpiece?.id || paintPrev.failReason || '' });
  await fire(paint);
  const afterPaint = snap();
  out.push({ name: '神笔画成下一级公开马', ok: afterPaint.some(t => t.lv === 83 && !t.id.includes('magic')), detail: afterPaint.map(t => `${t.name}#${t.lv}`).join(',') });

  clear();
  const derby = place('derby_girl', 2, 1);
  place('bamboo_horse', 2, 2);
  place('bamboo_horse', 2, 3);
  grid.lastMoveDir = { x: 1, y: 0 };
  const derbyPrev = grid.inspectSkill(derby);
  out.push({ name: '末脚不进瞄准态且可冲', ok: derbyPrev.canExecute && !derbyPrev.needsAim, detail: derbyPrev.failReason || derbyPrev.setpiece?.id || '' });
  await fire(derby);
  const afterDerby = snap();
  const girl = afterDerby.find(t => t.id === 'derby_girl' || t.name.includes('赛马'));
  out.push({ name: '末脚冲到行尾并撞飞低级', ok: !!girl && girl.c > 1 && !afterDerby.some(t => t.id === 'bamboo_horse'), detail: afterDerby.map(t => `${t.name}@${t.r},${t.c}`).join(' | ') });

  clear();
  const giants = place('tech_giants', 3, 3);
  place('bamboo_horse', 0, 0);
  place('bamboo_horse', 0, 1);
  place('piplup_cosplay', 1, 0);
  const ecoPrev = grid.inspectSkill(giants);
  out.push({ name: '三驾马车不进瞄准态', ok: ecoPrev.canExecute && !ecoPrev.needsAim, detail: ecoPrev.setpiece?.id || ecoPrev.failReason || '' });
  await fire(giants);
  const afterEco = snap();
  out.push({ name: '生态闭环吃低级并刷公开马', ok: afterEco.some(t => t.id === 'tech_giants') && !afterEco.some(t => t.id === 'bamboo_horse'), detail: afterEco.map(t => `${t.name}#${t.lv}`).join(' | ') });

  clear();
  const coder = place('coder_feng', 1, 1);
  const a = place('bamboo_horse', 4, 1);
  const b = place('bamboo_horse', 4, 3);
  a.setFrozen(true);
  b.setFrozen(true);
  const dbgPrev = grid.inspectSkill(coder);
  out.push({ name: 'Debug 不进瞄准态', ok: dbgPrev.canExecute && !dbgPrev.needsAim, detail: dbgPrev.setpiece?.id || dbgPrev.failReason || '' });
  await fire(coder);
  const afterDbg = snap();
  out.push({ name: 'Debug 解冻并合掉一对', ok: afterDbg.every(t => !t.frozen) && afterDbg.filter(t => t.id === 'bamboo_horse').length <= 1, detail: afterDbg.map(t => `${t.name}@${t.r},${t.c} f=${t.frozen}`).join(' | ') });

  clear();
  const cosmic = place('cosmic_one', 2, 2);
  place('bamboo_horse', 5, 5);
  place('bamboo_horse', 5, 4);
  const cosPrev = grid.inspectSkill(cosmic);
  out.push({ name: '天门可放且会开分流', ok: cosPrev.canExecute && scene.canOfferLevel101Choice() === true, detail: cosPrev.setpiece?.id || cosPrev.failReason || '' });
  await fire(cosmic);
  await sleep(300);
  const afterCos = snap();
  const texts = scene.children.list.filter(o => o.type === 'Text').map(t => t.text).join(' | ');
  out.push({ name: '天门清污染并落下分流卡', ok: !afterCos.some(t => t.lv <= 3 && t.id !== 'cosmic_one') && (scene.pendingLevel101Choice || texts.includes('宇宙神驹')), detail: `cells=${afterCos.map(t => t.name).join(',')} texts=${texts.slice(0, 80)} pending=${scene.pendingLevel101Choice}` });

  const leftover = scene.children.list.filter(o =>
    o.type === 'ParticleEmitter' || o.type === 'ParticleEmitterManager' ||
    (o.texture && ['particle_star', 'particle_smoke', 'flare'].includes(o.texture.key) && o.parentContainer == null)
  ).length;
  out.push({ name: '演出后无粒子残留', ok: leftover === 0, detail: `loose=${leftover}` });

  return out;
});

for (const item of logic) note(item.name, item.ok, item.detail);
await page.screenshot({ path: `${OUT}/01-after-logic.png`, fullPage: true });

await page.evaluate(() => {
  const scene = window.__game.scene.getScene('Game');
  scene.scene.start('MainMenu');
});
await page.waitForFunction(() => window.__game.scene.isActive('MainMenu'), { timeout: 10000 });
await boot('miasma_bat');

const dacha = await page.evaluate(async () => {
  const scene = window.__game.scene.getScene('Game');
  const grid = scene.grid;
  for (let r = 0; r < 6; r++) {
    for (let c = 0; c < 6; c++) {
      const t = grid.tiles[r][c];
      if (t) grid.destroyTile(t);
    }
  }
  grid.createTileAt({ r: 3, c: 3 }, grid.charMap.get('auntie_ma'));
  const auntie = grid.tiles[3][3];
  const prev = grid.inspectSkill(auntie);
  scene.executeCharacterSkill(auntie);
  return {
    can: prev.canExecute,
    reason: prev.failReason || '',
    setpiece: prev.setpiece?.id || '',
    playing: scene.setpiecePlaying,
    hasBoss: !!scene.bossManager?.getActiveBoss?.()
  };
});
note('马冬梅有 Boss 可打岔', dacha.can && dacha.setpiece === 'dacha' && dacha.hasBoss, JSON.stringify(dacha));
await page.waitForTimeout(700);
await page.screenshot({ path: `${OUT}/02-dacha-mid.png`, fullPage: true });
await page.waitForFunction(() => {
  const s = window.__game?.scene?.getScene('Game');
  return s && s.setpiecePlaying === false;
}, { timeout: 8000 }).catch(() => {});
await page.waitForTimeout(200);
await page.screenshot({ path: `${OUT}/03-dacha-end.png`, fullPage: true });

const visualSetpieces = [
  { id: 'cow_horse', extra: [['black_sheep', 2, 2], ['black_sheep', 2, 3]], dir: { x: 1, y: 0 }, name: 'overtime' },
  { id: 'toilet_head', extra: [['bamboo_horse', 2, 3], ['piplup_cosplay', 3, 2]], name: 'pollute' },
  { id: 'coder_feng', extra: [['bamboo_horse', 4, 1], ['bamboo_horse', 4, 2]], freeze: true, name: 'debug' },
  { id: 'pixel_censor', extra: [['bamboo_horse', 2, 3]], name: 'censor' },
  { id: 'magic_paint', extra: [], name: 'paint' },
  { id: 'derby_girl', extra: [['bamboo_horse', 2, 3]], dir: { x: 1, y: 0 }, name: 'derby' },
  { id: 'tech_giants', extra: [['bamboo_horse', 0, 0], ['bamboo_horse', 0, 1]], name: 'giants' },
  { id: 'cosmic_one', extra: [['bamboo_horse', 5, 5]], name: 'cosmic' }
];

for (const spec of visualSetpieces) {
  await page.evaluate((spec) => {
    const scene = window.__game.scene.getScene('Game');
    const grid = scene.grid;
    scene.pendingLevel101Choice = false;
    if (scene.level101ChoiceResolved && spec.id === 'cosmic_one') scene.level101ChoiceResolved = false;
    for (let r = 0; r < 6; r++) {
      for (let c = 0; c < 6; c++) {
        const t = grid.tiles[r][c];
        if (t) grid.destroyTile(t);
      }
    }
    grid.createTileAt({ r: 2, c: 2 }, grid.charMap.get(spec.id));
    const caster = grid.tiles[2][2];
    for (const [id, r, c] of spec.extra) {
      grid.createTileAt({ r, c }, grid.charMap.get(id));
      const t = grid.tiles[r][c];
      if (spec.freeze && t) t.setFrozen(true);
    }
    if (spec.dir) grid.lastMoveDir = spec.dir;
    scene.executeCharacterSkill(caster);
  }, spec);
  await page.waitForTimeout(650);
  await page.screenshot({ path: `${OUT}/setpiece-${spec.name}.png`, fullPage: true });
  await page.waitForFunction(() => {
    const s = window.__game?.scene?.getScene('Game');
    return s && s.setpiecePlaying === false;
  }, { timeout: 8000 }).catch(() => {});
  await page.waitForTimeout(180);
  await page.screenshot({ path: `${OUT}/after-${spec.name}.png`, fullPage: true });
}

const summary = {
  total: results.length,
  passed: results.filter(r => r.ok).length,
  failed: results.filter(r => !r.ok)
};
writeFileSync(`${OUT}/report.json`, JSON.stringify({ summary, results }, null, 2));
console.log('\nSUMMARY', JSON.stringify(summary, null, 2));
await browser.close();
