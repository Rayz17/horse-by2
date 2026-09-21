# 马马合体（Horse-Merge 2026）全面整改方案 Spec v1.0

> 交付对象：Composer 2.5（或同级代码代理），要求全量、无偏实现。
> 生效日期：2026-07-11
> 本 Spec 基于对项目全部资产的审计（源码 6040 行 TS + 4 份 JSON 数据 + 221MB 运行时资产 + 30 余份设计文档）。
> 除非本 Spec 明确说明，否则**不得改变任何现有的正确游戏行为**。

---

## 0. 项目现状快照（实现前必读）

- 技术栈：Phaser 3.80 + TypeScript + Vite，720×1280 竖屏 FIT。
- 场景：`Boot → Preloader → MainMenu → Game → GameOver / Gallery`。
- 核心：6×6 网格 2048 式滑动合成，105 角色（Lv.1–101 主线 + 4 个 Lv.102 隐藏真结局卡），7 Boss，8 道具，7 配方。
- 数据真源：`frontend/src/data/*.json`（编辑源）与 `frontend/public/assets/data/*.json`（运行时读取）**双份且已漂移**。
- 关键文件行数：`Grid.ts` 1971 行、`Game.ts` 1830 行（God Object）。
- 资产：`public/assets` 共 221MB，全部在 Preloader 一次性加载；需求要求移动端加载 < 3 秒，当前严重不达标。
- 音频：完全未实现。
- backend：FastAPI 空脚手架（仅 health 端点），前端零调用。

任务按优先级分组：P0（阻断性 bug）→ P1（性能红线）→ P2（数据与文案一致性）→ P3（代码结构）→ P4（游戏设计补强）→ P5（文档与仓库治理）。**必须按 P0→P5 顺序实现；每个任务有独立验收标准（AC）。**

---

## P0 阻断性 Bug 修复（游戏行为错误）

### T0-1 修复真结局角色查找失败

- 文件：`frontend/src/objects/Grid.ts`（约 360 行）
- 现状：`getEndingCharacter()` 用 `char.unlockBy === 'harmony'` 过滤，但 4 个隐藏卡的 `unlockBy` 实际为 `true_ending_cyber / true_ending_ancient / true_ending_anime / true_ending_myth`，导致 `harmony-achieved` 事件携带的 `endingChar` 恒为 `null`。
- 修改：改为 `this.characters.find(c => c.hiddenEnding && typeof c.unlockBy === 'string' && c.unlockBy.startsWith('true_ending'))`。同时新增 `getEndingCharacterByRoute(routeStyle: string)`，按路线映射：`cyber → true_ending_cyber`、`ancient → true_ending_ancient`、`anime → true_ending_anime`、`myth → true_ending_myth`（先确认 `Game.ts` 中 routeStyle 的实际取值字符串，与 `characters.json` 的 `unlockBy` 后缀对齐，若已有等价映射函数则复用，不得出现两套映射）。
- AC：触发大和谐真结局时，`harmony-achieved` 事件的 `endingChar` 非空且与判定路线一致；四条路线各自返回对应的 `great_harmony_*` 角色。

### T0-2 修复道具「老虎玩偶」对 Boss 伤害为 NaN

- 文件：`frontend/src/objects/Grid.ts`（约 1077 行）、`frontend/src/managers/BossManager.ts`
- 现状：`gameScene.bossManager.maxHealth` 属性不存在（BossManager 无此字段），`Math.floor(undefined / 3)` 得 NaN。
- 修改：在 `BossManager` 中确认当前 Boss 最大生命的实际字段（bosses.json 中为 `maxHp`，运行时挂在当前 boss 数据上）；新增公开方法 `getCurrentBossMaxHp(): number`（无 Boss 时返回 0），`Grid.ts` 改为调用该方法，且在为 0 时跳过伤害逻辑并 toast 提示「当前没有首领」。
- AC：拖拽老虎玩偶到 Boss 上，Boss 掉血为 `floor(maxHp / 3)`；无 Boss 时不报错、金币不白扣（若现有实现是使用后扣道具，需保证无目标时道具不消耗）。

### T0-3 数据双源统一（消除 src/data 与 public/assets/data 漂移）

- 现状：`Boot.ts` 运行时加载 `public/assets/data/*.json`；`src/data/*.json` 为编辑副本。两份 `characters.json` 已漂移（src 版含 `trigger/tags/priority` 字段，public 版没有）。
- 修改（方案固定，不得自选其他方案）：
  1. 以 `frontend/src/data/*.json` 为唯一真源。
  2. 在 `frontend/vite.config.ts` 中增加构建/开发期同步：使用一个小型 Vite 插件（`buildStart` 与 `handleHotUpdate` 钩子）把 `src/data/*.json` 复制到 `public/assets/data/`；或等价地新增 npm script `sync-data`（Node 脚本 `frontend/scripts/sync-data.mjs`）并挂到 `dev` 与 `build` 命令前（`predev`/`prebuild`）。两种取其一，推荐后者（实现简单、可显式执行）。
  3. 立即执行一次同步，使 public 版与 src 版一致。
  4. 删除遗留嵌套目录 `frontend/frontend/`（内含陈旧 bosses.json 残留）。
