# 终章仪式感升级包

## 1. 本轮已落地的前端改造
- 章节阶段感知：新增章节横幅、持续目标面板、里程碑提示。
- Boss 仪式感：新增 Boss 降临 briefing，并将弱点与当前目标放入常驻面板。
- 101 分流：首次出现 `Lv.101` 后先弹出结算分流，允许“封卷”或“挑战大和谐”。
- 真结局角色重定义：隐藏终局角色改为 `双马同谐`，并支持按游玩路线切分为不同风格的真结局版本。
- 图鉴隐藏规则：终局隐藏角色未解锁前不出现在角色图鉴，解锁后显示并补充解锁条件文案。

## 1.5 文档分工
- `endgame-cast-manifest.md`
  - 真结局各风格版本的固定 cast、C 位、身份锚点与不可变规则。
  - 也是四个版本角色名单是否互斥的唯一真源，后续新增或替换角色时优先改这里。
- `endgame-prompt-template.md`
  - 仅保留最简使用说明；实际生图时不需要使用它。
- `endgame-variant-prompts.md`
  - 四种真结局版本的完整结局卡 prompts，直接复制整段即可生图。
  - 其中每个版本的 cast 必须直接继承 `endgame-cast-manifest.md`，不得手动临时拼接。
- 本文档
  - 资源交付清单与当前可直接投喂的赛博科幻版样例 prompt。

## 2. 美术资源清单

说明：以下每条都按“可直接投喂 Nano Banana 2”的方式编写，`尺寸`、`比例`、`格式`、`背景要求`、`构图约束`、`负向约束` 已并入完整 Prompt，直接复制即可使用。

### A. 章节横幅底图
- 文件名：`ui/chapter_banner_tier.png`
- 尺寸：`1024x256`
- 格式：`PNG`，透明背景
- 用途：阶段切换时的横幅动画底图，支持文字叠加
- 完整 Prompt:

```text
Generate a premium mobile game UI asset for a ceremonial chapter banner. Output size 1024x256, aspect ratio 4:1, PNG with transparent background. Horizontal composition, center area must stay visually clean for title text overlay, leave safe margins on both left and right edges. Style: miniature diorama, playful ceremonial, chinese new year meets cosmic horse fantasy, dark indigo and antique gold palette, swirling nebula silk ribbons, subtle ink wash clouds, ornate metallic frame, festive but not overly solemn, humorous heroic energy, polished 2D game interface, high contrast, elegant layered depth, no characters. Negative constraints: no text, no letters, no numbers, no watermark, no logo, no UI mockup hands, no cropped ornaments, no busy center.
```

### B. Boss 降临 briefing 底图
- 文件名：`ui/boss_briefing_panel.png`
- 尺寸：`1024x320`
- 格式：`PNG`，透明背景
- 用途：Boss 出场 briefing、弱点提示
- 完整 Prompt:

```text
Generate a boss arrival briefing panel for a mobile merge game. Output size 1024x320, aspect ratio 16:5, PNG with transparent background. Horizontal warning panel, dramatic dark crimson ceremonial frame, center text zone must remain readable and open, upper center reserved for boss title, lower center reserved for weakness tips. Visual style: chinese new year festival mixed with arcade threat alert, playful villain energy, glowing gold edges, ember sparks, asymmetrical ornamental corners, miniature diorama UI style, polished layered shading, premium game HUD quality. Negative constraints: no text, no letters, no numbers, no watermark, no logo, no characters, no clutter over central reading area.
```

### C. 大和谐任务面板底图
- 文件名：`ui/harmony_progress_panel.png`
- 尺寸：`1024x256`
- 格式：`PNG`，透明背景
- 用途：大和谐阶段三条件常驻提示
- 完整 Prompt:

```text
Generate a true-ending progress panel for a mobile game. Output size 1024x256, aspect ratio 4:1, PNG with transparent background. Horizontal panel for three checklist objectives, keep center and left-center area readable for multiline text, leave clear footer area for progress summary. Style: futuristic auspicious UI, dual horse symbolism, twin orbit rings, gold and jade highlights, midnight blue cosmic lacquer texture, festive and funny rather than sacred, symmetrical but lively, premium 2D game asset, miniature diorama material richness, subtle cosmic motion feeling. Negative constraints: no text, no letters, no numbers, no watermark, no logo, no character figure, no dense decoration covering text zones.
```

