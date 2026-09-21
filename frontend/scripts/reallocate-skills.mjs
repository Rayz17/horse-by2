#!/usr/bin/env node
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const charPath = join(__dirname, '../src/data/characters.json');
const bossPath = join(__dirname, '../src/data/bosses.json');

const characters = JSON.parse(readFileSync(charPath, 'utf8'));
const bosses = JSON.parse(readFileSync(bossPath, 'utf8'));
const weaknessIds = new Set(bosses.flatMap((b) => b.weakness || []));

const factionMap = {
  A: (level) => {
    const m = level % 3;
    if (m === 0) return 'arch_snipe';
    if (m === 1) return 'arch_upgrade';
    return 'arch_clear_low';
  },
  B: (level) => {
    const m = level % 3;
    if (m === 0) return 'arch_snipe';
    if (m === 1) return 'arch_bomb';
    return 'arch_freeze';
  },
  C: (level) => {
    const m = level % 3;
    if (m === 0) return 'arch_transform';
    if (m === 1) return 'arch_economy';
    return 'arch_shuffle';
  },
  D: (level) => {
    const m = level % 3;
    if (m === 0) return 'arch_heal';
    if (m === 1) return 'arch_summon';
    return 'arch_snipe';
  }
};

function defaultParams(type, level) {
  switch (type) {
    case 'arch_snipe': return { damage: Math.max(50, level * 10) };
    case 'arch_economy': return { amount: level * 10 };
    case 'arch_bomb': return { radius: 1 };
    case 'arch_freeze': return { turns: 1 };
    case 'arch_upgrade': return { radius: 1 };
    case 'arch_summon': return { count: 2 };
    default: return {};
  }
}

let changed = 0;
for (const char of characters) {
  if (!char.skill?.type || char.skill.type.startsWith('sig_') || char.hiddenEnding) continue;
  if (weaknessIds.has(char.id)) continue;
  if (char.skill.type !== 'arch_snipe') continue;
  const mapFn = factionMap[char.faction];
  if (!mapFn) continue;
  const nextType = mapFn(char.level);
  char.skill.type = nextType;
  char.skill.params = { ...(char.skill.params || {}), ...defaultParams(nextType, char.level) };
  changed++;
}

writeFileSync(charPath, `${JSON.stringify(characters, null, 4)}\n`);
console.log(`reallocate-skills: updated ${changed} characters`);