- AC：`diff <(jq -S . frontend/src/data/characters.json) <(jq -S . frontend/public/assets/data/characters.json)` 为空；其余 3 份 JSON 同理；`npm run build` 后 dist 内数据与 src 一致；`frontend/frontend/` 目录不存在。

### T0-4 清理 Preloader 中的无效资源加载

- 文件：`frontend/src/scenes/Preloader.ts`
- 现状：以下 8 个资源在磁盘上不存在，每次启动触发 loaderror：`bg_gallery`、`ui_panel_9slice`、`btn_generic`、`top_bar_bg`、`bottom_dock_bg`、`skill_icons_sheet`、`particle_star`、`particle_smoke`（`sprites/vfx/` 目录为空）。
- 修改：
  1. 删除 `btn_generic`、`bottom_dock_bg`、`skill_icons_sheet` 的加载（代码中无任何使用）。
  2. `bg_gallery`、`ui_panel_9slice`、`top_bar_bg`：全代码检索使用点；若使用处已有 `textures.exists` 回退逻辑，删除加载并同时删除使用点的死分支，改为直接使用回退方案（纯色/矩形），并在本 Spec 交付说明中列出"待补美术清单"。
  3. `particle_star`、`particle_smoke`：改为运行时程序化生成纹理（`this.textures.generate` 或 Graphics 生成小圆点/星形，32×32），替换现有 base64 白点 `flare` 的同类做法，保证粒子特效可见。
- AC：启动全过程 console 无任何 `Failed to load asset` 警告；合成时粒子特效可见。

### T0-5 修复 `deer_unit` 配方永不触发

- 文件：`frontend/src/objects/Grid.ts`（`getMergeResult` / catalyst 匹配处，约 1799 行）、`frontend/src/data/recipes.json`
- 现状：`recipes.json` 第 3 条配方 ingredient 为 `deer_unit`（占位符），但匹配逻辑只识别 `any_horse` 与具体角色 ID，导致「指鹿为马」配方死代码。
- 修改：查看 `characters.json`，确认是否存在鹿系角色（检索 id/name 含 deer/鹿）。
  - 若存在明确对应角色：把 recipes.json 中 `deer_unit` 改为该角色 ID。
  - 若不存在：在匹配逻辑中支持标签占位符——`deer_unit` 定义为「name 或 description 含『鹿』的角色」不可靠，因此**固定方案**：将该配方 ingredient 改为 `any_horse`，与 `item_deer_sign` 道具组合产出 `deer_sign`（与道具本身的"重随机"用法并存：拖到普通马上走道具效果，与马匹在滑动中相遇走配方——保持现有 catalyst 触发通道不变，仅改 ingredient）。
- AC：使用鹿牌道具可以按 recipes.json 合成出 `deer_sign` 角色；其余 6 条配方回归测试通过（尤其 `god_of_war + rock_horse → elon_mars` 与 `rock_horse + rock_horse` 正常升级不互相误判）。

### T0-6 补全三个名不副实的 Boss/技能效果

- 文件：`frontend/src/managers/BossManager.ts`、`frontend/src/objects/Grid.ts`、`frontend/src/scenes/Game.ts`
- 现状：
  1. `shadow_assassin` 的技能 `shadow_clone` 文案为「召唤最高等级马的暗影复制体作为障碍」，实现只放普通 shadow 障碍格。
  2. `arch_freeze`（冻结 Boss）在 `Game.ts:1212` 附近仅 toast「Boss 已冻结」，无实际效果。
  3. `sig_dacha`（马冬梅「打岔」）在 `Game.ts:1219` 附近为 Mock。
- 修改（效果定义固定如下）：
  1. `shadow_clone`：读取当前棋盘最高等级角色，生成一个使用该角色贴图但色调压暗（tint 0x555577）的障碍 tile，占 1 格，不可合成、不可移动，持续 5 个 Boss 回合后自动消散；若棋盘无空位则退化为现有 shadow 障碍行为。
  2. `arch_freeze`：`BossManager` 新增 `frozenTurns: number` 字段与 `freeze(turns: number)` 方法；`onTurn`（Boss 回合推进入口）开头若 `frozenTurns > 0` 则递减并跳过本回合技能释放，Boss 头顶显示冰冻图标（复用 `icon_freeze` 纹理，缩放至约 48px）。`arch_freeze` 技能调用 `freeze(1)`。
  3. `sig_dacha`：效果定为「Boss 下一次技能释放被打断」——实现为 `freeze(1)` 的别名调用 + 专属 toast 文案「马冬梅：楼上的，你瞅啥呢？（Boss 被打岔了）」。无 Boss 时提示「现在没有可打岔的对象」。
- AC：三个技能均有可观察的盘面效果，与 toast 文案一致；冰冻期间 Boss 不放技能、不推进技能计数；解冻后恢复。

### T0-7 处理两个幽灵道具 `item_gold_ingot`、`item_monkey`