### D. 101 分流结算卡背景
- 文件名：`ui/ending_choice_card.png`
- 尺寸：`1242x1660`
- 格式：`PNG`
- 用途：`Lv.101` 分流弹窗主卡面
- 完整 Prompt:

```text
Generate a vertical mobile game ending choice card background. Output size 1242x1660, aspect ratio about 3:4, PNG. Composition must reserve clean zones for top title, middle summary text, lower objective text, and two bottom buttons. Style: cosmic horse endgame ceremony, rich indigo velvet background with gold foil frame, subtle twin horse silhouette motif, celebratory chinese new year atmosphere, humorous luxurious fantasy, polished 2D game UI illustration, dramatic but readable, premium mobile game asset. Negative constraints: no text, no letters, no numbers, no watermark, no logo, no characters blocking content zones, no overly dark center.
```

### E. 终局群像立绘 (赛博科幻版样例)
- 文件名：`sprites/characters/great_harmony_final.png`
- 尺寸：`1536x1536`
- 格式：`PNG`
- 用途：替换当前复用 `cosmic_one` 的终局隐藏角色立绘，改为“终章群像大团圆封绘”
- 推荐代表阵容：
  - C位主核：`木马号 (white_base)`
  - 主视觉前排：`马一龙 (elon_mars)`、`机械战马 (mecha_horse)`、`斯雷普尼尔 (orange_mecha)`
  - 左右翼代表：`三驾马车 (tech_giants)`、`法拉利 (luxury_logo)`、`二马弟弟 (coder_feng)`
  - 梗感与现代组：`马赛克 (pixel_censor)`、`洛克人马 (rock_horse)`、`巨型加农马 (giant_ganon)`
- 完整 Prompt:

```text
Output: 1536x1536 PNG, square 1:1, pure white background.
pixel art sprite of a true-ending all-star ensemble featuring a white spaceship shaped like a trojan horse (White Base from Gundam), sci-fi mechanical details, red and blue accents, panel lines, a secret weapon of the Federation forces, a spaceship with horse legs; a caricature of Elon Musk in a white space suit, riding a retro-futuristic silver rocket (Starship) like a horse, a Doge dog floating nearby, Mars red planet background element, confident expression, Silicon Valley Iron Man, no longer riding a horse but a silver spaceship to Mars; a heavy cybernetic warhorse with glowing red eyes, metallic armor plates, and exhaust pipes, mechanical beast, full metal body, red sensor eyes, steam venting from joints, unstoppable steel charger; an orange multi-legged mecha robot (Sleipnir from Aldnoah Zero), holding a large sniper rifle, realistic sci-fi military style, not the mythical horse but an orange multi-legged mecha, amazing mobility and firepower; a futuristic chariot driven by three chibi tycoons: Jack Ma (Orange sweater), Pony Ma (Glasses and holding a penguin), Ma Mingzhe (Red tie), floating gold coins and stock charts, tech empire vibe, three tycoons named Ma driving a sci-fi chariot, controlling e-commerce, social media, and finance; a sleek red Ferrari sports car with a large "Prancing Horse" logo shield prominently displayed on the hood or side, metallic luxury car aesthetic, symbol of speed and wealth, red sports car combined with the iconic black horse emblem; a centaur programmer character, upper body is a young man in blue basketball jersey and headphones, typing on a floating mechanical keyboard, "Sang" (melancholic) expression, lower body is a horse made of green digital glitch code matrix, centaur who knows C++, tired but relieved eyes of code compiling; a horse shape made entirely of large, blocky mosaic pixel censorship, blurry effect, abstract and funny, composed entirely of giant pixel blocks, a divine beast born to protect privacy; a blue robot centaur (Mega Man style), arm cannon mounted on chest, wearing blue helmet with red gem, retro platformer shooter style, a robot horse equipped with an air cannon that absorbs enemy abilities; a massive bulky black horse with bright orange mane and tail (Ganondorf's Steed), gold Gerudo jewelry, villainous boss vibe, red-haired demon king and giant black horse, a moving fortress of calamity crushing everything, exact cast only, cyber sci-fi chinese new year true-ending settlement card, collector-grade crossover finale illustration, lavish and celebratory rather than combative, 木马号 as the biggest center anchor, square ending card composition with deluxe ornamental framing feel, aspect ratio 1:1, isometric view, 16-bit pixel art style, vibrant colors, clean outlines, pure white background, no text, no words, no watermark, no cast replacement, no redesign of named characters, no random unrelated characters
Composition: 木马号 in the absolute center and largest silhouette, front row core fighters leaning forward in a triumphant but settled pose, wing characters opening symmetrically to both sides, support cast stacked upward into a premium heroic pyramid, luminous crown area above the center, clean breathing room near the lower center for ending copy overlay, dense but readable, no muddy overlapping.
Style overlay: deluxe sci-fi ceremonial framing, neon circuitry, holographic star rails, cosmic UI arcs, aurora gradient halos, energy rings, glowing code particles, rainbow booster trails, lucky coins, chrome confetti sparks, mecha hangar bay background elements, premium mobile game ending card polish, playful but epic crossover celebration.
Identity lock: preserve the exact cast described above, preserve signature silhouettes, signature colors, rider-mount relationships, key props, and relative prominence.
```

