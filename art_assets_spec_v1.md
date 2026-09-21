# 马马合体 美术资产缺口与重制方案 Spec v1.0

> 生效日期：2026-07-11
> 用途：本文档 = 美术资产审计结论 + 完整生产方案（Midjourney / Nano Banana 直接可用的 prompt、参数、操作流程、验收标准）。
> 关联：`remediation_spec_v1.md`（整改 Spec，T0-4 / T1-1 / 附录 B）、`ui_assets_prompts_v6.md`（风格真源）、`character_prompts_v6.md`（角色 prompt 真源）、`assets_guide_v5.md`（切图管线规范）。
> 审计方式：对 220 张角色图、26 张 UI 图做了程序化检测（尺寸/透明度/帧对齐）+ 视觉抽样检查。

---

## 第一部分：审计结论

### 缺口清单（代码引用但磁盘不存在，共 10 项）

| 资源 | 用途 | 现状后果 | 处置 |
|---|---|---|---|
| `bg_gallery` | 图鉴/结算页背景 | GameOver 回退纯色红底 | **生产**（清单 §3.1） |
| `top_bar_bg` | 顶栏底图 | 回退矩形 | **生产**（§3.2） |
| `ui_panel_9slice` | 通用弹层面板 | 回退矩形 | **生产**（§3.3） |
| `btn_generic` | 通用按钮 | 代码未实际使用 | **生产**（§3.4，供后续 UI 统一用） |
| `item_gold_ingot` | 金元宝道具图标 | 无贴图（玩法 Spec G7/整改 T0-7 需要它） | **生产**（§3.5） |
| `item_monkey` | 猴子道具图标 | 同上 | **生产**（§3.6） |
| `bottom_dock_bg` | 底部码头底图 | 代码未使用 | **放弃**，从 Preloader 删除（整改 T0-4） |
| `skill_icons_sheet` | 技能图标集 | 代码未使用 | **放弃**，技能按钮走程序化绘制 |
| `particle_star` / `particle_smoke` | 粒子贴图 | 特效静默跳过 | **放弃生图**，按整改 T0-4 程序化生成（AI 生成 32px 粒子性价比极低） |

### 硬伤清单（存在但有质量问题）

**硬伤 A：动作条第 3 帧被 AI 自发烤入英文文字（最严重）**

抽样确认至少 3 例：`god_of_war_action.png` 第 3 帧含「CRITICAL STRIKE! STRIKE!」（重复错句）、`elon_mars_action.png` 含「TO THE MOON!」、`auntie_ma_action.png` 含一整句错乱英文（"WHAT?! You said KITCHEN TOOLS?…"）。`character_prompts_v6.md` 的 action 模板**没有**加 no-text 负向约束（base 模板有），属于 prompt 模板缺陷导致的批量风险。中文马年主题游戏棋盘上闪现错拼英文梗字，是明确硬伤且无法本地化。
→ 处置：先全量排查（§2.4 排查脚本），受污染的条目按 §4.1 模板重出。抽样估计污染率 20–40%（108 条中约 25–45 条）。

**硬伤 B：5 条动作条帧间错位（程序化检测确认）**

帧内容中心水平偏移 >18% 或高度差 >30%，游戏内播放动画时角色会跳动：
`elon_mars_action.png`、`rainbow_fly_action.png`、`pegasus_fly_action.png`、`sun_chariot_action.png`、`vest_turtle_action.png`
→ 处置：按 §4.1 模板重出（elon_mars 与硬伤 A 重叠，一次解决）。

**硬伤 C：UI 风格体系分裂为两族且未成文**

实测：主菜单背景、信息面板、边框、角色全体 = **16-bit 像素风**（v6 规范）；而终章系资源（`ending_choice_card`、`chapter_banner_tier`、`boss_briefing_panel`、`harmony_progress_panel`、`unlock_harmony_badge`）= **厚涂仪式风**，且内部色调也不统一（choice 卡蓝金、boss 简报**红金**）。
→ 处置（制作人决策，本 Spec 定案）：**正式确立双风格体系**——局内高频元素一律像素风；终章/仪式类固定卡面允许厚涂风，但统一为「深蓝底 + 鎏金框」色系。据此只需重出 1 张：`boss_briefing_panel`（红金 → 蓝金，§4.2）。此决策需写入 `ui_assets_prompts_v6.md` 头部说明。

**硬伤 D：`border_ssr` 中心残留半透明白雾 + 彩虹渐变含绿色**