- 文件：`frontend/src/data/items.json`、`frontend/src/objects/Grid.ts`、`frontend/public/assets/sprites/items/`
- 现状：两道具 price 为 0、无贴图、无掉落逻辑、无使用逻辑（描述提及"吞噬"机制，该机制不存在）。
- 修改（固定方案：实现而非删除，它们是 Boss 掉落奖励的设计残留）：
  1. `item_gold_ingot`（金元宝）：击败任意 Boss 后必掉 1 个进背包；点击使用（非拖拽）获得 `500 + 100 × Boss 序号` 金币。若背包满则直接折算为金币。
  2. `item_monkey`（猴子）：仅由 `fire_monkey`（火猴 Boss）击败后掉落；作为 catalyst 道具，在 `recipes.json` 新增一条：`["any_horse", "item_monkey"] → 结果角色`。结果角色 ID 从 `characters.json` 中检索「马上封侯」对应条目（检索关键词"封侯"/"monkey"）；若不存在该角色，则效果改为「目标马直接升 2 级（上限 Lv.90）」，并同步修改 items.json 描述。
  3. 贴图：无现成 PNG，UI 上用 items.json 中的 emoji 字符渲染（Text 对象）作为图标，与其他道具槽尺寸一致；在"待补美术清单"中登记。
- AC：击败 Boss 有掉落提示与背包入账；两道具均可使用且效果与描述一致；商店不出售这两个道具（price 0 的道具不进商店货架）。

### T0-8 存档与计分收尾

- 文件：`frontend/src/scenes/GameOver.ts`、`frontend/src/scenes/Game.ts`、`frontend/src/managers/SaveManager.ts`
- 修改：
  1. GameOver 进入时调用 `SaveManager.setHighscore(score)`（仅当高于历史值时写入，方法内已有或补上该判断），并在结算页显示「历史最佳：XXX」，若本局破纪录显示「新纪录！」。
  2. 修复分数标签：`Game.ts` 更新分数时保持 `Score: ${score}` 前缀（当前初始为 `'Score: 0'`，更新后只剩数字）。
  3. `Grid.ts:673` 附近 emit 的 `tile-cleanup` 事件：在 `Game.ts` 补监听，效果为 toast「低阶马匹已随时代离场 ×N」；若确认该事件语义已被其他 UI 覆盖，则删除 emit（二选一，不得留无监听的 emit）。
- AC：连续两局游戏，第二局结算页正确显示第一局的最高分；HUD 分数始终带前缀；全代码无"emit 了但无人监听"的自定义事件（用 `rg "emit\('" frontend/src` 逐一核对）。

### T0-9 主菜单 Boss 调试入口隔离

- 文件：`frontend/src/scenes/MainMenu.ts`
- 现状：正式主菜单常驻 7 个 Boss 测试按钮。
- 修改：用 `import.meta.env.DEV` 包裹调试按钮创建逻辑；生产构建（`npm run build`）不渲染。不删除功能本身（需求文档 3.4 明确保留 Boss 测试入口用于开发验证）。
- AC：`npm run dev` 下按钮可见可用；`npm run build && npm run preview` 下主菜单无调试按钮。

---

## P1 性能红线（需求 NFR：移动端加载 < 3 秒）

### T1-1 资产压缩管线

- 现状：`public/assets` 221MB 全量预载。角色 base 512×682 平均约 700KB/张（PNG）；action 条约 1500–2300×512；UI 图标 1024–2048px、单张 0.6–7.7MB；4 张 great_harmony 群像 2048×2048、5.5–7.1MB。
- 修改：新增 `scripts/optimize_assets.py`（放在根目录 `scripts/`，使用项目根 `venv` 的 Pillow；venv 中已装 Pillow，若缺则 `pip install pillow`），实现：
  1. 输入 `frontend/public/assets/`，输出**就地覆盖**前先备份原图到 `frontend/raw_assets_backup/`（若同名文件已存在于备份中则跳过备份）。
  2. 尺寸规则（保持宽高比，只缩不放）：
     - `sprites/characters/*_action.png`：高度压到 256（3 帧横条整体缩放，帧宽随比例缩，帧切分逻辑按 3 等分不受影响）。
     - `sprites/characters/great_harmony_*.png`：最长边压到 1024。
     - 其余 `sprites/characters/*.png`（base 立绘）：最长边压到 512（现为 682 高，压后 384×512）。
     - `sprites/items/*.png`：最长边 256。
     - `ui/icon_*.png`：最长边 192。
     - `ui/border_*.png`、`ui_slot_frame.png`：最长边 512。
     - `ui/bg_main_menu.png`：最长边 1440；`bg_game_grid.png`：1024 保持；面板类（`ui_info_panel`、`ui_inventory_bg`、`ui_shop_bg`、`chapter_banner_tier`、`boss_briefing_panel`、`harmony_progress_panel`、`ending_choice_card`、`unlock_harmony_badge`）：最长边 1024。
  3. 格式：全部转 WebP（质量 82，带 alpha），文件后缀改 `.webp`。Phaser 3.80 原生支持 WebP。
  4. 同步修改前端所有加载路径后缀：`Preloader.ts` 中角色/Boss/道具/UI 的 `.png` 改 `.webp`（建议集中成常量 `const IMG_EXT = '.webp'`）。
  5. 脚本需幂等：重复执行不再二次压缩（可通过检查文件是否已为 webp/已达目标尺寸跳过）。
