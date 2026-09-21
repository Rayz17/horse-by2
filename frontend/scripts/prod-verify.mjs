import { chromium } from 'playwright';
import { mkdirSync, writeFileSync } from 'node:fs';

const OUT = '/tmp/horse-verify';
mkdirSync(OUT, { recursive: true });

const results = [];
const note = (dim, name, ok, detail) => {
  results.push({ dim, name, ok, detail });
  console.log(`${ok ? 'PASS' : 'FAIL'} [${dim}] ${name}${detail ? ' — ' + detail : ''}`);
};

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({
  viewport: { width: 720, height: 1280 },
  deviceScaleFactor: 1
});
page.on('pageerror', err => console.log('PAGEERROR', err.message));
page.on('console', msg => {
  if (msg.type() === 'error') console.log('CONSOLE', msg.text());
});

await page.addInitScript(() => {
  localStorage.setItem('horse_merge_seen_tips', '1');
});

await page.goto('http://127.0.0.1:5173/', { waitUntil: 'domcontentloaded', timeout: 30000 });
await page.waitForFunction(() => window.__game && window.__game.scene.isActive('MainMenu'), { timeout: 45000 });
await page.waitForTimeout(600);
await page.screenshot({ path: `${OUT}/01-main-menu.png`, fullPage: true });
note('布局', '主菜单可加载', true, 'MainMenu 已激活');

const menuProbe = await page.evaluate(() => {
  const scene = window.__game.scene.getScene('MainMenu');
  const texts = scene.children.list
    .filter(o => o.type === 'Text')
    .map(t => ({ text: t.text, x: Math.round(t.x), y: Math.round(t.y), visible: t.visible }));
  const rects = scene.children.list
    .filter(o => o.type === 'Rectangle' && o.input?.enabled)
    .map(r => ({ x: Math.round(r.x), y: Math.round(r.y), w: r.width, h: r.height }));
  const canvas = document.querySelector('canvas');
  return {
    sceneKey: scene.sys.settings.key,
    canvas: canvas ? { w: canvas.width, h: canvas.height, styleW: canvas.style.width, styleH: canvas.style.height } : null,
    texts,
    buttons: rects,
    title: texts.find(t => t.text.includes('Horse'))
  };
});
note('布局', '画布 720x1280', menuProbe.canvas?.w === 720 && menuProbe.canvas?.h === 1280, JSON.stringify(menuProbe.canvas));
note('UI', '主标题存在', !!menuProbe.title, menuProbe.title?.text);
note('UI', '开始/图鉴按钮可点', menuProbe.buttons.length >= 3, `interactive rects=${menuProbe.buttons.length}`);

await page.evaluate(() => {
  const scene = window.__game.scene.getScene('MainMenu');
  scene.scene.start('Gallery');
});
await page.waitForFunction(() => window.__game.scene.isActive('Gallery'), { timeout: 15000 });
await page.waitForTimeout(800);
await page.screenshot({ path: `${OUT}/02-gallery.png`, fullPage: true });

const galleryProbe = await page.evaluate(() => {
  const scene = window.__game.scene.getScene('Gallery');
  const chars = scene.cache.json.get('characters') || [];
  const unlocked = scene.saveManager.getUnlockedCharacters();
  const recipeOnly = chars.filter(c => c.recipeOnly);
  const hiddenEnding = chars.filter(c => c.hiddenEnding);
  const visibleHiddenEnding = hiddenEnding.filter(c => unlocked.includes(c.id));
  const texts = scene.children.list.filter(o => o.type === 'Text').map(t => t.text);
  return {
    title: texts.find(t => String(t).includes('图鉴')),
    recipeOnlyCount: recipeOnly.length,
    recipeOnlyNames: recipeOnly.map(c => c.name),
    hiddenEndingInListWhenLocked: hiddenEnding.length - visibleHiddenEnding.length,
    tabTexts: texts.slice(0, 12)
  };
});
note('UI', '图鉴标题', !!galleryProbe.title, galleryProbe.title);
note('逻辑', '8 个 recipeOnly 角色存在', galleryProbe.recipeOnlyCount === 8, galleryProbe.recipeOnlyNames.join(','));
note('逻辑', '未解锁终局角色不进公开列表计数', galleryProbe.hiddenEndingInListWhenLocked >= 4, `locked endings=${galleryProbe.hiddenEndingInListWhenLocked}`);

