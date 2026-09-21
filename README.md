# 马马合体 / Horse成双

Phaser 3 + TypeScript 的 6×6 合成网页游戏。纯前端静态站，无需后端。

## 在线试玩

推送 `main` 后由 GitHub Actions 自动构建并发布到 GitHub Pages：

**https://rayz17.github.io/horse-by2/**

## 本地开发

```bash
cd frontend
npm install
npm run dev        # http://localhost:8080
```

开发服务默认走 Vite。资产脚本（Python）请使用仓库根目录 `venv`。

## 质量检查

```bash
cd frontend
npm run validate-data        # 校验角色/配方/首领数据
npx tsc --noEmit             # 类型检查
node scripts/smoke-regression.mjs   # Playwright 冒烟：开局合成 + 悔棋（含竞态）+ 图鉴
```

推送后 CI（`.github/workflows/ci.yml`）自动跑以上三项。

## 发布

推送到 `main` 即自动构建发布（`.github/workflows/deploy.yml`）；也可手动构建：

```bash
cd frontend
npm run build
```

把 `frontend/dist` 托管到任意静态服务器或 CDN。手机浏览器可「添加到主屏幕」（PWA 清单 + 极简 Service Worker，角色图仍按需加载）。

局内 BGM 优先播 `frontend/public/assets/audio/bgm_{standard|finale|nearDeath|trueEnding}.ogg`；没有文件时回退到程序化振荡器。