- 目标预算：`public/assets` 总量 ≤ 25MB。
- AC：执行脚本后 `du -sh frontend/public/assets` ≤ 25MB；游戏启动、合成、图鉴、结算全流程视觉无明显劣化（立绘无锯齿撕裂、action 动画 3 帧切分正确）；备份目录保留全部原图。

### T1-2 分级加载（首屏最小化）

- 文件：`frontend/src/scenes/Preloader.ts`、`frontend/src/scenes/MainMenu.ts`、`frontend/src/objects/Tile.ts`
- 修改（固定方案）：
  1. Preloader 只加载：全部 UI、全部道具、全部 Boss、等级 ≤ 20 的角色（base + action）。加载完即进 MainMenu。
  2. MainMenu `create()` 中启动**后台渐进加载**：用 `this.load` 追加剩余角色资源（Lv.21+，含隐藏卡 base），`this.load.start()`，不阻塞交互；按等级升序排队，保证玩家合成进度总是先于加载队列尾部。
  3. 兜底：`Tile` 创建时若纹理不存在，先渲染灰色圆角矩形 + 角色名文字，并监听 `this.scene.load` 的 `filecomplete-image-{key}` 事件，纹理就绪后原地替换贴图。动画同理：action sheet 未就绪时跳过动画，仅静态显示。
  4. `Preloader.createAnimations()` 中依赖"全部纹理已存在"的逻辑改为惰性：把动画创建函数抽为 `ensureAnimations(charId)`，在 Tile 首次需要播放动画时调用。
- AC：本地 `npm run preview` + Chrome DevTools 模拟 Fast 4G，从打开页面到 MainMenu 可点击 ≤ 3 秒；游戏中不出现永久灰块（后台加载完成后自动替换）；全角色图鉴仍可正常显示（Gallery 打开时对未加载的立绘走相同的兜底+替换逻辑）。

### T1-3 仓库卫生（配合性能治理）

- 修改：
  1. 在 `frontend/.gitignore`（如无则创建）中加入：`dist/`、`raw_assets/`、`raw_assets_backup/`、`node_modules/`、`.venv/`。
  2. 删除 `frontend/dist/`（222MB 构建产物，可随时重建）。
  3. `frontend/raw_assets/`（706MB 原图）保留在磁盘但不入版本管理。
  4. 根目录 `.DS_Store` 与 `frontend` 各级 `.DS_Store` 删除并加入忽略。
- AC：上述目录/文件不再被 git 跟踪（若项目尚未 git init 则仅完成 .gitignore 与删除动作）；`frontend/dist` 不存在或为最新构建产物。

---

## P2 数据与文案一致性

### T2-1 道具文案与实现对齐（以实现为准改文案）

- 文件：`frontend/src/data/items.json`
- 修改（逐条替换 description，效果代码不动）：
  - `item_deer_sign`：改为「拖拽使用：将目标单位变为棋盘上最常见等级的单位，便于凑对合成。」
  - `item_brush`：改为「拖拽使用：使目标单位直接升 1 级。」
  - `item_plum`：改为「点击使用：净化全场负面状态（解冻、灭火、清障）。」并核对代码实际净化范围后措辞与之一致。
  - 其余道具描述逐一与 `Game.ts` / `Grid.ts` 中实际效果核对，不一致的以实现为准重写。
- AC：每个道具的商店描述、背包 tooltip 与实际使用效果一致（人工逐个使用验证）。

### T2-2 角色技能文案与原型对齐

- 文件：`frontend/src/data/characters.json`
- 现状：105 个角色中 69 个 `arch_snipe`，且大量 description 描述的是不存在的机制（如竹马「生产青梅道具」实际是加金币、马扎「原地无敌 1 回合」实际是加金币）。
- 修改：写一个一次性 Node 脚本（`frontend/scripts/fix-skill-desc.mjs`，跑完保留在仓库）遍历 characters.json，按 `skill.type` 生成描述后缀并**追加机制说明**，规则：
  - `arch_economy` → 描述末尾追加「【效果：获得金币】」
  - `arch_snipe` → 「【效果：对首领造成伤害】」
  - `arch_bomb` → 「【效果：清除周围 3×3 区域】」
  - `arch_transform` → 「【效果：随机变化同阶角色】」
  - `arch_freeze` → 「【效果：冻结首领 1 回合】」
  - `arch_shuffle` → 「【效果：重排棋盘】」
  - `arch_heal` → 「【效果：净化负面状态】」
  - `arch_upgrade` → 「【效果：献祭自身，升级邻格】」
  - `arch_summon` → 「【效果：生成 2 个低级单位】」
  - `arch_clear_low` → 「【效果：清除低级单位】」
  - `sig_*` → 保持原文（专属技能文案已与实现对齐或在 T0-6 中修复）。
  - 原有风味文案保留在前，机制说明统一在后，避免丢失角色个性。
