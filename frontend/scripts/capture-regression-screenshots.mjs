#!/usr/bin/env node
/**
 * T3-5 regression screenshots: MainMenu + Game at 720×1280, 390×844, 1024×768.
 * Usage: npm run preview (in another terminal) then node scripts/capture-regression-screenshots.mjs
 */
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.resolve(__dirname, '../../docs-archive/regression-screenshots');
const baseUrl = process.env.PREVIEW_URL || 'http://127.0.0.1:4173';

const viewports = [
  { name: '720x1280', width: 720, height: 1280 },
  { name: '390x844', width: 390, height: 844 },
  { name: '1024x768', width: 1024, height: 768 }
];

async function main() {
  let playwright;
  try {
    playwright = await import('playwright');
  } catch {
    const note = `# T3-5 截图说明\n\nPlaywright 未安装，未能自动截图。\n请执行：\n\n\`\`\`bash\ncd frontend && npm i -D playwright && npx playwright install chromium\nnpm run preview &\nnode scripts/capture-regression-screenshots.mjs\n\`\`\`\n\n目标视口：720×1280、390×844、1024×768\n输出目录：docs-archive/regression-screenshots/\n`;
    await mkdir(outDir, { recursive: true });
    await writeFile(path.join(outDir, 'CAPTURE_NOTE.md'), note);
    console.log('Wrote CAPTURE_NOTE.md (playwright missing)');
    process.exit(0);
  }

  const { chromium } = playwright;
  await mkdir(outDir, { recursive: true });
  const browser = await chromium.launch();

  for (const vp of viewports) {
    const page = await browser.newPage({ viewport: { width: vp.width, height: vp.height } });
    await page.goto(baseUrl, { waitUntil: 'networkidle', timeout: 60000 });
    await page.waitForTimeout(2500);
    const menuPath = path.join(outDir, `mainmenu-${vp.name}.png`);
    await page.screenshot({ path: menuPath, fullPage: false });
    console.log('saved', menuPath);

    // Start game: tap「开始游戏」then skip supply overlay
    const startY = Math.round(vp.height * (300 / 1280));
    await page.mouse.click(Math.round(vp.width / 2), startY);
    await page.waitForTimeout(1200);
    const skipY = Math.round(vp.height * (220 / 1280) + vp.height * 0.15);
    await page.mouse.click(Math.round(vp.width / 2), skipY);
    await page.waitForTimeout(4000);
    const gamePath = path.join(outDir, `game-${vp.name}.png`);
    await page.screenshot({ path: gamePath, fullPage: false });
    console.log('saved', gamePath);
    await page.close();
  }

  await browser.close();
  console.log('Done.');
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
