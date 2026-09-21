# 美术资源交付标准与生成指南 V4.0 (Asset Delivery Standards V4.0)

**版本**: 4.0 (2-Image System & 5-Frame Action)
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
*   **内容**: 角色完整全身像，细节丰富，姿态自然。

### B. 动作帧 (Action Sprite Sheet)
用于：**棋盘战斗 (Grid)** 上的静止、待机呼吸和攻击动画。

*   **文件命名**: `{id}_action.png` (例如: `bamboo_horse_action.png`)
*   **格式**: **横向条状拼图 (Horizontal Strip)**，严格的 1 行 5 列排列。
*   **帧数**: 固定 **5 帧**
*   **物理隔离**: 每一帧之间必须有明确的竖线隔开（在 Prompt 中指定），从而物理上斩断 AI 生成时的跨帧特效。
*   **关键要求**: 
    1. **特效边界**：特效（VFX）绝对不能跨过竖线，必须在单帧区域内留有足够的边缘安全距离。
    2. **无文字**：所有图片上绝对不能包含任何文字、字母或水印。

#### 动作帧的 5 帧内容分配逻辑
*   **第 1 帧 (Static)**: 角色的静态站立姿势（作为棋盘默认状态）。
*   **第 2 帧 (Idle)**: 角色的待机微小动作（如：发光、飘带飞舞、微小呼吸）。
    *   **引擎播放逻辑**: 循环播放【帧1 -> 帧2 -> 帧1】形成呼吸动画。
*   **第 3-5 帧 (Action)**: 完整的攻击或施法起手、爆发、结束动作。
    *   **引擎播放逻辑**: 单次播放【帧1 到 帧5】完整展示特效，播放时动画容器以帧画面**左边缘对齐**，超出的特效向右侧和上方自由溢出，不会被裁切。

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
3.  **智能识别分隔**: 识别画面中的竖向隔离线进行 5 帧拆分。

**运行命令**:
```bash
python scripts/process_assets.py
```

---

## 3. 测试角色 Prompts (Test Batch)

以下是用于第一批测试的 5 个角色的 Prompts，已根据 V4.0 标准更新。请使用这些 Prompt 生成素材，并按上述规范裁剪。

**通用要求**:
所有图片绝对不能包含任何文字、字母或水印 (`no text, no watermark, no words, no letters`)。

**Base图 (3:4 竖图) 通用后缀 (Base Universal Suffix)**:
`, aspect ratio 3:4, isometric view, 16-bit pixel art style, vibrant colors, clean outlines, white background, no text, no words, no watermark`

**序列帧图 (5帧 横图) 通用后缀 (Action Sheet Universal Suffix)**:
`, arranged strictly in a 1x5 horizontal layout, separated by clear vertical divider lines between each frame, frame 1 is static stance, frame 2 is idle breathing, frames 3 to 5 are action sequence, ensure visual effects do not spill over into adjacent frames, isometric view, 16-bit pixel art style, vibrant colors, clean outlines, white background, no text, no words, no watermark`

### 1. Lv.1 竹马 (Bamboo Horse)
*   **Base (3:4 竖图)**:
    `pixel art sprite of an elegant, magical bamboo stalk animated like a rearing horse, glowing emerald green leaves acting as a mane, stylish and cool design, standing pose, vertical portrait composition` + Base 通用后缀
*   **Action 动作帧 (1行5列，竖线分隔)**:
    `pixel art sprite sheet containing 5 horizontal frames of the magical bamboo horse, [frame 1: static standing pose], [frame 2: idle leaves fluttering gently], [frame 3: gather green magic energy], [frame 4: rear up], [frame 5: unleash a wave of sharp bamboo leaves], elegant motion, character sheet layout` + 序列帧 通用后缀

### 2. Lv.26 烈焰马 (Fire Mane)
*   **Base (3:4 竖图)**:
    `pixel art sprite of a creamy white horse with mane and tail made of blazing orange fire, intense expression, standing pose, vertical portrait composition` + Base 通用后缀
*   **Action 动作帧 (1行5列，竖线分隔)**:
    `pixel art sprite sheet containing 5 horizontal frames of a fire mane horse, [frame 1: static standing pose], [frame 2: idle fire mane flickering and chest expanding], [frame 3: rear up], [frame 4: charge forward], [frame 5: impact explosion engulfed in fire], dynamic speed lines, character sheet layout` + 序列帧 通用后缀

### 3. Lv.52 马桶MT (Toilet Head)
*   **Base (3:4 竖图)**:
    `pixel art sprite of a white ceramic toilet with a horse's head extending from the bowl on a long neck, funny expression, standing pose, vertical portrait composition` + Base 通用后缀
*   **Action 动作帧 (1行5列，竖线分隔)**:
    `pixel art sprite sheet containing 5 horizontal frames of toilet horse, [frame 1: static standing pose], [frame 2: idle head bobbing and toilet lid clapping gently], [frame 3: eyes glowing], [frame 4: mouth opening wide], [frame 5: firing intense laser beam], chaotic energy, character sheet layout` + 序列帧 通用后缀

### 4. Lv.86 关羽赤兔 (God of War)
*   **Base (3:4 竖图)**:
    `pixel art sprite of Guan Yu (green robe, long beard) riding Red Hare horse, holding Green Dragon Crescent Blade, majestic pose, vertical portrait composition` + Base 通用后缀
*   **Action 动作帧 (1行5列，竖线分隔)**:
    `pixel art sprite sheet containing 5 horizontal frames of Guan Yu on Red Hare, [frame 1: static standing pose], [frame 2: idle horse breathing and beard floating in wind], [frame 3: lift blade high], [frame 4: swing down powerfully], [frame 5: blade hits ground with green dragon aura explosion], character sheet layout` + 序列帧 通用后缀

### 5. Lv.100 马一龙 (Elon Mars)
*   **Base (3:4 竖图)**:
    `pixel art sprite of Elon Musk in spacesuit riding a silver Starship rocket like a horse, Doge floating nearby, confident pose, vertical portrait composition` + Base 通用后缀
*   **Action 动作帧 (1行5列，竖线分隔)**:
    `pixel art sprite sheet containing 5 horizontal frames of Elon on rocket, [frame 1: static hovering pose], [frame 2: idle thruster flames flickering and Doge rotating], [frame 3: rocket crouch/compress], [frame 4: massive fire burst], [frame 5: launch forward with energetic space launch effect], character sheet layout` + 序列帧 通用后缀
