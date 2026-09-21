# ui_info_panel 角色详情覆层修改方案

## 问题概述

1. **挡住棋盘**：面板加载时覆盖了棋盘下半部分（底部约两行）
2. **无文字说明和按钮**：面板中央空白，角色描述、技能信息、操作按钮未正确显示
3. **尺寸不对**：`ui_info_panel.png` 未做尺寸约束，按原图尺寸显示，导致过小或过大

---

## 根因分析

### 1. 尺寸问题
- **现状**：`createInfoPanel()` 中加载 `ui_info_panel` 时未调用 `setDisplaySize()`，直接使用纹理原始尺寸
- **后果**：若原图为 4:1 比例（如 1200×300 或 800×200），在 720×1280 画布上会占据过大面积；若原图更大，会严重遮挡棋盘

### 2. 遮挡棋盘问题
- **现状**：面板容器位于 `(360, 1050)`，背景图以中心为锚点且未缩放
- **后果**：若背景图高度较大（如 300–400px），上半部分会延伸至 y≈850，与棋盘底部（y≈910）重叠

### 3. 文字/按钮不显示
- **可能原因 A**：文本 `infoName`、`infoDesc` 使用固定相对坐标 `(-320, -70)`、`(-320, -35)`，若背景图过大或居中逻辑有误，可能被裁到视口外
- **可能原因 B**：子对象添加顺序或深度导致文字被背景覆盖
- **可能原因 C**：文本颜色与背景对比不足（如深色文字在深色背景上）

---

## 修改方案

### 方案一：代码侧修复（推荐，与美术资源解耦）

| 项目 | 修改内容 | 文件 | 说明 |
|------|----------|------|------|
| 1. 固定面板尺寸 | 对 `ui_info_panel` 背景图调用 `setDisplaySize(680, 160)` | `Game.ts` → `createInfoPanel()` | 与 fallback 矩形尺寸一致，保证不超出设计区域 |
| 2. 下移面板 | 将 `infoPanel` 容器 Y 从 `1050` 调整为 `1140` | `Game.ts` → `createInfoPanel()` | 使面板底部贴近屏幕底部，避免遮挡棋盘（棋盘底部约 910） |
| 3. 确保层级正确 | 为 `infoPanel` 设置 `setDepth(500)` | `Game.ts` → `createInfoPanel()` | 确保在棋盘之上、在弹窗之下 |
| 4. 调整文字位置 | 将 `infoName`、`infoDesc` 的相对坐标与 `infoActionBtn` 位置按 680×160 重新计算 | `Game.ts` → `createInfoPanel()` | 保证文字和按钮在面板可视区域内 |
| 5. 可选：添加角色头像 | 在面板左侧显示选中角色的小头像 | `Game.ts` → `createInfoPanel()` / `updateInfoPanel()` | 提升可读性与辨识度 |

### 方案二：美术资源规范

- 在 `ui_assets_prompts_v6.md` 中明确 `ui_info_panel` 的建议尺寸：**宽 680px、高 160px**（或 4.25:1 比例），与程序中的 `setDisplaySize` 一致，避免后期再次出现尺寸不匹配

---

## 具体代码变更建议

### Game.ts → createInfoPanel()

```diff
 this.infoPanel = this.add.container(360, 1050);
+this.infoPanel.setDepth(500);
 this.infoPanel.setVisible(false);

 if (this.textures.exists('ui_info_panel')) {
     const bg = this.add.image(0, 0, 'ui_info_panel');
-    // Ensure it fits 680x160 area roughly
-    // bg.setDisplaySize(680, 160); // Keep aspect ratio if possible
+    bg.setDisplaySize(680, 160);  // 强制约束尺寸，避免遮挡棋盘
+    bg.setOrigin(0.5, 0.5);
     this.infoPanel.add(bg);
 }
```

- 若需下移：将容器 Y 改为 `1140`，并相应调整 Shop、Inventory 的 Y 或布局，避免与商店栏重叠

### 文本与按钮布局（以 680×160 为参考）

- 左半区：名称、描述（左对齐，x 从 -300 起）
- 右半区：技能/使用按钮（x 约 220）
- 行高与边距需与 160px 高度匹配，避免溢出或过于拥挤

---

## 验证清单

- [ ] 选中棋子时，面板不遮挡棋盘上半部分（仅占用底部区域）
- [ ] 面板内能清晰看到角色名、等级、描述、技能信息
- [ ] 技能/使用按钮可见且可点击
- [ ] 面板背景图按 680×160 等比缩放，无明显拉伸变形
- [ ] 未选中时面板隐藏，道具栏正常显示
