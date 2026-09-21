# 美术资源管理指南 V3.2 (Art Asset Management Guide)

**版本**: 3.2 (Strict)
**目标**: 确保资源一致性，并能被游戏引擎正确加载。

---

## 1. 目录结构 (Directory Structure)

所有美术资源必须放置在 `frontend/public/assets/` 目录下。除非本文档特别说明，否则不要创建子文件夹。

```
frontend/public/assets/
├── sprites/
│   ├── characters/      # 角色立绘 (PNG)
│   ├── items/           # 道具图标 (PNG)
│   └── vfx/             # 视觉特效 (PNG)
└── ui/                  # UI 元素 (PNG)
```

## 2. 命名规范 (Naming Conventions)

### A. 角色 (`sprites/characters/`)

文件名**必须**与 `characters.json` 中的 `id` 完全匹配。

*   **基础立绘 (Base Sprite)**: `{id}.png`
    *   *用途*: 默认状态，棋盘显示，图鉴显示。
    *   *示例*: `bamboo_horse.png`
*   **待机动画 (Idle Animation)**: `{id}_idle.png`
    *   *格式*: 单帧 (替换姿势) 或 Sprite Sheet (水平序列帧)。
    *   *用途*: 当角色被玩家 **选中 (Selected)** 时播放。
    *   *示例*: `bamboo_horse_idle.png`
*   **动作动画 (Action Animation)**: `{id}_action.png`
    *   *格式*: 单帧 (关键姿势) 或 Sprite Sheet。
    *   *用途*: 合成成功，释放技能，攻击时播放。
    *   *示例*: `bamboo_horse_action.png`

### B. 道具 (`sprites/items/`)

*   **格式**: `{id}.png`
*   *示例*: `item_cannon.png`

### C. 特效 (`sprites/vfx/`)

*   **格式**: `particle_{name}.png`
*   *示例*: `particle_star.png`

## 3. 分辨率与格式 (Resolution & Format)

*   **文件类型**: PNG (24位 或 32位)。
*   **透明度**: **必须包含**。背景必须是透明的。
*   **尺寸**:
    *   **角色/道具**: 256x256 或 512x512 (正方形)。
    *   **UI**: 视具体需求而定。
*   **风格**: 像素风 (Pixel Art)，等轴侧视角 (Isometric)，无抗锯齿 (硬边/High Contrast)。

## 4. 集成工作流 (Integration Workflow)

1.  **生成 (Generate)**: 使用 `full-roster-prompts.md` 中的提示词生成图像。
2.  **清理 (Clean)**: 移除背景，调整为标准分辨率。
3.  **命名 (Name)**: 严格按照 `id` 重命名文件。
4.  **放置 (Place)**: 将文件拖入 `frontend/public/assets/` 下对应的文件夹中。
5.  **测试 (Test)**: 启动游戏；`PreloaderScene` 会根据注册表自动检测并加载有效文件。