- AC：抽查 10 个角色，选中棋子时信息栏技能说明与实际释放效果一致；脚本幂等（重复执行不重复追加）。

### T2-3 技能原型再分配（缓解 69 个 arch_snipe 同质化）

- 文件：`frontend/src/data/characters.json`
- 修改：按**确定性规则**重分配 `skill.type`（只改 type 与 params，不改技能名与风味文案；`sig_*` 专属技能与 Hidden 卡不动）：
  - 对当前为 `arch_snipe` 的角色，按 `faction` 与 `level` 重映射：
    - faction A（帝王将相）：level % 3 == 0 → `arch_snipe`；% 3 == 1 → `arch_upgrade`；% 3 == 2 → `arch_clear_low`
    - faction B（机甲钢魂）：level % 3 == 0 → `arch_snipe`；% 3 == 1 → `arch_bomb`；% 3 == 2 → `arch_freeze`
    - faction C（玩梗高手）：level % 3 == 0 → `arch_transform`；% 3 == 1 → `arch_economy`；% 3 == 2 → `arch_shuffle`
    - faction D（神话传说）：level % 3 == 0 → `arch_heal`；% 3 == 1 → `arch_summon`；% 3 == 2 → `arch_snipe`
  - params 赋默认值：`arch_snipe` 保留原 damage；`arch_economy` `{amount: level*10}`；`arch_bomb` `{radius: 1}`；其余原型按 `Grid.ts` 现有 executeSkill 分支所需参数补齐（先读代码确认每个分支消费哪些 params）。
  - Boss 弱点角色（bosses.json 中列出的 14 个 weakness 角色）**保持 `arch_snipe` 不变**，弱点克制依赖伤害技能，此规则优先级最高。
  - 完成后重跑 T2-2 的描述脚本。
- AC：`jq '[.[].skill.type] | group_by(.) | map({t:.[0],n:length})' characters.json` 显示 arch_snipe 占比 ≤ 35%；14 个弱点角色仍为 snipe；每局游戏中随机选 5 个角色释放技能无报错。

### T2-4 类型与代码内不一致清理

- 文件：`frontend/src/types.ts`、`frontend/src/objects/Boss.ts`、`frontend/src/objects/Tile.ts`
- 修改：
  1. `types.ts` 中 `BossData.triggers` 字段：bosses.json 无此字段，删除或改为可选并注明来源；以 bosses.json 实际结构为准补全 `BossData` 类型。
  2. 消除 `Boss.ts:51-54`、`Tile.ts:222-225` 的 `@ts-ignore`：为 Game 场景定义接口 `interface GameSceneLike { onBossSelected(...): void; playActionAnimation(...): void; grid: Grid; bossManager: BossManager }`（放 `types.ts`），调用处用 `(this.scene as unknown as GameSceneLike)` 收敛为单一类型出口，Game.ts 声明实现该接口。
  3. `Grid.ts`、`Tile.ts` 中所有 `(this.scene as any)` 一并替换为上述接口。
- AC：`npx tsc --noEmit` 零错误；全 src 无 `@ts-ignore`、无 `as any`（`rg "as any|@ts-ignore" frontend/src` 为空）。

---

## P3 代码结构重构（行为不变的等价重构）

> 本组任务完成后必须回归：新开一局→合成到触发第一个 Boss→击败→购买使用每种道具→进图鉴→死局结算，全流程与重构前一致。

### T3-1 拆分 `Grid.ts`（1971 行）

- 目标结构（新文件均在 `frontend/src/core/`）：
  - `core/MergeEngine.ts`：`getMergeResult`、配方匹配、暴击升级、合成结果计算（纯逻辑，不碰 Phaser 对象）。
  - `core/SpawnSystem.ts`：新棋子等级抽取、动态地板（低级清场阈值）、节奏保护逻辑。
  - `core/SkillExecutor.ts`：`executeSkill` 全部 arch_*/sig_* 分支。
  - `core/EndgameController.ts`：phase 判定（normal/ascension/harmony）、大和谐条件、共鸣计数、结局角色路由。
  - `Grid.ts` 保留：格子数据结构、滑动/移动/动画编排、事件发射，行数降到 ≤ 800。
- 约束：只做搬移与依赖注入（构造器传入 characters/recipes 数据与回调），**不改任何数值与判定条件**；公共事件名不变。
- AC：`npx tsc --noEmit` 通过；回归流程通过；`wc -l` Grid.ts ≤ 800。

### T3-2 拆分 `Game.ts`（1830 行）

- 目标结构（`frontend/src/ui/`）：
  - `ui/GameHud.ts`：顶栏、分数、金币、章节摘要面板。
  - `ui/ShopPanel.ts`：商店 6 格 + 购买逻辑。
  - `ui/InventoryPanel.ts`：背包 3 格 + 拖拽。
  - `ui/InfoPanel.ts`：底部信息栏（选中角色 / Boss 弱点 / 大和谐进度）。
  - `ui/OverlayManager.ts`：toast、章节 banner、解锁全屏、Lv.101 分流卡。
  - `Game.ts` 保留：场景生命周期、输入接线、各面板协调，≤ 700 行。