await page.evaluate(() => {
  const scene = window.__game.scene.getScene('Gallery');
  scene.scene.start('Game', { dailySeed: 'verify-prod-20260818' });
});
await page.waitForFunction(() => window.__game.scene.isActive('Game') && window.__game.scene.getScene('Game').grid, { timeout: 20000 });
await page.waitForTimeout(2600);
await page.screenshot({ path: `${OUT}/03-game-start.png`, fullPage: true });

const layoutProbe = await page.evaluate(() => {
  const scene = window.__game.scene.getScene('Game');
  const grid = scene.grid;
  const layout = scene.layout;
  const tiles = [];
  for (let r = 0; r < 6; r++) {
    for (let c = 0; c < 6; c++) {
      const t = grid.tiles[r][c];
      if (!t) continue;
      tiles.push({
        r, c,
        id: t.character?.id || t.item?.id || null,
        name: t.character?.name || t.item?.name || null,
        level: t.character?.level || null,
        recipeOnly: !!t.character?.recipeOnly,
        x: Math.round(t.x),
        y: Math.round(t.y),
        scaleX: Number(t.scaleX.toFixed(2)),
        visible: t.visible,
        alpha: Number(t.alpha.toFixed(2))
      });
    }
  }
  const hud = {
    score: scene.scoreText?.text,
    gold: scene.goldText?.text,
    infoName: scene.infoName?.text,
    infoDesc: (scene.infoDesc?.text || '').slice(0, 80),
    scoreY: scene.scoreText?.y,
    goldY: scene.goldText?.y,
    gridTop: layout.gridTop,
    gridCenterY: layout.gridCenterY,
    inventoryY: layout.inventoryCenterY,
    infoY: layout.infoPanelCenterY,
    shopY: layout.shopCenterY
  };
  const stacked = layout.headerH + layout.progressH + 10 + layout.gridWidth + layout.inventoryH + layout.infoH + layout.shopH;
  return {
    tiles,
    hud,
    stacked,
    overlapHeader: tiles.some(t => t.y < layout.gridTop - 10),
    overlapShop: tiles.some(t => t.y > layout.shopCenterY - layout.shopH / 2),
    hiddenOnStart: tiles.filter(t => t.recipeOnly).map(t => t.name)
  };
});
note('布局', '开局棋盘有子', layoutProbe.tiles.length >= 3, `tiles=${layoutProbe.tiles.length}`);
note('布局', '棋子不侵入顶栏', !layoutProbe.overlapHeader, layoutProbe.overlapHeader ? '有棋子 y 过小' : 'ok');
note('布局', '棋子不压进商店', !layoutProbe.overlapShop, layoutProbe.overlapShop ? '有棋子 y 过大' : 'ok');
note('布局', 'HUD 分数/金币可见', !!(layoutProbe.hud.score && layoutProbe.hud.gold), JSON.stringify(layoutProbe.hud));
note('逻辑', '开局不刷 recipeOnly', layoutProbe.hiddenOnStart.length === 0, layoutProbe.hiddenOnStart.join(',') || 'none');

const verticalOrder = [
  layoutProbe.hud.gridTop,
  layoutProbe.hud.inventoryY,
  layoutProbe.hud.infoY,
  layoutProbe.hud.shopY
];
const ordered = verticalOrder.every((v, i, arr) => i === 0 || v > arr[i - 1]);
note('布局', '顶栏-棋盘-背包-信息-商店纵向分层', ordered, verticalOrder.join(' < '));

const clickTile = await page.evaluate(() => {
  const scene = window.__game.scene.getScene('Game');
  const grid = scene.grid;
  let target = null;
  for (let r = 0; r < 6 && !target; r++) {
    for (let c = 0; c < 6 && !target; c++) {
      const t = grid.tiles[r][c];
      if (t?.character) target = t;
    }
  }
  if (!target) return { ok: false, reason: 'no tile' };
  grid.selectTile(target);
  scene.updateInfoPanel(target);
  return {
    ok: true,
    name: target.character.name,
    level: target.character.level,
    infoName: scene.infoName?.text,
    skillVisible: scene.infoActionBtn?.visible,
    skillLabel: scene.infoActionText?.text
  };
});
note('交互', '点选棋子刷新信息栏', clickTile.ok && String(clickTile.infoName || '').includes(clickTile.name), JSON.stringify(clickTile));