中心透明区飘着半透明白色云雾，叠在角色立绘上会蒙一层灰；彩虹渐变含明显绿色段，违反 v6「绝对避免绿色」的 UI 用色红线。
→ 处置：重出（§4.3）。其余 4 个 border 抽查合格。

**硬伤 E：base 立绘与 action 条角色身份漂移（中等，选择性处理）**

例：`bamboo_horse.png`（base）是仰立、鬃毛发光的亮绿竹马；`bamboo_horse_action.png` 是站姿深绿竹马，形体细节明显不同。玩家在棋盘（用 action 帧）与图鉴卡（用 base）间会看到"两匹马"。
→ 处置：**不做全量重出**（成本不可控）。仅在硬伤 A/B 重出时，将该角色的 base 图作为垫图喂给 Nano Banana 做一致性锚定（§2.3 操作法）；其余存量漂移接受为现状，后续按玩家反馈逐个修。

**硬伤 F：base 立绘内容占比不齐（68%–86%）**

角色在 512×682 画布内的实际内容占比波动大，是图鉴"忽大忽小"问题的资产侧根源。代码侧已通过内容尺寸缩放缓解（planning 已勾选），资产侧无需重出。
→ 处置：新出图一律遵守 §2.2 的构图安全区规范，从源头收敛。

**硬伤 G：全量尺寸/体积超标**

角色 base 平均 ~700KB、UI 图标 1024–2048px 单张最大 7.7MB。由整改 Spec T1-1（压缩转 WebP）解决，**本 Spec 新出图直接按 §2.2 目标尺寸交付，不要再出 2048 巨图**。

**非问题（不要动）**：`great_harmony_*` 四张群像卡为像素风带装饰白框的整卡设计，与结算页用法匹配，质量合格；关羽绿袍、竹马绿色属角色设定色，不受 UI 禁绿约束。

---

## 第二部分：通用生产规范

### 2.1 工具选择与参数

| 场景 | 首选工具 | 理由与参数 |
|---|---|---|
| UI 面板/背景/边框 | **Midjourney** | 结构稳定。参数统一：`--ar 按条目 --style raw --v 6.1`（若用 niji 模型出像素风更稳可换 `--niji 6 --style raw`） |
| 角色动作条重出 | **Nano Banana** | 支持垫图（喂 base 立绘锚定身份），文字污染可用负向词压制且可反复重 roll 单帧 |
| 道具小图标 | 两者皆可 | MJ 出 4 连选 1 效率高 |

**Midjourney 通用后缀**（每条 prompt 末尾追加）：
`--ar <条目指定> --style raw --v 6.1 --no text, words, letters, watermark, signature, green, teal`

**Nano Banana 通用尾注**（写进 prompt 正文末尾）：
`Output size: <条目指定>. Absolutely no text, no words, no letters, no speech bubbles, no captions, no watermark. No green, no teal colors in UI elements.`

### 2.2 交付规格（新出图统一标准，对齐整改 T1-1 压缩后规格）

| 类别 | 生成尺寸 | 入库最终尺寸 | 构图安全区 |
|---|---|---|---|
| 角色 action 条 | 1536×512（3 帧） | 高 256 等比 | 每帧主体占帧宽 70–80%，三帧地平线一致、主体水平居中 |
| UI 背景（竖版） | 1024×1820 | 最长边 1440 | 上 15% 与下 25% 留纯背景（程序叠标题/按钮） |
| UI 面板/横条 | 按比例 1024 宽 | 最长边 1024 | 中心 70% 为可写文字的低对比区 |
| 边框 | 1024×1024 | 512×512 | 中心 ≥65% 完全透明（生成时为纯白，切图去底） |
| 道具图标 | 512×512 | 256×256 | 主体占 75%，四周留白 |

### 2.3 操作流程（固定管线，逐步执行）

1. **出图**：按第三/四部分 prompt 生成，MJ 选 4 连中最优、U 放大；Nano Banana 重出角色时**先上传该角色现有 base 图作垫图**，prompt 前缀加 `Based on the attached character reference, keep the exact same character design, colors and proportions.`
2. **入库前命名**：严格使用条目标注的文件名（全小写下划线），放入 `frontend/raw_assets/`。
3. **切图处理**：项目根目录执行 `source venv/bin/activate && python scripts/process_assets.py`（现有管线：智能去白底、action 条 3 帧切分校验、分类输出到 `frontend/public/assets/`）。处理后抽查透明边缘无白边残留。
4. **压缩**：执行整改 Spec T1-1 的 `scripts/optimize_assets.py`（若已实现），转 WebP 入库。
5. **代码接线**：缺口类资源需恢复 Preloader 加载项（若整改 T0-4 已删除对应 load，则按本 Spec 补回，并删除对应的回退死分支）；文件后缀与 T1-1 保持一致。
6. **验收**：跑一局完整流程 + 图鉴 + 结算，核对每张新图的实际显示效果（无白边、无错位、层级正确）。

