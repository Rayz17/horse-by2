# 马马合体 / Horse成双

Phaser 3 + TypeScript 的 6×6 合成网页游戏。纯前端静态站，无需后端。

## 本地开发

```bash
cd frontend
npm install
npm run dev
```

开发服务默认走 Vite。资产脚本（Python）请使用仓库根目录 `venv`。

## 发布静态站

```bash
cd frontend
npm run build
```

把 `frontend/dist` 托管到任意静态服务器或 CDN。手机浏览器可「添加到主屏幕」（PWA 清单 + 极简 Service Worker，角色图仍按需加载）。

局内 BGM 优先播 `frontend/public/assets/audio/bgm_{standard|finale|nearDeath|trueEnding}.ogg`；没有文件时回退到程序化振荡器。