---

### F. 图鉴终局解锁徽记
- 文件名：`ui/unlock_harmony_badge.png`
- 尺寸：`512x512`
- 格式：`PNG`，透明背景
- 用途：图鉴或结算页提示“达成大和谐”
- 完整 Prompt:

```text
Generate a round achievement badge icon for a mobile game true ending unlock. Output size 512x512, square 1:1, PNG with transparent background. Design a premium collectible medal with double horse motif, cosmic blessing seal, playful chinese festival medal styling, gold foil ring, jade core, subtle star trail, festive but not solemn, slightly humorous prestige. Must read clearly at small icon size. Negative constraints: no text, no letters, no numbers, no watermark, no logo, no background plate outside the badge silhouette.
```

## 3. Nano Banana 2 出图约束
- 单图主体居中，留出 UI 安全区，不要把关键元素贴边。
- 明确要求 `no text, no watermark`，避免生成不可控字样。
- UI 资源优先透明背景 PNG；角色立绘优先白底或纯底，方便后处理。
- 风格统一关键词固定保留：`miniature diorama`, `playful ceremonial`, `chinese new year`, `cosmic horse`, `premium mobile game asset`。
- 若一稿过于庄重，请增加：`funny`, `slightly absurd`, `parody energy`, `festive mascot`.
- 真结局角色必须强调“跨角色 IP 融合感”，不要只画成普通宇宙马；至少同时保留 `神话系`、`机械系`、`梗王系/暴富系` 三类视觉线索。
- 若走群像方案，优先采用“经典 crossover 封绘 / 大团圆摆拍”构图，而不是把所有特征揉成一个单体。
- 若存在多风格真结局版本，保持各版本主视觉 cast 互斥，避免 Nano Banana 2 因重复角色而把不同主题画成同一套阵容。
- 真结局既然在结算页直接收束，就不再额外交付 action sheet，资源重点集中在结局卡主视觉与解锁徽记的一致性。 

## 4. 当前前端落地路径与验收
- `frontend/src/scenes/Game.ts`
  - 已加入章节横幅、Boss briefing、常驻目标面板、101 分流文案与真结局标题升级。
- `frontend/src/managers/BossManager.ts`
  - 已在 Boss 出场时发出 `boss-spawned` 事件，驱动前端仪式感表现。
- `frontend/src/scenes/Gallery.ts`
  - 已隐藏未解锁终局角色，解锁后才在图鉴出现。
- `frontend/src/data/characters.json`
  - 已将终局隐藏角色重写为 `双马同谐`，并强化幽默双生设定。

## 5. 剩余只需资源替换的部分
- 将 `great_harmony` 从复用 `cosmic_one` 改为独立结局卡立绘。
- 若需要更强仪式感，可再追加章节专属音效和真结局专属背景图。

## 6. 四套真结局图命名与存放（已生成时）

将四张结局图放入：

```
frontend/public/assets/sprites/characters/
```

| 风格 | 文件名 | 对应 routeStyle |
|------|--------|-----------------|
| 赛博科幻 | `great_harmony_cyber_sci_fi.png` | cyberSciFi |
| 古风经典 | `great_harmony_ancient_classic.png` | ancientClassic |
| 动漫 Mania | `great_harmony_anime_mania.png` | animeMania |
| 神话传说 | `great_harmony_myth_legend.png` | mythLegend |

- 尺寸：1536x1536 PNG，白底。
- 图鉴默认展示赛博科幻版；结算页按本局判定的 `routeStyle` 显示对应版本。