### 2.4 动作条文字污染全量排查（生产前必做）

新增 `scripts/audit_action_frames.py`（用根目录 venv 的 Pillow）：
1. 把 108 条 action 图的**第 3 帧**裁出，拼成若干张 6×5 联系表（contact sheet）输出到 `docs-archive/action-frame-audit/`，每格标注文件名。
2. 人工过一遍联系表（约 4 张图、5 分钟），把含文字/气泡/乱码的条目登记到同目录 `polluted_list.txt`。
3. `polluted_list.txt` + 硬伤 B 的 5 条错位名单 = 最终重出清单。
- AC：联系表覆盖全部 108 条；重出清单成文。

---

## 第三部分：缺口资产生产清单（新增 6 项）

> 每条含：文件名 / 工具 / 尺寸 / 可直接复制的完整 prompt。MJ 记得追加 §2.1 通用后缀。

### 3.1 `bg_gallery.png` — 图鉴与结算页背景（MJ，--ar 9:16，入库 1440 高）

```
pixel art vertical background for a character collection gallery screen, quiet library of floating holographic horse statues in a starry void, deep royal blue gradient sky with subtle traditional ink wash cloud patterns, faint neon purple shelf lines, dim and calm lighting so foreground cards stay readable, large empty central area, symmetrical composition, 16-bit retro style, no green, no teal, no text, no characters in focus
```

### 3.2 `top_bar_bg.png` — 顶栏底图（MJ，--ar 15:2，入库 1024 宽）

```
pixel art narrow horizontal UI top bar background, sleek dark royal blue metal plate with thin gold trim on the bottom edge, subtle circuit patterns fading toward the center, flat and low-contrast center area for score text, futuristic HUD element, 16-bit style, isolated on white background, no green, no text
```

### 3.3 `ui_panel_9slice.png` — 通用九宫面板（MJ，--ar 1:1，入库 512×512）

```
pixel art square UI dialog panel, dark royal blue semi-opaque glass center, corners decorated with small gold traditional cloud motifs, thin neon purple border line, designed as a nine-slice scalable panel with uniform edges and plain center, minimalist, 16-bit style, isolated on white background, no green, no text
```

### 3.4 `btn_generic.png` — 通用按钮底（MJ，--ar 3:1，入库 384×128）

```
pixel art horizontal rounded rectangle game button, polished gold gradient surface with darker gold border and subtle top highlight, slight bevel for pressed-state contrast, blank surface with no icon, mobile game UI style, 16-bit, isolated on white background, no green, no text
```

### 3.5 `item_gold_ingot.png` — 金元宝道具（MJ 或 NB，--ar 1:1，入库 256×256）

```
pixel art icon of a traditional Chinese gold ingot (yuanbao) with a futuristic holographic glow, shiny golden surface with a small neon purple digital circuit engraving, floating slightly with sparkle particles, wealth and fortune symbol, isometric view, 16-bit style, pure white background, no shadow, no text
```

### 3.6 `item_monkey.png` — 猴子道具（MJ 或 NB，--ar 1:1，入库 256×256）

```
pixel art icon of a cute cheeky golden monkey plush toy sitting and holding a small golden horseshoe charm, mischievous smile, soft fur texture in pixel shading, warm gold and brown colors with a subtle neon purple collar, isometric view, 16-bit style, pure white background, no shadow, no text
```

---

## 第四部分：硬伤重出清单

### 4.1 动作条重出模板（硬伤 A + B，Nano Banana，垫图必选）

对排查清单中的每个角色，操作：
1. 上传该角色 `frontend/public/assets/sprites/characters/{id}.png`（base 图）作为参考图。
2. 从 `character_prompts_v6.md` 检索该角色的 `[2] Action 动作长条` prompt，取其**角色描述句 + 动作句**（即 `performing ...` 之前到句号的部分），代入下方模板 `{CHARACTER_AND_ACTION}` 位置。
3. 生成 → 目检三帧（无文字、无气泡、主体等大、地平线一致）→ 不合格重 roll。