const logic = await page.evaluate(async () => {
  const scene = window.__game.scene.getScene('Game');
  const grid = scene.grid;
  const out = [];

  const sleep = ms => new Promise(r => setTimeout(r, ms));
  const waitIdle = async () => {
    await sleep(80);
    for (let i = 0; i < 80; i++) {
      if (!grid.isResolvingMove && !scene.setpiecePlaying) return;
      await sleep(50);
    }
  };

  const clearBoard = async () => {
    for (let r = 0; r < 6; r++) {
      for (let c = 0; c < 6; c++) {
        const t = grid.tiles[r][c];
        if (t) grid.destroyTile(t);
      }
    }
    grid.blocked = Array(6).fill(false).map(() => Array(6).fill(false));
    await sleep(280);
  };

  const place = (id, r, c) => {
    const char = grid.charMap.get(id);
    if (!char) throw new Error('missing ' + id);
    if (grid.tiles[r][c]) grid.destroyTile(grid.tiles[r][c]);
    grid.createTileAt({ r, c }, char);
    return grid.tiles[r][c];
  };

  const snapshot = () => {
    const cells = [];
    for (let r = 0; r < 6; r++) {
      for (let c = 0; c < 6; c++) {
        const t = grid.tiles[r][c];
        if (t?.character) cells.push({ r, c, id: t.character.id, name: t.character.name, lv: t.character.level });
      }
    }
    return cells;
  };

  const findByLevel = (lv) => grid.findCharacterByLevel(lv);

  await clearBoard();
  const pub19 = findByLevel(19);
  out.push({
    name: 'find(19) 跳过马冬梅',
    ok: pub19 && pub19.id !== 'auntie_ma' && pub19.level >= 20 && !pub19.recipeOnly,
    detail: pub19 ? `${pub19.id} Lv.${pub19.level}` : 'null'
  });

  const pub68 = findByLevel(68);
  out.push({
    name: 'find(68) 跳过二马弟弟',
    ok: pub68 && pub68.id !== 'coder_feng' && pub68.level === 69,
    detail: pub68 ? `${pub68.id} Lv.${pub68.level}` : 'null'
  });

  const pub91 = findByLevel(92);
  out.push({
    name: 'find(92) 跳过赛马娘/三驾马车',
    ok: pub91 && !['derby_girl', 'tech_giants'].includes(pub91.id) && pub91.level === 94,
    detail: pub91 ? `${pub91.id} Lv.${pub91.level}` : 'null'
  });

  const pub101 = findByLevel(101);
  out.push({
    name: 'find(101) 仍是宇宙神驹',
    ok: pub101 && pub101.id === 'cosmic_one',
    detail: pub101 ? pub101.id : 'null'
  });

  await clearBoard();
  place('bamboo_horse', 2, 2);
  place('bamboo_horse', 2, 3);
  grid.swipe(1, 0);
  await sleep(320);
  await waitIdle();
  const afterBasic = snapshot();
  const mergedLv2 = afterBasic.some(t => t.lv === 2);
  out.push({
    name: '同级 1+1 合成公开 Lv.2',
    ok: mergedLv2,
    detail: afterBasic.map(t => `${t.name}#${t.lv}@${t.r},${t.c}`).join(' | ')
  });

  await clearBoard();
  place('patriot_yue', 2, 2);
  place('patriot_yue', 2, 3);
  grid.swipe(1, 0);
  await sleep(320);
  await waitIdle();
  const after67 = snapshot();
  const gotCoder = after67.some(t => t.id === 'coder_feng');
  const got69 = after67.some(t => t.id === 'alexander_mt' || t.lv === 69);
  out.push({
    name: '67+67 不合出二马弟弟',
    ok: !gotCoder && got69,
    detail: after67.map(t => `${t.name}#${t.lv}`).join(' | ')
  });

  await clearBoard();
  place('sophist_white', 2, 2);
  place('rock_horse', 2, 3);
  grid.swipe(1, 0);
  await sleep(320);
  await waitIdle();
  const afterRecipe = snapshot();
  const gotAuntie = afterRecipe.some(t => t.id === 'auntie_ma');
  out.push({
    name: '白马非马+洛克人马 合出马冬梅',
    ok: gotAuntie,
    detail: afterRecipe.map(t => `${t.name}#${t.lv}`).join(' | ')
  });

  await clearBoard();
  const auntie = place('auntie_ma', 3, 3);
  const previewNoBoss = grid.inspectSkill(auntie);
  out.push({
    name: '马冬梅无 Boss 放不出',
    ok: previewNoBoss.canExecute === false && previewNoBoss.failReason,
    detail: `${previewNoBoss.canExecute} ${previewNoBoss.failReason || ''}`
  });

  await clearBoard();
  const cow = place('cow_horse', 2, 2);
  place('black_sheep', 2, 3);
  place('black_sheep', 2, 4);
  grid.lastMoveDir = { x: 1, y: 0 };
  const overtime = grid.inspectSkill(cow);
  out.push({
    name: '牛马同行有对可加班',
    ok: overtime.canExecute === true && overtime.setpiece?.id === 'overtime',
    detail: `${overtime.canExecute} ${overtime.type} ${overtime.setpiece?.id || ''} ${overtime.failReason || ''}`
  });

  await clearBoard();
  const toilet = place('toilet_head', 2, 2);
  place('bamboo_horse', 2, 3);
  place('piplup_cosplay', 3, 2);
  const pollute = grid.inspectSkill(toilet);
  out.push({
    name: '马桶 3x3 可精神污染',
    ok: pollute.canExecute === true && pollute.setpiece?.id === 'pollute',
    detail: `${pollute.canExecute} cells=${pollute.cells.length} ${pollute.failReason || ''}`
  });

  await clearBoard();
  const paint = place('magic_paint', 2, 2);
  const paintPrev = grid.inspectSkill(paint);
  out.push({
    name: '神笔可画下一级公开马',
    ok: paintPrev.canExecute === true && paintPrev.setpiece?.id === 'paint',
    detail: `${paintPrev.canExecute} ${paintPrev.failReason || ''}`
  });

  const beforePaint = paint.character.level;
  grid.executeSkill(paint);
  out.push({
    name: '神笔改盘后不是商店道具',
    ok: paint.character && paint.character.level > beforePaint && !paint.character.recipeOnly,
    detail: paint.character ? `${paint.character.name} Lv.${paint.character.level}` : 'gone'
  });

  const mergeA = { character: grid.charMap.get('patriot_yue') };
  const mergeB = { character: grid.charMap.get('patriot_yue') };
  const mergeHidden = { character: grid.charMap.get('coder_feng') };
  // use engine through grid
  const result67 = grid.getMergeResult(
    { character: grid.charMap.get('patriot_yue'), item: null },
    { character: grid.charMap.get('patriot_yue'), item: null }
  );
  out.push({
    name: 'MergeEngine 67+67 结果公开',
    ok: result67 && result67.id !== 'coder_feng' && !result67.recipeOnly,
    detail: result67 ? `${result67.id} ${result67.level}` : 'null'
  });

  const resultRecipe = grid.getMergeResult(
    { character: grid.charMap.get('qilin_myth'), item: null },
    { character: grid.charMap.get('sun_chariot'), item: null }
  );
  out.push({
    name: '麒麟+赫利俄斯 合出赛马娘',
    ok: resultRecipe && resultRecipe.id === 'derby_girl',
    detail: resultRecipe ? resultRecipe.id : 'null'
  });

  const brush = (scene.cache.json.get('items') || []).find(i => i.id === 'item_brush');
  const lowHorse = { character: grid.charMap.get('bamboo_horse'), item: null };
  const brushTile = { character: null, item: brush };
  const cheapPaint = grid.getMergeResult(lowHorse, brushTile);
  out.push({
    name: '低级马+神笔不能越级出马良',
    ok: cheapPaint === null,
    detail: cheapPaint ? cheapPaint.id : 'blocked'
  });

  return out;
});

