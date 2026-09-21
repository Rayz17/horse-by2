#!/usr/bin/env node
import { cpSync, mkdirSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const srcDir = join(__dirname, '../src/data');
const destDir = join(__dirname, '../public/assets/data');

mkdirSync(destDir, { recursive: true });

for (const file of readdirSync(srcDir).filter((name) => name.endsWith('.json'))) {
  cpSync(join(srcDir, file), join(destDir, file));
  console.log(`sync-data: ${file}`);
}