- 布局常量集中到 `frontend/src/ui/layout.ts`（消除散落的 360/640/540/908 等魔法数字，命名如 `BOARD_CENTER_Y`、`SHOP_Y`），各栏位纵向位置按现有实现计算关系表达（requirements 3.4 要求栏位按实际高度计算，保持现状行为）。
- AC：同 T3-1 回归；视觉布局与重构前逐像素等价（截图对比主界面）。

### T3-3 消除重复代码

- `getTierColor`：现于 `Tile.ts`、`Game.ts`、`Gallery.ts`、`GameOver.ts` 4 处重复 → 抽到 `frontend/src/utils/style.ts` 导出单一实现。
- `getPortraitScale` / `addPortrait`（GameOver 与 Gallery 几乎相同）→ 抽到 `frontend/src/utils/portrait.ts`。
- 解锁卡（`Game.showUnlockOverlay`）与图鉴详情卡（`Gallery.showCharDetails`）共用部分 → 抽 `ui/CharacterCard.ts`（接收角色数据 + 容器，渲染统一卡面：顶部信息栏、正方形立绘窗、正文、祝语，符合 requirements 3.6「普通结局角色卡样式」条款），三处调用（解锁、图鉴详情、结算卡）统一走它。
- AC：`rg "getTierColor" frontend/src` 只有 1 处定义；三种卡面视觉一致。

### T3-4 生产代码清理

- 删除或用 `if (import.meta.env.DEV)` 包裹全部 `console.log`（`console.warn/error` 保留用于真实异常）。
- 删除 `Game.ts:263` 的 `// ... existing code ...` 等遗留占位注释、`Grid.ts:248-250` 已注释的 debug 划线代码。
- `frontend/src/style.css` 与 `index.html` 内联样式去重：保留一处（以 index.html 为准或迁入 style.css，二选一，不得两处并存同规则）。
- `package.json` 版本号升到 `1.0.0`。
- AC：`rg "console\.log" frontend/src` 的每一处都在 DEV 分支内；构建产物无调试输出。
### T3-5 UI 布局条款回归走查（防止重构回退历史修复）

> 背景：`requirements.md` 3.4/3.6 中的布局条款均为历史 bug 修复的固化结果（见 `project planning.md` Phase 6 已勾选项）。T3-1/T3-2 重构极易将其回退，因此单列本任务作为强制回归项。**在 T3-1、T3-2 完成后执行。**

- 方法：`npm run dev` 后用浏览器自动化逐场景截图（720×1280 视口），对照下表逐条人工/像素核验；不符合项在本轮修复。
- 走查清单（每条对应 requirements.md 条款，逐条出具"通过/修复"结论）：
  1. **章节常驻面板**不遮挡棋盘第一排可操作单位（3.4 章节提示布局）。
  2. **顶部短提示（toast）**避开标题栏、分数区与菜单按钮；使用的横条背景已裁掉透明留白，且只裁外围留白、不压扁可读区（3.4 顶部短提示安全区 / 提示资源裁切原则）。
  3. **顶部常驻区**只有简短章节摘要；Boss 弱点、大和谐进度在棋盘下方信息栏，无独立重复占位卡（3.4 顶部信息分层 / Boss 信息归并）。
  4. **纵向五栏**（顶部常驻栏 / 棋盘 / 已购道具栏 / 角色信息栏 / 商店栏）按实际高度计算位置，任意两栏边界框不重叠（3.4 整体栏位布局）——重构后在 `layout.ts` 中以计算关系表达而非五个孤立常量。
  5. **瞬时提示**（章节切换、Boss 警告）居中显示、层级高于所有常驻栏与 Boss 对白；章节提示显示时长 ≥ 基础 toast 的 1.5 倍（3.4 瞬时提示层级 / 章节提示时长）。
  6. **Lv.101 分流卡**标题、正文、底部按钮按 `ending_choice_card` 背景安全区流式排版，文本不与按钮互相挤压（3.4 终章 UI 对位）。
  7. **结算页**（死局 / 封卷 / 真结局三种）：命运报告长文本左对齐分点，角色卡内祝语与标题不压边框、不出卡框（3.6 结算页文本安全区）；死局/封卷角色卡与图鉴详情同一套卡面结构（3.6，与 T3-3 的 `CharacterCard` 复用直接挂钩）。
  8. **图鉴**：列表缩略卡直接可见角色立绘、透明边框后有实色底板、立绘按内容尺寸统一缩放不溢出图片窗；进出图鉴无卡死（3.2 图鉴各条款）。
  9. **Boss 在场时**：弱点与阶段建议出现在底部信息栏，左对齐排版（3.4 Boss 信息归并）。
