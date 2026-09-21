# Nano Banana 专用生成清单 (UI & Items V6.0)

**说明**:
*   **用途**: 用于生成游戏界面、图标、道具和特效。
*   **核心风格**: 赛博朋克 x 水墨融合 (Cyberpunk x Ink Wash), AI 未来感与传统美好 (AI Future x Traditional Beauty)。
*   **核心色彩**: 深皇室蓝 (Deep Royal Blue)、霓虹紫 (Neon Purple)、金色 (Gold)。**绝对避免绿色/青色 (NO Green, NO Teal)。**
*   **主题定位 (2026-07 更新)**: 马年主题（非贺岁/春节档期）。新增资产避免灯笼、鞭炮、红包、春联等强节庆符号，以骏马、马蹄铁、祥云、星空等马年与东方意象替代。
*   **双风格体系 (2026-07 定案)**: 局内高频元素（棋子、图标、面板、背景、边框）一律 16-bit 像素风 + 深蓝/霓虹紫/金；终章与仪式类固定卡面（101 分流卡、章节横幅、Boss 简报、大和谐面板、解锁徽章、真结局群像）允许厚涂仪式风，但统一为深蓝底 + 鎏金框色系，禁止红底金框等偏离色调。
*   **格式**: 直接复制 Prompt 到 AI 生成工具。

---

## ⚠️ 图片资产命名与存放规则 (非常重要)
为了让游戏程序能够自动识别和加载生成的图片，请严格按照以下规则命名保存，并放入对应的文件夹中（如果您直接覆盖到游戏目录，请放入 `frontend/public/assets/ui/` 或 `frontend/public/assets/sprites/items/` 等相应目录，或放入 `frontend/raw_assets/` 交由您的切图处理流程）：

*   **命名格式**: 全小写英文，使用下划线 `_` 分隔。
*   **具体命名**: 请严格使用每个 Prompt 标题中括号 `[]` 里的英文作为文件名。例如：`[ui_inventory_bg]` 对应的图片保存时应命名为 `ui_inventory_bg.png`。

---

## 1. 全局背景与布局容器 (Global Backgrounds & Panels)

**[bg_main_menu] 主菜单背景**
*(注意：此界面程序会自动绘制按钮，所以生图绝对不要包含按钮和文字，并在下方留出空间)*
`pixel art main menu background for a game titled "Horse成双", featuring two majestic horses (one cybernetic blue, one traditional ink wash black) galloping side by side, merging into a burst of digital light, dynamic composition, deep royal blue and neon purple sky, golden horizon, bright and inspiring atmosphere, absolutely no green, no teal, clean empty space at the bottom for UI, no text, no words, no buttons, futuristic yet elegant, retro 16-bit style, high resolution --ar 9:16`

---

**[bg_game_grid] 游戏棋盘背景**
*(垫在棋盘底部的背景)*
`pixel art game board background, clean interface, dark blue tech-textured surface with subtle traditional ink wash patterns in low opacity, minimalist futuristic grid lines in glowing purple, absolutely no green, 16-bit style, square composition --ar 1:1`

---

**[ui_inventory_bg] 道具栏背景 (新增拆分)**
*(用于底部放置3个已购道具的横条容器，比例约 6:1)*
`pixel art horizontal UI bar background, sleek dark royal blue metal texture with neon purple trim, subtle circuit board patterns mixed with traditional knot designs, high-tech RPG inventory dock, no green, isolated on white background --ar 6:1`

---

**[ui_shop_bg] 商店背景 (新增拆分)**
*(用于底部商店的宽面板容器，比例约 7:2)*
`pixel art horizontal UI panel background for a shop, deep blue glass texture with golden holographic borders, futuristic vendor display style, no green, no text, isolated on white background --ar 7:2`

---

**[ui_slot_frame] 通用插槽边框 (新增拆分)**
*(用于包裹商店商品和道具栏单个道具的方形外框)*
`pixel art single square UI slot frame, metallic gold and dark blue border, sleek cyber design, empty transparent center, isolated on white background --ar 1:1`

---

**[ui_info_panel] 详情信息面板 (新增拆分)**
*(用于展示选中角色详情的矩形面板，比例约 4:1)*
`pixel art info panel background, rectangular shape, dark blue tech interface with holographic neon purple data lines, blending with traditional scroll edges, no green, isolated on white background --ar 4:1`

---

## 2. 棋子边框 (Tile Borders)
*(注意：这些依然需要保持透明中心 `empty center`)*

**[border_n] N级边框 (Normal)**
`pixel art card frame, Normal rarity, simple clean dark grey tech frame, rounded corners, minimalist, square shape, empty center, isolated on white background --ar 1:1`