模板（单段直接可用）：

```
Based on the attached character reference, keep the exact same character design, colors and proportions across all frames. Pixel art sprite sheet, horizontal strip of exactly 3 individual frames with equal spacing and zero overlapping, same character scale and same ground line in every frame, centered in each frame cell. Frame 1: static standing pose. Frame 2: subtle idle motion. Frame 3: {CHARACTER_AND_ACTION}, dynamic action pose with visual effects only. 16-bit pixel art style, vibrant colors, clean outlines, isometric view, pure white background. Absolutely no text, no words, no letters, no numbers, no speech bubbles, no captions, no sound-effect words, no watermark. Output size: 1536x512.
```

- 交付：覆盖 `frontend/raw_assets/{id}_action.png` → 跑 process_assets.py → 跑帧对齐检测脚本复验（§2.4 脚本加 `--verify {id}` 模式）。
- AC：重出条目全部通过帧对齐检测（中心偏移 ≤10%、高度差 ≤20%）；三帧均无任何文字；游戏内 idle/action 动画播放无跳动。

### 4.2 `boss_briefing_panel.png` 重出（硬伤 C，MJ，--ar 18:5，入库 1024 宽）

统一入"仪式厚涂族"的蓝金色系（对齐 `chapter_banner_tier` 与 `ending_choice_card`）：

```
ornate horizontal game UI briefing panel, painterly style, deep royal blue silk background with faint starfield, elaborate golden filigree border with traditional Chinese dragon motifs on the left side and a golden galloping horse silhouette motif on the right, small gold warning emblem centered on the top edge, large clean dark-blue empty center area for text, premium ceremonial mobile game quality, no green, no teal, no text
```

- AC：与 `chapter_banner_tier` 并排截图对比色系一致；中心文字区对比度足够（叠白色文字可读）。

### 4.3 `border_ssr.png` 重出（硬伤 D，MJ，--ar 1:1，入库 512×512）

```
pixel art square card frame, SSR legendary rarity, holographic crystal border in gold, neon purple and magenta gradient only, sparkling data particles on the outer edge only, completely empty and clean transparent center with no fog no glow no particles inside the frame, square shape, 16-bit style, isolated on white background, no green, no teal, no rainbow green segment, no text
```

- AC：切图后中心区域 alpha 全 0（脚本检查中心 60% 区域无非透明像素）；渐变无绿色段。

### 4.4 风格决策成文（零生图任务）

在 `ui_assets_prompts_v6.md` 头部「核心风格」下追加一段：

> **双风格体系（2026-07 定案）**：局内高频元素（棋子、图标、面板、背景、边框）一律 16-bit 像素风 + 深蓝/霓虹紫/金；终章与仪式类固定卡面（101 分流卡、章节横幅、Boss 简报、大和谐面板、解锁徽章、真结局群像）允许厚涂仪式风，但统一为深蓝底 + 鎏金框色系，禁止红底金框等偏离色调。

---

## 第五部分：优先级与工作量

| 批次 | 内容 | 生图量 | 前置 |
|---|---|---|---|
| **批次 1（必做）** | §2.4 排查脚本与联系表 → 硬伤 A/B 动作条重出 | 约 25–45 条 | 无 |
| **批次 2（必做）** | 缺口 6 项（§3.1–3.6） | 6 张 | 整改 T0-4 的取舍先确认 |
| **批次 3（应做）** | `boss_briefing_panel`、`border_ssr` 重出 + 风格决策成文 | 2 张 | 无 |
| 不做 | 粒子/技能图标集/底部码头（程序化或放弃）、base 立绘全量重出、great_harmony 重出 | 0 | — |

与其他 Spec 的衔接：
- 整改 Spec **T0-4** 对 `bg_gallery`/`top_bar_bg`/`ui_panel_9slice` 的处置从「删加载 + 回退」改为「保留加载，待批次 2 交付」；`particle/skill_icons/bottom_dock` 维持 T0-4 原案（程序化/删除）。
- 整改 Spec **T0-7** 的 emoji 图标临时方案在批次 2 交付后替换为正式贴图。
- 整改 Spec **附录 B** 待补清单由本 Spec 全面取代。
- 所有新图入库前必须走 **T1-1** 压缩管线，禁止原图直接进 `public/assets`。
