# 美术资源交付标准与生成指南 V5.0 (Asset Delivery Standards V5.0)

**版本**: 5.0 (2-Image System & 3-Frame Action)
**用途**: 规范所有美术资源的生成、裁剪、命名和存放，以适配最新的双层渲染架构，并解决角色状态不一致和特效跨帧问题。

---

## 1. 核心标准 (Core Standards)

每个角色**仅需要生成 2 张图片**：一张静态立绘（用于展示界面），一张动作序列帧（用于游戏战斗与表现）。

### A. 基础立绘/卡牌图 (Base Sprite)
用于：**图鉴详情 (Gallery)**、**抽卡结果**、**游戏结算**。

*   **文件命名**: `{id}.png` (例如: `bamboo_horse.png`)
*   **构图比例**: **3:4 竖图**
*   **推荐尺寸**: `768x1024` 或 `512x682`
*   **背景**: 透明 (Transparent) 或 纯白 (White, `#FFFFFF`)
*   **内容**: 角色完整全身像，细节丰富，姿态自然。**必须包含角色的所有元素（如骑手+坐骑）**。

### B. 动作帧 (Action Sprite Sheet)
用于：**棋盘战斗 (Grid)** 上的静止、待机呼吸和攻击动画。

*   **文件命名**: `{id}_action.png` (例如: `bamboo_horse_action.png`)
*   **格式**: **横向条状拼图 (Horizontal Strip)**，严格的 1 行 3 列排列。
*   **帧数**: 固定 **3 帧**
*   **构图比例**: **--ar 3:1** 或 **--ar 4:1** (确保帧与帧之间有足够宽的间距)
*   **物理隔离**: 每一帧之间必须有明确的宽间距或竖线隔开，从而物理上斩断 AI 生成时的跨帧特效。
*   **关键要求**: 
    1. **特效边界**：特效（VFX）绝对不能跨过竖线，必须在单帧区域内留有足够的边缘安全距离。
    2. **无文字**：所有图片上绝对不能包含任何文字、字母或水印。
    3. **角色一致性**：动作帧中的角色形象必须与 Base 立绘完全一致（包括骑手、装备、颜色等）。

#### 动作帧的 3 帧内容分配逻辑
*   **第 1 帧 (Static)**: 角色的静态站立姿势（作为棋盘默认状态）。
*   **第 2 帧 (Idle)**: 角色的待机微小动作（如：发光、飘带飞舞、微小呼吸）。
    *   **引擎播放逻辑**: 循环播放【帧1 -> 帧2 -> 帧1】形成呼吸动画。
*   **第 3 帧 (Action)**: 完整的攻击或施法爆发动作。
    *   **引擎播放逻辑**: 连播【帧1 -> 帧2 -> 帧3】完整展示特效。

---

## 2. 目录结构与自动化工具 (Directory Structure & Automation)

为了简化工作流，我们提供了一个**自动化切图脚本** (`scripts/process_assets.py`)。您只需将 AI 生成的原始图片放入 `raw_assets` 文件夹，脚本会自动完成去底、裁剪、识别竖线隔离和拼图。

### A. 原始素材准备 (Raw Assets Preparation)
请在项目根目录下创建一个 `raw_assets` 文件夹，并将 AI 生成的图片直接放入其中。

**命名规则**:
*   立绘原图 -> `{id}.png` (例如 `bamboo_horse.png`)
*   动作动画原图 -> `{id}_action.png` (例如 `bamboo_horse_action.png`)

### B. 自动化脚本运行 (Running the Script)
脚本会自动处理 `raw_assets` 中的图片，并将处理好的成品输出到 `frontend/public/assets/sprites/characters/`。

**脚本功能**:
1.  **自动裁切**: 自动切掉底部文字区域（Text Removal）。
2.  **自动去底**: 将白色背景转为透明（Background Removal）。
3.  **智能识别分隔**: 识别画面中的竖向隔离线进行 3 帧拆分。

**运行命令**:
```bash
python scripts/process_assets.py
```

---

## 3. Prompt 结构规范 (V6.0 System)

为了保证生成质量，请严格遵守以下 Prompt 结构：

### Base Prompt (立绘)
```text
[主体描述] + [背景故事/Lore] + [风格参数]
```
*   **主体描述**: 必须详细描述角色外观，如果是“人+马”组合，必须明确描述骑手和坐骑的特征。

### Action Prompt (动作帧)
```text
[主体描述 (与Base一致)] + [动作描述]
Layout: Horizontal strip, 3 individual frames, wide spacing, zero overlapping.
Sequence: (1) static standing, (2) idle motion, (3) powerful action.
Technical: Pure white background, isometric view, consistent character proportions, vibrant colors, clean edges, no grid lines. --ar 3:1
```
*   **Layout**: 强调 3 帧横向排列，宽间距。
*   **Sequence**: 明确 1-2-3 的动作逻辑。
*   **Technical**: 强调纯白背景和无重叠。