- 屏幕适配补充（新增要求，超出历史条款）：
  - 当前 `Phaser.Scale.FIT` 在非 9:16 屏（如 iPhone 长屏 19.5:9、iPad 4:3）上产生上下/左右黑边，属可接受方案，但需验证黑边区背景色与游戏底色一致（`backgroundColor` 现为 `#028af8` 亮蓝，改为与游戏场景底色一致的深色，如 `#1a1a2e`）。
  - 用 390×844 与 1024×768 两种视口各截一张主游戏界面图存档到 `docs-archive/regression-screenshots/`（连同 720×1280 基准图）。
- AC：9 条走查清单全部"通过"或已修复并复验；3 张适配截图存档；`main.ts` 背景色已改深色。


---

## P4 游戏设计补强

### T4-1 音效系统（planning 中唯一未完成的 P0 级需求）

- 方案：使用 Web Audio 程序化合成（零资产依赖，先行落地；后续美术/音频资产到位可替换）。
- 实现：新增 `frontend/src/managers/AudioManager.ts`：
  1. 基于 Phaser Sound 或原生 `AudioContext` 合成短音效：`merge`（上行双音 440→660Hz，80ms）、`spawn`（短促 220Hz，40ms）、`critical`（三连上行琶音）、`skill`（扫频 300→900Hz）、`boss_hit`（方波 110Hz，100ms）、`boss_defeat`(下行琶音)、`unlock`（五声音阶上行）、`click`（1kHz，20ms）、`gameover`（下行双音）、`true_ending`（大三和弦琶音，1s）。
  2. BGM：可选实现——用简单五声音阶序列器循环（音量 0.15）；若实现复杂度过高，仅留 `playBgm()` 空挂点与 TODO 注释，不算违反 AC。
  3. 主菜单加静音开关（右上角图标，状态存 localStorage `horse_merge_muted`）。
  4. 接线：合成、暴击、技能释放、Boss 受击/击败、解锁弹窗、按钮点击、结算进入、真结局达成，共 8+ 处调用点。
- AC：上述交互均有对应音效；静音开关即时生效且跨局持久；iOS Safari 首次触摸后音频可播（AudioContext resume 处理）。

### T4-2 配方扩充（7 条 → 15 条）

- 文件：`frontend/src/data/recipes.json`、参考 `horse-merge-design/02-characters/synthesis-graph.md` 与 `100-roster-master.md`
- 修改：从 roster 设计文档的配方章节中提取尚未落地的突变配方补入，如无明确可提取项，则按以下规则新增 8 条 mutation（ingredient 必须是 characters.json 中真实存在的 ID，实现前逐一校验）：
  - 每个 faction 至少 2 条跨 faction 突变，结果角色等级 = 两 ingredient 平均等级 + 3（向下取整，且结果必须是已存在角色，选最接近该等级的同 faction 角色）。
  - 配方 desc 用一句谐音梗说明（与项目文案风格一致）。
  - 遵守 requirements 3.1「节奏保护」：结果等级不得超过两 ingredient 最高等级 + 5。
- AC：`recipes.json` ≥ 15 条且全部 ingredient/result ID 有效（写校验脚本 `frontend/scripts/validate-data.mjs`：检查 recipes/bosses/items 中引用的所有角色 ID 均存在于 characters.json，跑通）；游戏内实测 3 条新配方可触发。

### T4-3 数值调优挂钩（把魔法数字变成可调配置）

- 新增 `frontend/src/data/balance.json`：集中以下现散落常量（保持当前值为默认值，行为不变）：
  - 暴击率 0.05（Grid.ts 约 1676 行）
  - Boss spawn 回合阈值 30/20（BossManager.ts 约 56 行）
  - 大和谐条件：101 卡数 ≥ 2、95+ 占比 ≥ 0.35、稳定回合 ≥ 3、终章事件 ≥ 1（Grid.ts 约 385 行）
  - 初始金币 1000（SaveManager）
  - 新子生成等级窗口、低级清场阈值曲线（SpawnSystem 中的参数）
  - 道具价格改由 items.json 保持（已在数据层，不动）
- Boot.ts 随其他 JSON 一并加载，消费方从注册表读取。
- AC：修改 balance.json 中暴击率为 1.0 后重启，每次合成必暴击（验证后改回 0.05）；`rg "0\.05|>= 2.*101" frontend/src` 无残留硬编码判定。

### T4-4 backend 决策：删除脚手架，纯前端交付

- 现状：backend 仅 health 端点，前端零调用；需求 3.5 的 blessing/leaderboard 无任何消费场景（祝福语已内置在 characters.json 的 greeting 字段，排行榜无账号体系支撑）。
- 修改：
  1. 删除 `backend/` 目录与根目录 `deploy-guide.md` 中 FastAPI 相关章节（deploy-guide 改写为纯静态托管说明：`npm run build` 后将 `frontend/dist` 部署到任意静态服务器/如 Nginx，给出 Nginx 最小配置示例，保留原文档中仍有效的服务器信息）。
  2. `requirements.md` 3.5 节改写为：「后端功能：本期采用纯前端静态部署；排行榜与签文 API 移入远期规划（Backlog）」。
  3. `project planning.md` Phase 5 对应任务标记为「已裁剪（纯前端方案）」。