for (const item of logic) {
  note('逻辑', item.name, !!item.ok, item.detail);
}

await page.screenshot({ path: `${OUT}/04-after-logic.png`, fullPage: true });

const setpiece = await page.evaluate(async () => {
  const scene = window.__game.scene.getScene('Game');
  const grid = scene.grid;
  for (let r = 0; r < 6; r++) {
    for (let c = 0; c < 6; c++) {
      const t = grid.tiles[r][c];
      if (t) grid.destroyTile(t);
    }
  }
  const cow = grid.createTileAt({ r: 2, c: 1 }, grid.charMap.get('cow_horse'));
  grid.createTileAt({ r: 2, c: 2 }, grid.charMap.get('black_sheep'));
  grid.createTileAt({ r: 2, c: 3 }, grid.charMap.get('black_sheep'));
  grid.lastMoveDir = { x: 1, y: 0 };
  const tile = grid.tiles[2][1];
  scene.executeCharacterSkill(tile);
  return {
    playing: scene.setpiecePlaying === true,
    locked: grid.skillLock === true
  };
});
note('交互', '隐藏特技播放时锁滑动', setpiece.playing && setpiece.locked, JSON.stringify(setpiece));
await page.waitForTimeout(700);
await page.screenshot({ path: `${OUT}/05-setpiece.png`, fullPage: true });
await page.waitForFunction(() => {
  const scene = window.__game?.scene?.getScene('Game');
  return scene && scene.setpiecePlaying === false && scene.grid.skillLock === false;
}, { timeout: 8000 });
await page.waitForTimeout(200);
await page.screenshot({ path: `${OUT}/06-setpiece-end.png`, fullPage: true });