---

**[border_r] R级边框 (Rare)**
`pixel art card frame, Rare rarity, silver metallic frame with purple circuit lines, polished steel texture, square shape, empty center, isolated on white background --ar 1:1`

---

**[border_sr] SR级边框 (Super Rare)**
`pixel art card frame, Super Rare rarity, golden frame with traditional cloud carvings, glowing warm light, luxury feel, square shape, empty center, isolated on white background --ar 1:1`

---

**[border_ssr] SSR级边框 (SSR)**
`pixel art card frame, SSR rarity, holographic rainbow crystal frame with neon purple edges, sparkling data particles, legendary feel, square shape, empty center, isolated on white background --ar 1:1`

---

**[border_hidden] 隐藏级边框 (Hidden)**
`pixel art card frame, Hidden rarity, deep blue void frame with glitching pixel effects and gold accents, mysterious, dark energy radiating, square shape, empty center, isolated on white background --ar 1:1`

---

## 3. 基础图标 (Icons)

**[icon_coin] 金币图标**
`pixel art gold coin icon, futuristic digital coin, glowing yellow gold, floating, isometric view, 16-bit style, pure white background, no shadow --ar 1:1`

---

**[icon_score] 积分图标**
`pixel art trophy icon, digital medal, glowing purple and gold, shiny, isometric view, 16-bit style, pure white background, no shadow --ar 1:1`

---

**[icon_shop] 商店入口图标**
`pixel art shop icon, futuristic AI capsule dispenser, deep blue and gold, cute style, isometric view, 16-bit style, pure white background, no shadow --ar 1:1`

---

**[icon_freeze] 冰冻状态图标**
`pixel art freeze status icon, deep blue and purple ice crystals forming an overlay, cold mist, isometric view, 16-bit style, pure white background, no shadow --ar 1:1`

---

**[icon_fire] 火焰状态图标**
`pixel art fire status icon, digital glitch flame, burning orange and neon red, pixelated fire effect, isometric view, 16-bit style, pure white background, no shadow --ar 1:1`

---

**[icon_stone] 石化状态图标**
`pixel art stone status icon, grey digital rock with glowing blue circuit cracks, heavy solid block, isometric view, 16-bit style, pure white background, no shadow --ar 1:1`

---

**[icon_magma] 岩浆状态图标**
`pixel art magma status icon, molten lava pool with dark crust, glowing red heat, dangerous terrain, isometric view, 16-bit style, pure white background, no shadow --ar 1:1`

---

**[icon_shadow] 幻影状态图标**
`pixel art shadow silhouette icon, dark mysterious figure with glitch effects, purple data noise, isometric view, 16-bit style, pure white background, no shadow --ar 1:1`

---

**[icon_devour] 吞噬状态图标**
`pixel art black hole icon, swirling digital void, dark purple and black vortex, absorbing data, isometric view, 16-bit style, pure white background, no shadow --ar 1:1`

---

**[icon_poison] 剧毒状态图标**
`pixel art poison status icon, bubbling green and purple acid, digital toxic skull symbol, glitchy liquid, isometric view, 16-bit style, pure white background, no shadow --ar 1:1`

---

## 4. 道具图标 (Items)

**[item_cannon] 大炮 (Cannon)**
`pixel art icon of a futuristic energy cannon, sleek dark blue and gold design, sci-fi weapon, isometric view, 16-bit style, pure white background, no text --ar 1:1`

---

**[item_tiger] 老虎玩偶 (Tiger Doll)**
`pixel art icon of a cute robo-tiger doll, mechanical joints but plush exterior, orange and dark metal, sitting pose, isometric view, 16-bit style, pure white background, no text --ar 1:1`

---

**[item_deer_sign] 鹿牌 (Deer Sign)**
`pixel art icon of a digital holographic sign board displaying a pixelated deer image, neon purple outline, glitch effect, isometric view, 16-bit style, pure white background, no text --ar 1:1`

---

**[item_brush] 神笔 (Magic Brush)**
`pixel art icon of a stylus pen drawing a glowing 3D gold line, creative tool, isometric view, 16-bit style, pure white background, no text --ar 1:1`

---

**[item_plum] 青梅 (Plum)**
`pixel art icon of a crystallized purple plum, translucent and glowing like a gem, sci-fi fruit, isometric view, 16-bit style, pure white background, no text --ar 1:1`

---

**[item_whisk] 马尾拂尘 (Whisk)**
`pixel art icon of a modern energy whisk, handle is sleek metal, "hair" is glowing neon optical fibers, isometric view, 16-bit style, pure white background, no text --ar 1:1`