- AC：仓库无 backend 目录；两份需求/计划文档同步更新；deploy-guide 可照做完成部署。

---

## P5 文档与仓库治理

### T5-1 过期文档归档

- 新建 `docs-archive/` 目录，**移动**（不删除）以下文件/目录：
  ```
  assets_guide.md, assets_guide_v2.md, assets_guide_v4.md,
  design_supplement_v3.2.md, character_prompts_v5.md,
  ui_assets_prompts_v5.md, nano_banana_prompts.md,
  development_roadmap_v1.plan.md, ui_info_panel_fix_plan.md,
  horse-merge-design/03-art-prompts/full-roster-prompts.md,
  horse-merge-design/02-characters/character-matrix.md,
  horse-merge-design/05-technical/data-structure.md,
  scripts/create_boss_data.py,
  rush-game-design/  （整个目录）
  ```
- 在 `docs-archive/README.md` 中写明归档原因（各一行，取自本 Spec 审计结论）。
- AC：根目录只剩当前有效文档最小集：`requirements.md`、`project planning.md`、`assets_guide_v5.md`、`character_prompts_v6.md`、`ui_assets_prompts_v6.md`、endgame 四文档、`deploy-guide.md`、本 Spec；`horse-merge-design/` 内不再含已归档文件。

### T5-2 需求文档矛盾修正

- 文件：`requirements.md`
- 修改：
  1. 3.1 矩阵系统：「初始 4x4/5x5、进阶 8x8」改为与实现一致的「固定 6×6 网格」（若未来要做 8×8 扩展，另立 Backlog 条目，不写成现状）。
  2. 3.1 概率生成：「Lv.1 (90%) 或 Lv.2 (10%)」与实现的动态等级窗口核对，按 `SpawnSystem` 实际逻辑重写该条。
  3. 技术栈章节：删除「后端 FastAPI/SQLite」表述（配合 T4-4）。
- AC：requirements.md 与代码行为无已知矛盾（对照本 Spec P0–P4 逐条自查）。

### T5-3 修正内容错位的设计文档

- `horse-merge-design/03-art-prompts/style-guide.md`：内容实为旧版 game-loop 文案 → 移入 docs-archive 并在原位留一行指引，或若能从 `ui_assets_prompts_v6.md` 提炼出真正的风格指南（赛博×水墨、深皇室蓝+霓虹紫+金、禁绿），则重写为 30 行以内的正式 style-guide。选择重写。
- `horse-merge-design/06-simulation/gameplay-walkthrough.md`：内容错位（实为 combat/economy），移入 docs-archive。
- AC：`horse-merge-design/` 内每个文件名与内容匹配。

### T5-4 任务清单同步

- 文件：`project planning.md`
- 修改：新增「Phase 7: 全面整改（remediation_spec_v1）」小节，把本 Spec 的 T0-1…T5-4 逐条列为任务项；实现完成一项勾选一项；原有「音效集成」「数值调优」两条挂到对应 T4-1/T4-3 下。
- AC：planning 与本 Spec 任务一一对应，实现完毕后全部勾选。

---

## 附录 A：验收总回归清单（全部任务完成后执行）

1. `cd frontend && npx tsc --noEmit` — 零错误。
2. `node scripts/validate-data.mjs` — 数据引用全部有效。
3. `npm run build && npm run preview`，Chrome 移动模拟 + Fast 4G：进入主菜单 ≤ 3s。
4. 完整局流程：新局 → 合成至 Lv.16 触发 Boss → 用弱点角色技能击败 → 商店购买并使用全部 6 种可购道具 → 金元宝/猴子掉落验证 → 图鉴进出无卡死 → 故意死局 → 结算页显示历史最佳。
5. 终局流程（可临时调 balance.json 加速）：合成至 Lv.101 → 分流卡 → 选挑战 → 达成大和谐 → 验证四路线之一的真结局卡正确显示（endingChar 非空、卡面与路线一致）→ 图鉴中对应隐藏卡解锁可见、其余 3 条仍隐藏。
6. 音效 8 处触发点逐一验证 + 静音开关。
7. 启动 console 无 loaderror、无生产 console.log。
8. T3-5 的 9 条 UI 布局走查清单全部通过，3 张适配截图已存档。

## 附录 B：待补美术清单（本 Spec 不生成图片，仅登记）

| 资源 | 用途 | 规格建议 |
|---|---|---|
| `bg_gallery.webp` | 图鉴背景 | 720×1280，赛博水墨 |
| `top_bar_bg.webp` | 顶栏底 | 720×96 窄条 |
| `ui_panel_9slice.webp` | 通用九宫面板 | 128×128 可九切 |
| `item_gold_ingot.webp` / `item_monkey.webp` | 道具图标 | 256×256 |
| BGM / SFX 音频资产 | 替换程序化合成 | ogg+m4a 双格式 |

生成 prompt 时遵循 `ui_assets_prompts_v6.md` 风格规范（赛博×水墨、深皇室蓝+霓虹紫+金、禁绿）。