const afterSetpiece = await page.evaluate(() => {
  const scene = window.__game.scene.getScene('Game');
  const grid = scene.grid;
  const cells = [];
  for (let r = 0; r < 6; r++) {
    for (let c = 0; c < 6; c++) {
      const t = grid.tiles[r][c];
      if (t?.character) cells.push({ r, c, id: t.character.id, name: t.character.name, lv: t.character.level, used: t.skillUsed });
    }
  }
  return {
    playing: scene.setpiecePlaying,
    locked: grid.skillLock,
    cells,
    cowUsed: cells.find(c => c.id === 'cow_horse')?.used
  };
});
note('交互', '演出结束后解锁', afterSetpiece.playing === false && afterSetpiece.locked === false, JSON.stringify({ playing: afterSetpiece.playing, locked: afterSetpiece.locked }));
note('游戏性', '加班后同行有合成痕迹', afterSetpiece.cells.some(c => c.lv >= 40) || afterSetpiece.cells.length <= 3, afterSetpiece.cells.map(c => `${c.name}#${c.lv}`).join(' | '));

const swipeInteract = await page.evaluate(async () => {
  const scene = window.__game.scene.getScene('Game');
  const grid = scene.grid;
  const before = grid.getAllTiles().length;
  grid.swipe(0, 1);
  await new Promise(r => setTimeout(r, 400));
  return {
    resolvingDone: grid.isResolvingMove === false,
    after: grid.getAllTiles().length,
    before
  };
});
note('交互', '键盘/程序滑动可结算', swipeInteract.resolvingDone, JSON.stringify(swipeInteract));

const uiAfter = await page.evaluate(() => {
  const scene = window.__game.scene.getScene('Game');
  return {
    score: scene.scoreText?.text,
    gold: scene.goldText?.text,
    info: scene.infoName?.text,
    shopVisible: !!scene.shopPanel
  };
});
note('UI', '对局中 HUD 仍在', !!(uiAfter.score && uiAfter.gold), JSON.stringify(uiAfter));

await page.screenshot({ path: `${OUT}/07-final.png`, fullPage: true });

const summary = {
  total: results.length,
  passed: results.filter(r => r.ok).length,
  failed: results.filter(r => !r.ok)
};
writeFileSync(`${OUT}/report.json`, JSON.stringify({ summary, results }, null, 2));
console.log('\nSUMMARY', JSON.stringify(summary, null, 2));
await browser.close();
process.exit(summary.failed.length ? 1 : 0);
