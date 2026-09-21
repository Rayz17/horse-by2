#!/usr/bin/env node
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const dataDir = join(__dirname, '../src/data');

function load(name) {
  return JSON.parse(readFileSync(join(dataDir, name), 'utf8'));
}

const characters = load('characters.json');
const recipes = load('recipes.json');
const items = load('items.json');
const bosses = load('bosses.json');
const chapters = load('chapters.json');

const charIds = new Set(characters.map((c) => c.id));
const itemIds = new Set(items.map((i) => i.id));
const bossIds = new Set(bosses.map((b) => b.id));
let errors = 0;

function fail(msg) {
  console.error(`ERROR: ${msg}`);
  errors++;
}

for (const recipe of recipes) {
  for (const ing of recipe.ingredients) {
    if (ing === 'any_horse' || ing.startsWith('item_')) continue;
    if (!charIds.has(ing)) fail(`recipe ingredient missing character: ${ing} in ${recipe.desc}`);
  }
  if (!charIds.has(recipe.result)) fail(`recipe result missing character: ${recipe.result} in ${recipe.desc}`);
}

for (const boss of bosses) {
  for (const wid of boss.weakness || []) {
    if (!charIds.has(wid)) fail(`boss weakness missing character: ${wid} for ${boss.id}`);
  }
}

for (const chapter of chapters) {
  for (const obj of chapter.objectives) {
    if (obj.type === 'defeat_boss' && !bossIds.has(obj.target)) {
      fail(`chapter objective boss missing: ${obj.id}`);
    }
  }
}

const KNOWN_SKILL_TYPES = new Set([
  'arch_economy', 'arch_clear_low', 'arch_snipe', 'arch_bomb', 'arch_transform',
  'arch_freeze', 'arch_shuffle', 'arch_heal', 'arch_upgrade', 'arch_summon',
  'sig_dacha', 'sig_jiaban', 'sig_debug', 'sig_huiwu', 'sig_ecosystem',
  'sig_tothemoon', 'sig_pollute', 'sig_censor', 'sig_derby', 'sig_cosmic',
  'sig_harmony', 'sig_cannon', 'sig_zankanto', 'sig_sekiba', 'sig_meteor'
]);

for (const char of characters) {
  const type = char.skill?.type;
  if (!type) fail(`character missing skill.type: ${char.id}`);
  else if (!KNOWN_SKILL_TYPES.has(type)) fail(`unknown skill.type ${type} on ${char.id}`);
}

for (const item of items) {
  if (item.id.startsWith('item_') && !item.description) fail(`item missing description: ${item.id}`);
}

if (errors > 0) {
  console.error(`validate-data: ${errors} error(s)`);
  process.exit(1);
}

console.log(`validate-data: OK (${charIds.size} chars, ${recipes.length} recipes, ${items.length} items, ${bosses.length} bosses)`);
