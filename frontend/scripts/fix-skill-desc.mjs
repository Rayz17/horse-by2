#!/usr/bin/env node
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const path = join(__dirname, '../src/data/characters.json');

const MECHANIC_SUFFIX = {
  arch_economy: '【效果：获得金币】',
  arch_snipe: '【效果：对首领造成伤害】',
  arch_bomb: '【效果：清除周围 3×3 区域】',
  arch_transform: '【效果：随机变化同阶角色】',
  arch_freeze: '【效果：冻结首领 1 回合】',
  arch_shuffle: '【效果：重排棋盘】',
  arch_heal: '【效果：净化负面状态】',
  arch_upgrade: '【效果：献祭自身，升级邻格】',
  arch_summon: '【效果：生成 2 个低级单位】',
  arch_clear_low: '【效果：清除低级单位】'
};

const characters = JSON.parse(readFileSync(path, 'utf8'));
let changed = 0;

for (const char of characters) {
  const type = char.skill?.type;
  if (!type || type.startsWith('sig_')) continue;
  const suffix = MECHANIC_SUFFIX[type];
  if (!suffix) continue;
  const desc = char.skill.description || '';
  if (desc.includes(suffix)) continue;
  const cleaned = desc.replace(/【效果：[^】]+】/g, '').trim();
  char.skill.description = cleaned ? `${cleaned} ${suffix}` : suffix;
  changed++;
}

writeFileSync(path, `${JSON.stringify(characters, null, 4)}\n`);
console.log(`fix-skill-desc: updated ${changed} characters`);
