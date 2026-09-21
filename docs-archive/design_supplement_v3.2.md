# 游戏设计补充文档 V3.2：动画与状态逻辑 (Design Supplement)

**目标**: 定义视觉反馈规则，确保用户体验精致且界面不杂乱。

---

## 1. 动画状态 (Animation States)

为了避免视觉混乱（64个角色同时动），我们采用 **"聚焦式动画 (Focus-Based Animation)"** 系统。

### A. 状态：静止 (Static - Default)
*   **触发条件**: 角色在棋盘上，未被选中。
*   **视觉表现**: 显示 `基础立绘 (Base Sprite)` ({id}.png)。
*   **动画**: 无。静态图片。

### B. 状态：选中 (Selected - Focus)
*   **触发条件**: 玩家点击了某个特定的格子。
*   **视觉表现**: 显示 `待机动画 (Idle Animation)` ({id}_idle.png)。
*   **兜底机制**: 如果没有待机资源，则应用 **程序化呼吸 (Procedural Breathing)** (挤压拉伸 Tween: scaleY 0.95 -> 1.05 循环)。
*   **逻辑**: 同一时间只能有 **一个** 角色处于此状态。取消选中后立即停止动画。

### C. 状态：动作 (Action - Event)
*   **触发条件**: 
    1.  **合成成功 (Merge Success)**: 合成后的升级角色播放一次动作动画。
    2.  **技能释放 (Skill Cast)**: 玩家点击“技能”按钮时。
*   **视觉表现**: 显示 `动作动画 (Action Animation)` ({id}_action.png)。
*   **持续时间**: 0.5秒 - 1.0秒 (单次播放)。
*   **兜底机制**: 如果没有动作资源，则应用 **跳跃/攻击 Tween** (Y轴快速上下移动)。

---

## 2. 视觉层级 (Visual Hierarchy)

1.  **选择框 (Selector Box)**: 黄色轮廓，最顶层。选中时始终可见。
2.  **特效层 (VFX Layer)**: 粒子 (星星, 烟雾) 显示在角色 *上方*。
3.  **角色层 (Character Layer)**: 精灵 (Sprites)。
4.  **地块背景 (Tile Background)**: 代表稀有度的色块/边框。

## 3. 实现逻辑 (Implementation Logic)

### 选择流程 (Selection Flow)
1.  玩家点击地块 A。
2.  Grid: `取消选中(当前地块)` -> `当前地块.停止待机(StopIdle)`。
3.  Grid: `选中(地块 A)` -> `地块A.播放待机(PlayIdle)`。
4.  UI: 更新底部信息面板 (Info Panel)。

### 合成流程 (Merge Flow)
1.  地块 A 移动到 地块 B。
2.  视觉合成 (Pop/Flash/VFX)。
3.  地块 B 升级 ID。
4.  地块 B 播放 `动作动画 (Action Animation)` (胜利姿势)。
5.  动画结束后，地块 B 恢复 `静止 (Static)` 状态。
