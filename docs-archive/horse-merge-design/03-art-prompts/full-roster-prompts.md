# 全角色美术资源生成指南 V3.3 (Master Art Asset Guide)

**版本**: 3.3 (Full Roster Complete)
**用途**: 该文档用于指导 AI (Nano Banana / Midjourney) 生成高质量的游戏美术资源。涵盖了从 Lv.1 到 Lv.101 的所有角色，以及道具、UI 和特效。

---

## 1. 全局风格规范 (Global Style Guide)

所有生成的图像必须严格遵守以下基础风格：

*   **视角 (View)**: `isometric view` (等轴侧视角/2.5D)
*   **风格 (Style)**: `16-bit pixel art` (16位像素风), `SNES style` (超任风格), `vibrant festive colors` (鲜艳的节日色彩)
*   **材质 (Texture)**: `clean bold outlines` (清晰的粗轮廓), `no anti-aliasing` (无抗锯齿/硬边), `high contrast` (高对比度)
*   **背景 (Background)**: `white background` (白底，方便抠图)

---

## 2. 动画帧生成方案 (Animation Strategy)

为了让角色“活”起来，每个角色我们需要生成 **3种状态** 的图像。请在生成时使用 `Vary (Subtle)` 或类似的微调功能，或者在 Prompt 中添加特定动作描述。

1.  **基础立绘 (Base Sprite)**: 角色的标准站姿。
2.  **待机帧 (Idle Frame)**: 基础立绘的微调版本。
    *   *Prompt 关键词*: `breathing animation frame`, `slight movement`, `hair floating`, `hoof tapping`.
    *   *用途*: 与基础立绘交替播放，形成 2 帧的呼吸动画。
3.  **动作/攻击帧 (Action/Attack Frame)**: 角色释放技能或攻击的瞬间。
    *   *Prompt 关键词*: `attacking pose`, `casting magic`, `rearing up`, `glowing weapon`, `dynamic motion`.
    *   *用途*: 战斗或消除时播放。

---

## 3. 角色提示词表 (Character Prompts)

### Tier 1: 起步阶段 (Lv.1 - Lv.20)
*日常生活与低魔世界的马*

#### Lv.1 竹马 (Bamboo Horse)
*   **原型**: 魔法竹马
*   **视觉**: 一根优雅的、仿佛有生命的魔法竹竿马，长着发光的翠绿色竹叶鬃毛，造型时尚酷炫。
*   **Base Prompt**: `pixel art sprite of an elegant, magical bamboo stalk animated like a rearing horse, glowing emerald green leaves acting as a mane, stylish and cool design, standing pose, isometric view, 16-bit style, white background`
*   **Idle Prompt**: `pixel art sprite of the magical bamboo horse, leaves fluttering gently, slight vertical floating movement, breathing frame, isometric view, white background`
*   **Action Prompt**: `pixel art sprite of the magical bamboo horse, showing a nature magic attack, unleashing a wave of sharp bamboo leaves, attacking pose, isometric view, white background`

#### Lv.2 波加曼 (Piplup Cosplay)
*   **原型**: 宝可梦 (Piplup) + 玩偶装
*   **视觉**: 蓝色的企鹅（波加曼）穿着一件棕色的马形连体睡衣/布偶装，兜帽上有马耳。
*   **Base Prompt**: `pixel art sprite of a cute blue penguin (Piplup style) wearing a brown horse kigurumi onesie costume, hood up with horse ears, waving hand, bright blue and brown colors, isometric view, 16-bit style, white background`
*   **Idle Prompt**: `pixel art sprite of a blue penguin in horse costume, adjusting the hood, blinking eyes, breathing frame, isometric view, white background`
*   **Action Prompt**: `pixel art sprite of a blue penguin in horse costume, tripping and falling forward (bubble beam effect), clumsy attack pose, isometric view, white background`

#### Lv.3 马扎 (Stool Horse)
*   **原型**: 中国传统折叠凳 (Maza)
*   **视觉**: 一个木制的X型折叠马扎，长着两条细细的人腿，坐在地上嗑瓜子。
*   **Base Prompt**: `pixel art sprite of a traditional wooden folding stool (Chinese Maza) with tiny human legs wearing sneakers, sitting and relaxing, funny object character, isometric view, 16-bit style, white background`
*   **Idle Prompt**: `pixel art sprite of a wooden folding stool with legs, tapping foot on ground, eating sunflower seeds, breathing frame, isometric view, white background`
*   **Action Prompt**: `pixel art sprite of a wooden folding stool, folding itself up aggressively to clamp shut, attacking pose, isometric view, white background`

#### Lv.4 小马宝莉 (Pinkie Pony)
*   **原型**: My Little Pony (Pinkie Pie)
*   **视觉**: 粉色的卡通小马，深粉色卷曲鬃毛，屁股上有气球标记，大眼睛。
*   **Base Prompt**: `pixel art sprite of a pink cartoon pony with curly magenta mane and tail (Pinkie Pie style), three balloons cutie mark on flank, large anime eyes, happy standing pose, isometric view, 16-bit style, white background`
*   **Idle Prompt**: `pixel art sprite of a pink cartoon pony, bouncing up and down, mane bouncing, happy vibration, breathing frame, isometric view, white background`
*   **Action Prompt**: `pixel art sprite of a pink cartoon pony, firing a party cannon from its back, confetti explosion effect, attacking pose, isometric view, white background`

#### Lv.5 秦俑马 (Terracotta)
*   **原型**: 西安兵马俑
*   **视觉**: 陶土质感的战马，表面有裂纹，颜色是灰土色，神态呆板。
*   **Base Prompt**: `pixel art sprite of a clay terracotta warrior horse statue, earthy brown and grey clay texture with cracks, ancient Chinese history style, stiff statue posture, isometric view, 16-bit style, white background`
*   **Idle Prompt**: `pixel art sprite of a terracotta horse, dust falling off body, head turning slightly with grinding stone sound visual, breathing frame, isometric view, white background`
*   **Action Prompt**: `pixel art sprite of a terracotta horse, stomping front hooves, ground cracking effect, earthquake attack, isometric view, white background`

#### Lv.6 马甲 (Vest Turtle)
*   **原型**: 小品梗“穿上马甲我就不认识你了？”
*   **视觉**: 一只绿色的乌龟，后腿站立，穿着一件鲜艳的红背心，试图伪装成马。
*   **Base Prompt**: `pixel art sprite of a green tortoise standing on hind legs, wearing a bright red vest (waistcoat), trying to look like a horse, funny disguise, isometric view, 16-bit style, white background`
*   **Idle Prompt**: `pixel art sprite of vest turtle, pulling vest tighter, looking around suspiciously, breathing frame, isometric view, white background`
*   **Action Prompt**: `pixel art sprite of vest turtle, retreating into shell leaving only the red vest visible, defensive pose, isometric view, white background`

#### Lv.7 木马号 (White Base)
*   **原型**: 高达 0079 (白色要塞)
*   **视觉**: 一艘白色的宇宙战舰，形状像长了腿的木马，有红黄蓝高达配色涂装。
*   **Base Prompt**: `pixel art sprite of a white spaceship shaped like a trojan horse (White Base from Gundam), sci-fi mechanical details, red and blue accents, panel lines, isometric view, 16-bit style, white background`
*   **Idle Prompt**: `pixel art sprite of a white spaceship horse, hovering engines glowing, radar dish spinning, breathing frame, isometric view, white background`
*   **Action Prompt**: `pixel art sprite of a white spaceship horse, firing main particle cannons from chest, beam effect, attacking pose, isometric view, white background`

#### Lv.8 果下马 (Mini Pony)
*   **原型**: 古代矮种马
*   **视觉**: 非常迷你的小马，腿很短，背上背着满满一筐红苹果。
*   **Base Prompt**: `pixel art sprite of a very tiny miniature pony with short legs, carrying a large wicker basket full of red apples on its back, cute and round, isometric view, 16-bit style, white background`
*   **Idle Prompt**: `pixel art sprite of mini pony, munching on an apple from the basket, tail wagging, breathing frame, isometric view, white background`
*   **Action Prompt**: `pixel art sprite of mini pony, bucking hind legs, spilling apples, attacking pose, isometric view, white background`

#### Lv.9 马路 (Road Monster)
*   **原型**: 词语“压马路”
*   **视觉**: 一段成精的沥青路面，长着眼睛和手脚，背上有白色车道线。
*   **Base Prompt**: `pixel art sprite of an anthropomorphic strip of asphalt road monster, white lane markings on back, cartoon eyes and legs, funny creature design, isometric view, 16-bit style, white background`
*   **Idle Prompt**: `pixel art sprite of road monster, cars driving over its back (tiny visual), shrugging shoulders, breathing frame, isometric view, white background`
*   **Action Prompt**: `pixel art sprite of road monster, flattening itself on the ground to trip enemies, trap pose, isometric view, white background`

#### Lv.10 马踏飞燕 (Bronze Runner)
*   **原型**: 东汉铜奔马
*   **视觉**: 青铜质感的马，一只蹄子踩在一只惊恐的燕子身上，马的表情扭曲搞怪（还原文物表情）。
*   **Base Prompt**: `pixel art sprite of a bronze horse statue balancing with one hoof on a flying swallow bird, oxidized green copper texture, exaggerated funny facial expression (tongue out), dynamic pose, isometric view, 16-bit style, white background`
*   **Idle Prompt**: `pixel art sprite of bronze horse, wobbling to keep balance on the bird, bird flapping wings desperately, breathing frame, isometric view, white background`
*   **Action Prompt**: `pixel art sprite of bronze horse, galloping in mid-air, green wind trail, attacking pose, isometric view, white background`

#### Lv.11 林克艾波娜 (Link & Epona)
*   **原型**: 塞尔达传说 (Link)
*   **视觉**: 穿着绿帽子绿衣的勇者，骑着棕色白鬃马（艾波娜），背着海利亚盾。
*   **Base Prompt**: `pixel art sprite of a fantasy hero in green tunic and pointy hat (Link style) riding a brown horse with white mane (Epona), Hylian shield on back, fantasy adventure style, isometric view, 16-bit style, white background`
*   **Idle Prompt**: `pixel art sprite of hero on brown horse, horse shaking head, hero adjusting hat, breathing frame, isometric view, white background`
*   **Action Prompt**: `pixel art sprite of hero on brown horse, horse rearing up, hero raising the Master Sword glowing blue, spin attack pose, isometric view, white background`

#### Lv.12 马大哈 (Clumsy Horse)
*   **原型**: 俗语
*   **视觉**: 一匹看起来乱糟糟的马，眼镜歪了，嘴里叼着钥匙，身后掉了一地东西（蹄铁、钱包）。
*   **Base Prompt**: `pixel art sprite of a messy brown horse wearing glasses askew, holding keys in mouth, dropping horseshoes and wallet behind, dizzy expression, clumsy vibe, isometric view, 16-bit style, white background`
*   **Idle Prompt**: `pixel art sprite of clumsy horse, searching pockets (if any) or looking around confused, scratching head, breathing frame, isometric view, white background`
*   **Action Prompt**: `pixel art sprite of clumsy horse, tripping over its own feet, items flying everywhere, accidental attack pose, isometric view, white background`

#### Lv.13 胡迪红心 (Woody & Bullseye)
*   **原型**: 玩具总动员
*   **视觉**: 棕色的布偶马（红心），骑手是戴黄帽子的牛仔警长玩偶，质感是布料和塑料。
*   **Base Prompt**: `pixel art sprite of a brown toy horse with ragdoll texture (Bullseye), ridden by a cowboy doll with yellow plaid shirt and cowboy hat (Woody), toy story vibe, bright colors, isometric view, 16-bit style, white background`
*   **Idle Prompt**: `pixel art sprite of toy horse and cowboy, swaying loosely like ragdolls, "Andy's coming" freeze pose twitch, breathing frame, isometric view, white background`
*   **Action Prompt**: `pixel art sprite of toy horse and cowboy, running fast like the wind, swinging a lasso rope, attacking pose, isometric view, white background`

#### Lv.14 露马脚 (Fake Dragon)
*   **原型**: 成语
*   **视觉**: 一个拙劣的绿色龙布偶装，下面露出了棕色的马蹄子，拉链没拉好。
*   **Base Prompt**: `pixel art sprite of a clumsily made green dragon costume with brown horse legs clearly visible underneath, zipper open showing horse fur, funny failed disguise, isometric view, 16-bit style, white background`
*   **Idle Prompt**: `pixel art sprite of fake dragon, adjusting the costume head, horse tail popping out, breathing frame, isometric view, white background`
*   **Action Prompt**: `pixel art sprite of fake dragon, costume head falling off revealing horse head, shocked expression, attacking pose, isometric view, white background`

#### Lv.15 马里奥耀西 (Plumber & Yoshi)
*   **原型**: 超级马里奥
*   **视觉**: 绿色的大鼻子恐龙（耀西），背着红帽子蓝背带裤的水管工。
*   **Base Prompt**: `pixel art sprite of a green dinosaur creature with a saddle (Yoshi), ridden by a red-capped plumber in blue overalls (Mario), sticking tongue out, video game parody style, isometric view, 16-bit style, white background`
*   **Idle Prompt**: `pixel art sprite of green dino and plumber, dino dancing in place, plumber bobbing head, breathing frame, isometric view, white background`
*   **Action Prompt**: `pixel art sprite of green dino, extending long red tongue to eat enemy, plumber jumping with fist up, attacking pose, isometric view, white background`

#### Lv.16 拍马屁 (Flattery Hand)
*   **原型**: 俗语
*   **视觉**: 只有马的后半身（屁股），和一只正在拍打它的卡通大手，伴随着“赞”的符号。
*   **Base Prompt**: `pixel art sprite of a horse's rear end (rump) with a disembodied white cartoon hand rhythmically patting it, "Like" thumbs up icons floating, visual pun, funny concept, isometric view, 16-bit style, white background`
*   **Idle Prompt**: `pixel art sprite of horse rump and hand, hand patting gently, horse tail swishing happily, breathing frame, isometric view, white background`
*   **Action Prompt**: `pixel art sprite of horse rump, kicking back powerfully while hand gives a thumbs up, attacking pose, isometric view, white background`

#### Lv.17 洛克人马 (Mega Man Centaur)
*   **原型**: 洛克人 (Centaur Man)
*   **视觉**: 蓝色的机器人马，胸口有巨大的手炮，戴着洛克人风格的头盔。
*   **Base Prompt**: `pixel art sprite of a blue robot centaur (Mega Man style), arm cannon mounted on chest, wearing blue helmet with red gem, retro platformer shooter style, isometric view, 16-bit style, white background`
*   **Idle Prompt**: `pixel art sprite of blue robot centaur, charging energy in buster, blinking lights, breathing frame, isometric view, white background`
*   **Action Prompt**: `pixel art sprite of blue robot centaur, firing a charged solar shot (blue energy ball), recoil pose, attacking pose, isometric view, white background`

#### Lv.18 白马非马 (Sophist White)
*   **原型**: 公孙龙诡辩
*   **视觉**: 一匹纯白色的马，身体部分由几何线条构成，周围漂浮着汉字“非马”和逻辑符号。
*   **Base Prompt**: `pixel art sprite of a pure white horse, body partially deconstructed into geometric wireframes, Chinese calligraphy text "非马" (Not Horse) floating, philosophical concept, isometric view, 16-bit style, white background`
*   **Idle Prompt**: `pixel art sprite of white horse, body flickering between solid and wireframe, text rotating, breathing frame, isometric view, white background`
*   **Action Prompt**: `pixel art sprite of white horse, dissolving into logic symbols and numbers, evasion pose, isometric view, white background`

#### Lv.19 马冬梅 (Auntie Ma)
*   **原型**: 夏洛特烦恼梗
*   **视觉**: 一个满脸疑惑的中国大妈，骑着一头看起来像驴的马，手里提着菜篮子，周围飘着问号。
*   **Base Prompt**: `pixel art sprite of an elderly Chinese woman with curly hair (Auntie style), riding a donkey-like horse, holding a vegetable basket, looking confused with question marks floating around, funny meme style, isometric view, 16-bit style, white background`
*   **Idle Prompt**: `pixel art sprite of confused auntie on horse, scratching head, looking left and right, breathing frame, isometric view, white background`
*   **Action Prompt**: `pixel art sprite of auntie on horse, throwing a basin of water (splash effect), shouting pose, attacking pose, isometric view, white background`

#### Lv.20 伯乐相马 (Bole Sage)
*   **原型**: 伯乐与千里马
*   **视觉**: 一个穿着古装的白胡子老头（伯乐），牵着一匹瘦骨嶙峋但眼神发光的马。
*   **Base Prompt**: `pixel art sprite of an ancient Chinese scholar old man with white beard (Bole) leading a skinny horse that has glowing wise eyes, traditional ink wash vibe, isometric view, 16-bit style, white background`
*   **Idle Prompt**: `pixel art sprite of Bole and horse, Bole stroking beard, horse glowing faintly, breathing frame, isometric view, white background`
*   **Action Prompt**: `pixel art sprite of Bole, pointing forward, horse transforming into a majestic silhouette for a second, awakening pose, isometric view, white background`

### Tier 2: 进阶阶段 (Lv.21 - Lv.40)
*历史名马与初级幻想生物*

#### Lv.21 独角兽 (Unicorn)
*   **原型**: 西方神话
*   **视觉**: 纯白的马，前额有一根金色的螺旋角，周围有彩虹光点。
*   **Base Prompt**: `pixel art sprite of a white unicorn with a glowing golden spiral horn, rainbow sparkles floating around it, magical and pure atmosphere, isometric view, 16-bit style, white background`
*   **Idle Prompt**: `pixel art sprite of unicorn, horn glowing gently, mane flowing in magical wind, breathing frame, isometric view, white background`
*   **Action Prompt**: `pixel art sprite of unicorn, horn emitting a bright healing light beam, rearing up pose, isometric view, white background`

#### Lv.22 乌孙天马 (Wusun Sky)
*   **原型**: 汉代历史
*   **视觉**: 体型强壮的棕色马，比普通马更高大，四蹄踏着云雾。
*   **Base Prompt**: `pixel art sprite of a sturdy muscular brown horse with golden hooves, standing proudly, white clouds swirling around its feet, legendary steed, isometric view, 16-bit style, white background`
*   **Idle Prompt**: `pixel art sprite of wusun horse, stomping hooves on clouds, snorting steam, breathing frame, isometric view, white background`
*   **Action Prompt**: `pixel art sprite of wusun horse, charging forward through the clouds, wind effect, attacking pose, isometric view, white background`

#### Lv.23 死马当活马 (Doctor Shock)
*   **原型**: 俗语
*   **视觉**: 一个穿着白大褂的马医生，手里拿着心脏除颤仪，正在电击一匹晕倒的马。
*   **Base Prompt**: `pixel art sprite of a horse doctor in a white coat holding a defibrillator over a fainting horse, comedic medical scene, isometric view, 16-bit style, white background`
*   **Idle Prompt**: `pixel art sprite of horse doctor, checking watch, charging defibrillator paddles (sparking), breathing frame, isometric view, white background`
*   **Action Prompt**: `pixel art sprite of horse doctor, shocking the patient with "CLEAR!" text, lightning effect, attacking pose, isometric view, white background`

#### Lv.24 大宛汗血 (Sweat Blood)
*   **原型**: 汗血宝马
*   **视觉**: 金色的马，皮肤上渗出红色的汗珠，背着波斯风格的华丽地毯。
*   **Base Prompt**: `pixel art sprite of a majestic Akhal-Teke horse with metallic golden coat, sweating red droplets like blood, wearing an exotic Persian saddle rug, isometric view, 16-bit style, white background`
*   **Idle Prompt**: `pixel art sprite of sweat blood horse, shaking head, red droplets flying off, coat shimmering, breathing frame, isometric view, white background`
*   **Action Prompt**: `pixel art sprite of sweat blood horse, sprinting with a red afterimage, coin shower effect, attacking pose, isometric view, white background`

#### Lv.25 悬崖勒马 (Brake Cliff)
*   **原型**: 成语
*   **视觉**: 一匹马在悬崖边（小块岩石底座）急刹车，前蹄腾空，后蹄磨出火星，表情惊恐。
*   **Base Prompt**: `pixel art sprite of a horse sliding to a halt at the edge of a cliff (cliff implied by small rock base), dust clouds, panicked expression, dynamic stopping pose, isometric view, 16-bit style, white background`
*   **Idle Prompt**: `pixel art sprite of brake horse, teetering on the edge, sweating drops, looking down nervously, breathing frame, isometric view, white background`
*   **Action Prompt**: `pixel art sprite of brake horse, pulling back hard, rocks falling off cliff, defensive pose, isometric view, white background`

#### Lv.26 烈焰马 (Fire Mane)
*   **原型**: 宝可梦 (Rapidash)
*   **视觉**: 奶油色的马，鬃毛和尾巴是熊熊燃烧的火焰。
*   **Base Prompt**: `pixel art sprite of a creamy white horse with mane and tail made of blazing orange and yellow fire (Rapidash style), dynamic flames, intense expression, anime style, isometric view, 16-bit style, white background`
*   **Idle Prompt**: `pixel art sprite of fire horse, flames flickering and pulsing, hoof pawing the ground, breathing frame, isometric view, white background`
*   **Action Prompt**: `pixel art sprite of fire horse, charging forward with a fire wheel tackle (Flare Blitz), attacking pose, isometric view, white background`

#### Lv.27 刘备的卢 (Dilu Leap)
*   **原型**: 三国演义
*   **视觉**: 白色的马，额头有泪滴状白斑，正在跃过一道水流（檀溪）。
*   **Base Prompt**: `pixel art sprite of a white horse with a teardrop mark on its forehead, leaping over a splash of water, rider in ancient Chinese armor (Liu Bei), heroic escape, isometric view, 16-bit style, white background`
*   **Idle Prompt**: `pixel art sprite of Dilu horse, water splashing around hooves, rider looking back, breathing frame, isometric view, white background`
*   **Action Prompt**: `pixel art sprite of Dilu horse, high jump over a gap, water trail effect, attacking pose, isometric view, white background`

#### Lv.28 半人马射手 (Centaur Arc)
*   **原型**: 希腊神话
*   **视觉**: 上半身是人，下半身是马，穿着绿色的森林游侠服，拉满弓箭。
*   **Base Prompt**: `pixel art sprite of a classic centaur (half human, half horse) holding a wooden bow and drawing an arrow, green forest tunic, mythological warrior, isometric view, 16-bit style, white background`
*   **Idle Prompt**: `pixel art sprite of centaur archer, testing bow string, looking for targets, tail swishing, breathing frame, isometric view, white background`
*   **Action Prompt**: `pixel art sprite of centaur archer, releasing a glowing green arrow, wind effect, attacking pose, isometric view, white background`

#### Lv.29 马头琴 (Fiddle Horse)
*   **原型**: 蒙古传说
*   **视觉**: 一匹棕色的马，用前蹄拉着一把巨大的马头琴，周围飘着音符。
*   **Base Prompt**: `pixel art sprite of a brown horse holding and playing a Matouqin (horse-head fiddle), musical notes floating around, traditional Mongolian atmosphere, isometric view, 16-bit style, white background`
*   **Idle Prompt**: `pixel art sprite of fiddle horse, playing a slow melody, eyes closed in enjoyment, breathing frame, isometric view, white background`
*   **Action Prompt**: `pixel art sprite of fiddle horse, playing a powerful chord, sound waves rippling out, attacking pose, isometric view, white background`

#### Lv.30 骷髅马 (Stalchild)
*   **原型**: 塞尔达传说 (Stalhorse)
*   **视觉**: 全身由白骨组成的马，眼窝里有红色的光。
*   **Base Prompt**: `pixel art sprite of a skeletal horse made of white bones (Stalhorse), glowing red eyes inside the skull, dark spooky aura, graveyard theme, isometric view, 16-bit style, white background`
*   **Idle Prompt**: `pixel art sprite of skeletal horse, ribs rattling, head twitching unnaturally, breathing frame, isometric view, white background`
*   **Action Prompt**: `pixel art sprite of skeletal horse, biting forward with bone jaws, dark energy effect, attacking pose, isometric view, white background`

#### Lv.31 曹操绝影 (Shadow Fast)
*   **原型**: 三国演义
*   **视觉**: 漆黑的马，身后拖着长长的黑色残影（速度线），身上插着一支箭但依然飞奔。
*   **Base Prompt**: `pixel art sprite of a pitch-black horse leaving a shadow trail (motion blur effect) behind it, arrow stuck in its shadow but not body, super fast speed, isometric view, 16-bit style, white background`
*   **Idle Prompt**: `pixel art sprite of shadow horse, vibrating with speed, shadow flickering, breathing frame, isometric view, white background`
*   **Action Prompt**: `pixel art sprite of shadow horse, dashing instantly (teleport effect), black smoke trail, attacking pose, isometric view, white background`

#### Lv.32 走马观花 (Tourist Cam)
*   **原型**: 成语梗
*   **视觉**: 一匹戴着遮阳帽、花衬衫的马，脖子上挂着相机，手里拿着一朵花。
*   **Base Prompt**: `pixel art sprite of a happy horse tourist wearing a sun hat and hawaiian floral shirt, holding a camera around neck and smelling a flower, relaxed vacation vibe, isometric view, 16-bit style, white background`
*   **Idle Prompt**: `pixel art sprite of tourist horse, taking a photo (flash effect), smelling the flower, breathing frame, isometric view, white background`
*   **Action Prompt**: `pixel art sprite of tourist horse, blinding flash from camera (stun effect), attacking pose, isometric view, white background`

#### Lv.33 彩虹云宝 (Rainbow Fly)
*   **原型**: 小马宝莉 (Rainbow Dash)
*   **视觉**: 蓝色的飞马，鬃毛和尾巴是彩虹色的，正在飞行。
*   **Base Prompt**: `pixel art sprite of a blue pegasus with rainbow-colored mane and tail (Rainbow Dash style), flying with wings spread, speed lines, sporty and cool, isometric view, 16-bit style, white background`
*   **Idle Prompt**: `pixel art sprite of rainbow pegasus, hovering in air, stretching wings, mane flowing, breathing frame, isometric view, white background`
*   **Action Prompt**: `pixel art sprite of rainbow pegasus, performing a Sonic Rainboom (rainbow explosion ring), attacking pose, isometric view, white background`

#### Lv.34 秦琼黄骠 (Sick Yellow)
*   **原型**: 隋唐演义
*   **视觉**: 一匹黄色的马，看起来瘦弱病恹恹的，但眼神锐利，骑手是拿着双锏的秦琼。
*   **Base Prompt**: `pixel art sprite of a sickly-looking yellow horse that has a hidden golden aura, rider is a general with double maces (Qin Qiong), underdog hero, isometric view, 16-bit style, white background`
*   **Idle Prompt**: `pixel art sprite of yellow horse, coughing slightly, then glowing gold for a second, breathing frame, isometric view, white background`
*   **Action Prompt**: `pixel art sprite of yellow horse, bursting with golden energy, rider striking with maces, attacking pose, isometric view, white background`

#### Lv.35 乔尼慢舞 (Slow Dancer)
*   **原型**: JOJO SBR (Johnny Joestar)
*   **视觉**: 白色的阿帕卢萨马（有斑点），骑手是穿着蓝色星星连帽衫的瘫痪少年（乔尼），眼神坚毅。
*   **Base Prompt**: `pixel art sprite of a white Appaloosa horse with spots (Slow Dancer), ridden by a jockey in blue star-patterned outfit and beanie (Johnny Joestar), western manga style, isometric view, 16-bit style, white background`
*   **Idle Prompt**: `pixel art sprite of Johnny on horse, pointing finger gun, spinning fingernail effect (golden rotation), breathing frame, isometric view, white background`
*   **Action Prompt**: `pixel art sprite of Johnny on horse, firing a fingernail bullet (Tusk Act 1), blue aura, attacking pose, isometric view, white background`

#### Lv.36 马后炮 (Cannon Back)
*   **原型**: 象棋梗
*   **视觉**: 一匹马背上驮着一个巨大的中国象棋棋子“炮”（或者一门黑色大炮），炮口朝后。
*   **Base Prompt**: `pixel art sprite of a horse carrying a large black Chinese Chess cannon piece on its back, cannon facing backwards, visual pun, isometric view, 16-bit style, white background`
*   **Idle Prompt**: `pixel art sprite of horse with cannon, cannon fuse sparking, horse looking back nervously, breathing frame, isometric view, white background`
*   **Action Prompt**: `pixel art sprite of horse with cannon, cannon firing a huge smoke ball backwards, recoil effect, attacking pose, isometric view, white background`

#### Lv.37 张飞王追 (Black Roar)
*   **原型**: 三国演义
*   **视觉**: 漆黑如墨的战马，骑手是黑脸大胡子的张飞，手持丈八蛇矛，正在咆哮。
*   **Base Prompt**: `pixel art sprite of a fierce black warhorse with smoke puffing from nostrils, rider is a dark-skinned general with a long spear (Zhang Fei), shouting expression, isometric view, 16-bit style, white background`
*   **Idle Prompt**: `pixel art sprite of Zhang Fei on horse, shouting (sound waves visual), horse stomping, breathing frame, isometric view, white background`
*   **Action Prompt**: `pixel art sprite of Zhang Fei on horse, thrusting spear forward, black tiger spirit aura, attacking pose, isometric view, white background`

#### Lv.38 黑马王子 (Dark Prince)
*   **原型**: 童话反套路
*   **视觉**: 一个穿着黑色燕尾服的帅气王子，骑着黑马，嘴里叼着玫瑰花。
*   **Base Prompt**: `pixel art sprite of a handsome prince in a black tuxedo riding a black horse, holding a red rose in mouth, sparkling bishounen effect, isometric view, 16-bit style, white background`
*   **Idle Prompt**: `pixel art sprite of dark prince, winking, tossing hair, rose petals falling, breathing frame, isometric view, white background`
*   **Action Prompt**: `pixel art sprite of dark prince, throwing the rose which turns into a heart projectile, charm attack, isometric view, white background`

#### Lv.39 害群之马 (Black Sheep)
*   **原型**: 成语
*   **视觉**: 一匹黑马混在一群小白马（作为背景或脚下装饰）中间，脸上带着坏笑，周围有苍蝇飞舞。
*   **Base Prompt**: `pixel art sprite of a mischievous black horse surrounded by buzzing flies, kicking other nearby tiny horses, troll face expression, isometric view, 16-bit style, white background`
*   **Idle Prompt**: `pixel art sprite of black sheep horse, laughing (troll face), flies circling head, breathing frame, isometric view, white background`
*   **Action Prompt**: `pixel art sprite of black sheep horse, kicking backwards randomly, chaos dust cloud, attacking pose, isometric view, white background`

#### Lv.40 牛马打工人 (Cow Horse)
*   **原型**: 网络梗“牛马”
*   **视觉**: 一个有着牛头马面的混合生物，穿着廉价的不合身西装，提着公文包，黑眼圈很重，一脸生无可恋。
*   **Base Prompt**: `pixel art sprite of a hybrid monster with an ox head and horse face, wearing a cheap ill-fitting business suit, carrying a briefcase, heavy bags under eyes, exhausted expression, "996" worker vibe, isometric view, 16-bit style, white background`
*   **Idle Prompt**: `pixel art sprite of ox-horse worker, checking watch anxiously, sighing (text bubble "Sigh"), breathing frame, isometric view, white background`
*   **Action Prompt**: `pixel art sprite of ox-horse worker, throwing a stack of paperwork into the air aggressively, "I quit" vibe, attacking pose, isometric view, white background`

### Tier 3: 高手阶段 (Lv.41 - Lv.60)
*英雄坐骑与强力合成兽*

#### Lv.41 穆王八骏 (Eight Kings)
*   **原型**: 周穆王传说
*   **视觉**: 一辆华丽的古代战车，由八匹颜色各异的小马（赤骥、盗骊等）拉着，车上坐着威严的周穆王。
*   **Base Prompt**: `pixel art sprite of an elaborate ancient Chinese chariot pulled by eight small, different-colored horses, royal procession, King Mu of Zhou riding, intricate details, isometric view, 16-bit style, white background`
*   **Idle Prompt**: `pixel art sprite of eight horses chariot, horses prancing in place out of sync, King waving hand, breathing frame, isometric view, white background`
*   **Action Prompt**: `pixel art sprite of eight horses chariot, charging forward, eight horses glowing with different colors, rainbow trail, attacking pose, isometric view, white background`

#### Lv.42 心猿意马 (Monkey Mind)
*   **原型**: 成语
*   **视觉**: 一只猴子骑在马上，猴子指着东边，马头扭向西边，猴子手里拿着金箍棒乱挥。
*   **Base Prompt**: `pixel art sprite of a chaotic scene of a monkey riding a horse, the monkey pulling reins left while the horse looks right, confusion and energy, isometric view, 16-bit style, white background`
*   **Idle Prompt**: `pixel art sprite of monkey on horse, monkey scratching head, horse trying to buck, breathing frame, isometric view, white background`
*   **Action Prompt**: `pixel art sprite of monkey on horse, monkey spinning staff, horse kicking, random elemental effects (fire/ice), attacking pose, isometric view, white background`

#### Lv.43 杰洛女武神 (Valkyrie Steel)
*   **原型**: JOJO SBR (Gyro Zeppeli)
*   **视觉**: 杰洛·齐贝林骑着他的马（Valkyrie），手里拿着绿色的铁球，金色长发飘逸。
*   **Base Prompt**: `pixel art sprite of a sturdy horse ridden by a man with long blonde hair and green steel balls (Gyro Zeppeli), western cowboy manga style, dynamic pose, isometric view, 16-bit style, white background`
*   **Idle Prompt**: `pixel art sprite of Gyro on horse, spinning a green steel ball on his finger, horse snorting, breathing frame, isometric view, white background`
*   **Action Prompt**: `pixel art sprite of Gyro on horse, throwing the steel ball, green spiral energy effect, attacking pose, isometric view, white background`

#### Lv.44 马超里飞沙 (Sand Storm)
*   **原型**: 三国演义
*   **视觉**: 锦马超骑着西凉战马，周围裹挟着黄沙和狂风，手持长枪，威风凛凛。
*   **Base Prompt**: `pixel art sprite of a white warhorse wearing beast-hide armor, surrounded by swirling sand and dust, rider holding a spear (Ma Chao), desert warrior vibe, isometric view, 16-bit style, white background`
*   **Idle Prompt**: `pixel art sprite of Ma Chao on horse, sand swirling around, cape flapping violently, breathing frame, isometric view, white background`
*   **Action Prompt**: `pixel art sprite of Ma Chao on horse, thrusting spear with a tornado of sand, attacking pose, isometric view, white background`

#### Lv.45 梦魇兽 (Nightmare)
*   **原型**: D&D / 欧美奇幻
*   **视觉**: 漆黑的战马，鬃毛和四蹄燃烧着绿色的邪能火焰，眼睛发红光。
*   **Base Prompt**: `pixel art sprite of a black demon horse with green fel fire burning on hooves and mane, glowing evil eyes, dark fantasy monster, isometric view, 16-bit style, white background`
*   **Idle Prompt**: `pixel art sprite of nightmare horse, green flames flickering, smoke rising from nostrils, breathing frame, isometric view, white background`
*   **Action Prompt**: `pixel art sprite of nightmare horse, phasing through a wall (translucent effect), green fire explosion, attacking pose, isometric view, white background`

#### Lv.46 巨型加农马 (Giant Ganon)
*   **原型**: 塞尔达传说 (Ganondorf's Horse)
*   **视觉**: 体型巨大的黑马，红色的鬃毛，带有格鲁德族的金色饰品，压迫感十足。
*   **Base Prompt**: `pixel art sprite of a massive bulky black horse with bright orange mane and tail (Ganondorf's Steed), gold Gerudo jewelry, villainous boss vibe, isometric view, 16-bit style, white background`
*   **Idle Prompt**: `pixel art sprite of giant black horse, snorting dark smoke, stomping heavily, breathing frame, isometric view, white background`
*   **Action Prompt**: `pixel art sprite of giant black horse, charging with a dark purple aura, trampling effect, attacking pose, isometric view, white background`

#### Lv.47 玄宗照夜白 (Ink White)
*   **原型**: 名画《照夜白图》
*   **视觉**: 一匹被拴在木桩上的白马，画风是水墨风格的像素画，浑身散发着柔和的白光。
*   **Base Prompt**: `pixel art sprite of a glowing white horse tethered to a wooden post, struggling to break free, rendered with traditional Chinese ink wash texture overlaid on pixel art, artistic masterpiece, isometric view, 16-bit style, white background`
*   **Idle Prompt**: `pixel art sprite of ink horse, struggling against the rope, ink droplets floating, glowing pulse, breathing frame, isometric view, white background`
*   **Action Prompt**: `pixel art sprite of ink horse, breaking the rope, ink splash effect turning into a white dragon shape, attacking pose, isometric view, white background`

#### Lv.48 单枪匹马 (Solo Lancer)
*   **原型**: 成语
*   **视觉**: 一个孤单的骑士，背影萧瑟，手持一杆长枪，夕阳（背景元素）拉长了他的影子。
*   **Base Prompt**: `pixel art sprite of a lone warrior on horseback silhouetted against a setting sun (in tile), holding a single long lance, cape blowing, heroic solitude, isometric view, 16-bit style, white background`
*   **Idle Prompt**: `pixel art sprite of solo lancer, wind blowing cape, lance tip gleaming, breathing frame, isometric view, white background`
*   **Action Prompt**: `pixel art sprite of solo lancer, charging alone, spotlight on him, critical strike effect, attacking pose, isometric view, white background`

#### Lv.49 灵幽马 (Ghost Rider)
*   **原型**: 宝可梦 (Spectrier)
*   **视觉**: 紫黑色的幽灵马，鬃毛遮住一只眼睛，身体半透明，飘浮在空中。
*   **Base Prompt**: `pixel art sprite of a translucent purple ghost horse floating in the air, mane covering one eye, spooky spiritual energy, isometric view, 16-bit style, white background`
*   **Idle Prompt**: `pixel art sprite of ghost horse, bobbing up and down, fading in and out slightly, breathing frame, isometric view, white background`
*   **Action Prompt**: `pixel art sprite of ghost horse, firing a Shadow Ball (dark purple energy sphere), attacking pose, isometric view, white background`

#### Lv.50 太宗飒露紫 (Arrow Chest)
*   **原型**: 昭陵六骏
*   **视觉**: 紫红色的战马，胸口插着一支箭，旁边有一个将军（丘行恭）正在为它拔箭。
*   **Base Prompt**: `pixel art sprite of a purple-red warhorse with an arrow stuck in its chest, a general removing the arrow, historical drama scene, emotional, isometric view, 16-bit style, white background`
*   **Idle Prompt**: `pixel art sprite of arrow horse, wincing in pain but standing firm, general patting its neck, breathing frame, isometric view, white background`
*   **Action Prompt**: `pixel art sprite of arrow horse, arrow removed, horse rearing up in defiance, red aura of determination, attacking pose, isometric view, white background`

#### Lv.51 罗辛南特 (Don Quixote)
*   **原型**: 堂吉诃德
*   **视觉**: 瘦骨嶙峋的老马，骑着穿着破烂盔甲的老骑士，手持断矛，冲向风车（背景）。
*   **Base Prompt**: `pixel art sprite of a skinny bony horse (Rocinante) ridden by an old knight in rusty armor holding a broken lance (Don Quixote), charging forward, tragicomic vibe, isometric view, 16-bit style, white background`
*   **Idle Prompt**: `pixel art sprite of skinny horse and knight, horse trembling legs, knight looking around confused, breathing frame, isometric view, white background`
*   **Action Prompt**: `pixel art sprite of knight and horse, charging valiantly but tripping over a stone, attacking pose, isometric view, white background`

#### Lv.52 马桶MT (Toilet Head)
*   **原型**: Skibidi Toilet
*   **视觉**: 一个白色的马桶，马桶里伸出一个鬼畜表情的马头，脖子很长。
*   **Base Prompt**: `pixel art sprite of a white ceramic toilet with a horse's head extending from the bowl on a long neck, wacky skibidi style meme, funny exaggerated expression, isometric view, 16-bit style, white background`
*   **Idle Prompt**: `pixel art sprite of toilet horse, head spinning 360 degrees, lid clapping, breathing frame, isometric view, white background`
*   **Action Prompt**: `pixel art sprite of toilet horse, shooting laser beams from eyes, chaotic energy, attacking pose, isometric view, white background`

#### Lv.53 半人马兽 (Android Cen)
*   **原型**: 数码宝贝 (Centarumon)
*   **视觉**: 半人半马的改造数码兽，上半身是人型戴着头盔，右臂是巨大的加农炮。
*   **Base Prompt**: `pixel art sprite of a cyborg centaur monster (Centarumon), upper body human with metallic helmet, right arm is a cannon, lower body horse, purple pipes, digimon style, isometric view, 16-bit style, white background`
*   **Idle Prompt**: `pixel art sprite of cyborg centaur, steam venting from pipes, cannon arm charging light, breathing frame, isometric view, white background`
*   **Action Prompt**: `pixel art sprite of cyborg centaur, firing a solar ray (Hunting Cannon) from arm, yellow beam, attacking pose, isometric view, white background`

#### Lv.54 曹操爪黄 (Gold Hoof)
*   **原型**: 爪黄飞电
*   **视觉**: 通体雪白的高头大马，四个蹄子是金黄色的，佩戴着皇家仪仗的红缨和金鞍。
*   **Base Prompt**: `pixel art sprite of a noble white horse with four distinct golden hooves, wearing a royal red sash with gold embroidery, majestic stance, isometric view, 16-bit style, white background`
*   **Idle Prompt**: `pixel art sprite of gold hoof horse, prancing elegantly in place, golden sparkles from hooves, breathing frame, isometric view, white background`
*   **Action Prompt**: `pixel art sprite of gold hoof horse, emitting a lightning shockwave from hooves, stunning effect, attacking pose, isometric view, white background`

#### Lv.55 特洛伊木马 (Trojan Wood)
*   **原型**: 荷马史诗
*   **视觉**: 巨大的木制马，带有轮子，侧面有一个暗门微微打开，露出里面士兵的眼睛。
*   **Base Prompt**: `pixel art sprite of a large wooden horse structure on wheels, a trap door on the side opening to reveal eyes peering out, ancient siege weapon, isometric view, 16-bit style, white background`
*   **Idle Prompt**: `pixel art sprite of trojan horse, trap door opening and closing, eyes blinking inside, wheels squeaking, breathing frame, isometric view, white background`
*   **Action Prompt**: `pixel art sprite of trojan horse, trap door bursting open, tiny soldiers jumping out, attacking pose, isometric view, white background`

#### Lv.56 雪暴马 (Ice Glacier)
*   **原型**: 宝可梦 (Glastrier)
*   **视觉**: 纯白色的马，脸上和四肢覆盖着坚硬的冰晶面具和护甲，呼出寒气。
*   **Base Prompt**: `pixel art sprite of a white horse partially made of ice crystals, frost breath vapor, snowy aura, cold blue color palette, isometric view, 16-bit style, white background`
*   **Idle Prompt**: `pixel art sprite of ice horse, ice crystals growing and shattering, cold mist rising, breathing frame, isometric view, white background`
*   **Action Prompt**: `pixel art sprite of ice horse, stomping ground creating ice spikes, blizzard effect, attacking pose, isometric view, white background`

#### Lv.57 招兵买马 (Recruiter HR)
*   **原型**: 成语
*   **视觉**: 一匹穿着西装打领带的马，一只手拿着扩音器，另一只手拿着一叠钞票。
*   **Base Prompt**: `pixel art sprite of a horse wearing a sharp suit and tie, holding a megaphone in one hoof and a stack of cash in the other, recruitment poster vibe, isometric view, 16-bit style, white background`
*   **Idle Prompt**: `pixel art sprite of recruiter horse, shouting into megaphone (sound waves), waving money, breathing frame, isometric view, white background`
*   **Action Prompt**: `pixel art sprite of recruiter horse, summoning a generic small horse minion from the ground, hiring effect, attacking pose, isometric view, white background`

#### Lv.58 赵云照夜玉 (Silver Lion)
*   **原型**: 照夜玉狮子
*   **视觉**: 银甲白袍的赵云，骑着一匹通体雪白、鬃毛像狮子一样蓬松的战马。
*   **Base Prompt**: `pixel art sprite of a silver-armored general (Zhao Yun) riding a white horse that has a fluffy, lion-like mane, holding a silver spear, heroic aura, isometric view, 16-bit style, white background`
*   **Idle Prompt**: `pixel art sprite of Zhao Yun on horse, spinning spear, horse shaking lion mane, breathing frame, isometric view, white background`
*   **Action Prompt**: `pixel art sprite of Zhao Yun on horse, rapid spear thrusts (Seven in Seven out), silver light streaks, attacking pose, isometric view, white background`

#### Lv.59 天马 (Pegasus Fly)
*   **原型**: 希腊神话
*   **视觉**: 洁白的马，背上长着巨大的羽毛翅膀，正在飞翔。
*   **Base Prompt**: `pixel art sprite of a pristine white horse with large, feathered angel wings spread wide, flying pose, greek mythology style, holy light, isometric view, 16-bit style, white background`
*   **Idle Prompt**: `pixel art sprite of pegasus, flapping wings slowly, hovering, feathers falling, breathing frame, isometric view, white background`
*   **Action Prompt**: `pixel art sprite of pegasus, diving down from sky, sonic boom ring, attacking pose, isometric view, white background`

#### Lv.60 迪亚哥银色 (Dino Racer)
*   **原型**: JOJO SBR (Diego Brando)
*   **视觉**: 银色的赛马，骑手（迪亚哥）的脸部正在变成恐龙（长出鳞片和尖牙），身上有“DIO”字样。
*   **Base Prompt**: `pixel art sprite of a silver racehorse ridden by a jockey who is partially transforming into a blue dinosaur (Diego Brando), dynamic racing speed lines, manga style, isometric view, 16-bit style, white background`
*   **Idle Prompt**: `pixel art sprite of Diego on horse, tail growing from rider, horse looking nervous, breathing frame, isometric view, white background`
*   **Action Prompt**: `pixel art sprite of Diego on horse, rider fully transforming into a raptor and biting, savage attack, isometric view, white background`

### Tier 4: 大师阶段 (Lv.61 - Lv.80)
*史诗级生物与网络神梗*

#### Lv.61 老马识途 (Old Guide)
*   **原型**: 成语
*   **视觉**: 一匹戴着老花镜、背着行囊的老马，手里拿着一张破旧的地图，眼神充满智慧。
*   **Base Prompt**: `pixel art sprite of an old wise horse wearing reading glasses and a backpack, holding a tattered map, looking at the horizon, experienced traveler vibe, isometric view, 16-bit style, white background`
*   **Idle Prompt**: `pixel art sprite of old guide horse, adjusting glasses, pointing at the map with a hoof, nodding wisely, breathing frame, isometric view, white background`
*   **Action Prompt**: `pixel art sprite of old guide horse, map glowing and showing a path of light, revealing hidden items, attacking pose, isometric view, white background`

#### Lv.62 独角马兽 (Holy Angemon)
*   **原型**: 数码宝贝 (Unimon)
*   **视觉**: 长着巨大羽翼的独角兽，戴着红色的面具，前蹄也是红色的。
*   **Base Prompt**: `pixel art sprite of a winged unicorn digimon (Unimon), white body with large feathered wings, wearing a red helmet/mask over eyes, holy aura, isometric view, 16-bit style, white background`
*   **Idle Prompt**: `pixel art sprite of unimon, flapping wings gently, red mask glowing, breathing frame, isometric view, white background`
*   **Action Prompt**: `pixel art sprite of unimon, firing a Holy Shot (energy ball) from mouth, attacking pose, isometric view, white background`

#### Lv.63 汗血宝马 (Golden Steed)
*   **原型**: 历史名马
*   **视觉**: 浑身金光闪闪的马，皮肤极薄，血管清晰可见，流出的汗水是红色的血珠。
*   **Base Prompt**: `pixel art sprite of a magnificent golden horse, skin so thin veins are visible, sweating red blood droplets, divine aura, isometric view, 16-bit style, white background`
*   **Idle Prompt**: `pixel art sprite of golden steed, pawing the ground, blood-sweat dripping and evaporating into red mist, breathing frame, isometric view, white background`
*   **Action Prompt**: `pixel art sprite of golden steed, sprinting at light speed, leaving a trail of gold and blood, attacking pose, isometric view, white background`

#### Lv.64 白马王族 (Royal White)
*   **原型**: 塞尔达传说 (Royal White Stallion)
*   **视觉**: 体型优雅的白马，佩戴着塞尔达王室专属的金色马具和紫色缰绳，鬃毛编织得很精致。
*   **Base Prompt**: `pixel art sprite of an elegant white horse wearing royal gold armor and purple bridle (Zelda Royal Stallion), braided mane, noble posture, isometric view, 16-bit style, white background`
*   **Idle Prompt**: `pixel art sprite of royal white horse, tossing head elegantly, gold armor glinting, breathing frame, isometric view, white background`
*   **Action Prompt**: `pixel art sprite of royal white horse, rearing up with a triforce symbol glowing on forehead, attacking pose, isometric view, white background`

#### Lv.65 塞翁失马 (Lost Found)
*   **原型**: 成语
*   **视觉**: 一个古代老翁站在栅栏边，望着远方一个虚线的马的轮廓（表示失去），身边围着一群新来的马。
*   **Base Prompt**: `pixel art sprite of an old Chinese man (Sai Weng) leaning on a fence, looking at a dotted-line silhouette of a missing horse, while surrounded by three new horses, philosophical vibe, isometric view, 16-bit style, white background`
*   **Idle Prompt**: `pixel art sprite of Sai Weng, stroking beard, new horses nuzzling him, breathing frame, isometric view, white background`
*   **Action Prompt**: `pixel art sprite of Sai Weng, shrugging shoulders, a "Blessing in Disguise" text effect appearing, healing aura, isometric view, white background`

#### Lv.66 骷髅骑士 (Skull King)
*   **原型**: 剑风传奇 (Berserk)
*   **视觉**: 穿着骷髅造型全身铠甲的骑士，骑着骷髅战马，手持唤水剑，披风破烂。
*   **Base Prompt**: `pixel art sprite of a terrifying skeletal knight in bone armor riding a skeletal warhorse (Skull Knight from Berserk), holding a thorned sword (Sword of Actuation), flowing tattered cape, dark fantasy style, isometric view, 16-bit style, white background`
*   **Idle Prompt**: `pixel art sprite of skull knight, cape blowing in wind, sword glowing with ominous dimensional aura, breathing frame, isometric view, white background`
*   **Action Prompt**: `pixel art sprite of skull knight, slashing open a dimension rift in space, void effect, attacking pose, isometric view, white background`

#### Lv.67 岳飞白龙 (Patriot Yue)
*   **原型**: 岳飞坐骑
*   **视觉**: 一匹白马，背上（或马鞍上）刺着“精忠报国”四个大字，眼神极其坚毅。
*   **Base Prompt**: `pixel art sprite of a white warhorse with the Chinese characters "精忠报国" (Serve the Country with Loyalty) tattooed on its flank, wearing Song Dynasty military gear, patriotic aura, isometric view, 16-bit style, white background`
*   **Idle Prompt**: `pixel art sprite of patriot horse, standing at attention, flag waving in background, breathing frame, isometric view, white background`
*   **Action Prompt**: `pixel art sprite of patriot horse, charging with a red tasseled spear projection, shouting war cry, attacking pose, isometric view, white background`

#### Lv.68 二马弟弟 (Coder Feng)
*   **原型**: 现实朋友梗 (Horse成双)
*   **视觉**: 一个半人马程序员。上半身是穿蓝色篮球衣、戴耳机的丧系青年，在敲浮空的机械键盘；下半身是像《黑客帝国》代码流一样的数字马身。
*   **Base Prompt**: `pixel art sprite of a centaur programmer character, upper body is a young man in blue basketball jersey and headphones, typing on a floating mechanical keyboard, "Sang" (melancholic) expression, lower body is a horse made of green digital glitch code matrix, isometric view, 16-bit style, white background`
*   **Idle Prompt**: `pixel art sprite of coder centaur, sipping coffee, typing fast, lower body glitching/flickering, breathing frame, isometric view, white background`
*   **Action Prompt**: `pixel art sprite of coder centaur, smashing the keyboard ("Enter" key), unleashing a "C++ Error" beam, attacking pose, isometric view, white background`

#### Lv.69 布赛法拉斯 (Alexander Mt)
*   **原型**: 亚历山大大帝
*   **视觉**: 一匹巨大的黑马，前额有一个明显的白色牛头形状斑记，威武霸气。
*   **Base Prompt**: `pixel art sprite of a massive black warhorse with a distinct white bull-head shaped mark on its forehead (Bucephalus), wearing ancient Greek royal armor, conquering stance, isometric view, 16-bit style, white background`
*   **Idle Prompt**: `pixel art sprite of bucephalus, snorting, pawing ground aggressively, breathing frame, isometric view, white background`
*   **Action Prompt**: `pixel art sprite of bucephalus, rearing up and casting a giant shadow over enemies, fear effect, attacking pose, isometric view, white background`

#### Lv.70 指鹿为马 (Deer Sign)
*   **原型**: 历史典故/梗
*   **视觉**: 一只无辜的梅花鹿，脖子上挂着一个木牌，上面歪歪扭扭写着“我是马”。
*   **Base Prompt**: `pixel art sprite of a cute brown spotted deer looking confused, wearing a wooden sign board around its neck that says "我是马" (I am a Horse), funny political satire meme, isometric view, 16-bit style, white background`
*   **Idle Prompt**: `pixel art sprite of deer with sign, blinking innocence, sign swinging, breathing frame, isometric view, white background`
*   **Action Prompt**: `pixel art sprite of deer, transforming into a glitchy horse silhouette for a second, confusion attack, isometric view, white background`

#### Lv.71 斯雷普尼尔 (Orange Mecha)
*   **原型**: 骑士&魔法 / Aldnoah Zero (Sleipnir)
*   **视觉**: 一台橙色的多足机甲（Kataphrakt），虽然是机器人但有马的姿态，手持大口径步枪。
*   **Base Prompt**: `pixel art sprite of an orange multi-legged mecha robot (Sleipnir from Aldnoah Zero), holding a large sniper rifle, realistic sci-fi military style, isometric view, 16-bit style, white background`
*   **Idle Prompt**: `pixel art sprite of orange mecha, hydraulic legs adjusting, sensor eye glowing, breathing frame, isometric view, white background`
*   **Action Prompt**: `pixel art sprite of orange mecha, deploying stabilizers and firing the rifle, muzzle flash, attacking pose, isometric view, white background`

#### Lv.72 昭陵六骏 (Stone Six)
*   **原型**: 唐代石刻
*   **视觉**: 六匹石刻风格的马重叠在一起，或者是一个石碑上浮雕出六匹马奔跑的姿态，带有石头质感。
*   **Base Prompt**: `pixel art sprite of a stone relief carving coming to life, depicting six different warhorses (Zhaoling Six Steeds) galloping together, grey stone texture with magical cracks, isometric view, 16-bit style, white background`
*   **Idle Prompt**: `pixel art sprite of stone six, stone fragments floating, horses shifting positions in the relief, breathing frame, isometric view, white background`
*   **Action Prompt**: `pixel art sprite of stone six, the stone horses charging out of the relief as spectral forms, stampede attack, isometric view, white background`

#### Lv.73 马马虎虎 (Tiger Patch)
*   **原型**: 成语
*   **视觉**: 一个缝合怪布偶，身体是马，头是老虎，四肢也是虎爪，身上有明显的缝合线和补丁。
*   **Base Prompt**: `pixel art sprite of a patchwork plush doll monster, horse body with a tiger head and paws, visible stitches and patches, cute but weird, isometric view, 16-bit style, white background`
*   **Idle Prompt**: `pixel art sprite of tiger patch, head tilting like a confused dog, tail wagging, breathing frame, isometric view, white background`
*   **Action Prompt**: `pixel art sprite of tiger patch, roaring (text "Roar!"), claws swiping, attacking pose, isometric view, white background`

#### Lv.74 天马兽 (Hope Armor)
*   **原型**: 数码宝贝 (Pegasusmon)
*   **视觉**: 金色的装甲进化体，身体覆盖着金色的金属装甲，翅膀也是金色的，神圣感。
*   **Base Prompt**: `pixel art sprite of a golden armored winged horse digimon (Pegasusmon), holy rings on legs, metallic gold texture, divine light, isometric view, 16-bit style, white background`
*   **Idle Prompt**: `pixel art sprite of pegasusmon, wings flapping, holy rings spinning, breathing frame, isometric view, white background`
*   **Action Prompt**: `pixel art sprite of pegasusmon, shooting a beam of green light from forehead (Silver Blaze), attacking pose, isometric view, white background`

#### Lv.75 克桑托斯 (Prophet X)
*   **原型**: 希腊神话
*   **视觉**: 一匹看起来很普通的马，但嘴巴在动（像在说话），头上有一个“禁言”的图标或者封条。
*   **Base Prompt**: `pixel art sprite of a brown greek horse with a human-like mouth speaking, a magical "Mute" symbol or seal floating over its mouth, prophecy theme, isometric view, 16-bit style, white background`
*   **Idle Prompt**: `pixel art sprite of prophet horse, trying to speak but muted, stomping frustration, breathing frame, isometric view, white background`
*   **Action Prompt**: `pixel art sprite of prophet horse, seal breaking, shouting a prophecy text bubble, shockwave effect, attacking pose, isometric view, white background`

#### Lv.76 项羽乌骓 (King Suicide)
*   **原型**: 霸王别姬
*   **视觉**: 乌黑的战马，脖子上挂着霸王的披风（或者是霸王的灵位），眼中含泪，悲壮感。
*   **Base Prompt**: `pixel art sprite of a black warhorse standing by a river, carrying a red cape and a sword (referencing Xiang Yu), tears in eyes, tragic hero atmosphere, isometric view, 16-bit style, white background`
*   **Idle Prompt**: `pixel art sprite of wuzhui horse, looking at the river, neighing sorrowfully, breathing frame, isometric view, white background`
*   **Action Prompt**: `pixel art sprite of wuzhui horse, jumping into the river (suicide charge), massive splash explosion, attacking pose, isometric view, white background`

#### Lv.77 锡蒙利高达 (Gundam Kim)
*   **原型**: 高达铁血的奥尔芬斯 (Kimaris Trooper)
*   **视觉**: 紫色的半人马形态高达，手持巨大的骑士长枪，厚重的装甲，头部有独特的角。
*   **Base Prompt**: `pixel art sprite of a purple and white centaur robot (Gundam Kimaris Trooper), holding a massive lance, heavy armor plates, hovering mode legs, sci-fi anime aesthetic, isometric view, 16-bit style, white background`
*   **Idle Prompt**: `pixel art sprite of centaur gundam, thrusters flaring, lance tip rotating, breathing frame, isometric view, white background`
*   **Action Prompt**: `pixel art sprite of centaur gundam, charging with lance (Gungnir), purple energy trail, attacking pose, isometric view, white background`

#### Lv.78 马赛克 (Pixel Censor)
*   **原型**: 审查梗
*   **视觉**: 一匹完全由巨大的、模糊的马赛克方块组成的马，看不清细节，身上有“CENSORED”字样。
*   **Base Prompt**: `pixel art sprite of a horse shape made entirely of large, blocky mosaic pixel censorship, blurry effect, abstract and funny, isometric view, 16-bit style, white background`
*   **Idle Prompt**: `pixel art sprite of mosaic horse, pixels shifting and changing color randomly, glitch effect, breathing frame, isometric view, white background`
*   **Action Prompt**: `pixel art sprite of mosaic horse, expanding to cover the screen partially, censorship bar "CENSORED" appearing, attacking pose, isometric view, white background`

#### Lv.79 捷影 (Shadowfax)
*   **原型**: 指环王
*   **视觉**: 银白色的马，没有马鞍和缰绳，自由奔跑，光芒四射。
*   **Base Prompt**: `pixel art sprite of a magnificent silvery-white horse running without saddle or bridle (Shadowfax), glowing with an inner light, lord of all horses, isometric view, 16-bit style, white background`
*   **Idle Prompt**: `pixel art sprite of shadowfax, mane flowing as if in high wind, light pulsing, breathing frame, isometric view, white background`
*   **Action Prompt**: `pixel art sprite of shadowfax, galloping at impossible speed, leaving a trail of starlight, attacking pose, isometric view, white background`

#### Lv.80 风云再起 (Mobile Horse)
*   **原型**: 机动武斗传G高达
*   **视觉**: 一匹穿着高达装甲的白马，额头有独角兽天线，站在机械底座上。
*   **Base Prompt**: `pixel art sprite of a white horse wearing white mobile suit armor (Fuunsaiki from G Gundam), unicorn horn antenna, standing on a mechanical pedestal, super robot style, isometric view, 16-bit style, white background`
*   **Idle Prompt**: `pixel art sprite of mecha horse, mane glowing gold (Hyper Mode), steam venting from armor, breathing frame, isometric view, white background`
*   **Action Prompt**: `pixel art sprite of mecha horse, rearing up and kicking with energy hooves, attacking pose, isometric view, white background`

### Tier 5: 巅峰阶段 (Lv.81 - Lv.101)
*神明、概念体与终极形态*

#### Lv.81 取经天团 (West Team)
*   **原型**: 西游记
*   **视觉**: 白龙马背上坐着唐僧，旁边有孙悟空、猪八戒、沙僧的Q版小人跟随或虚影。
*   **Base Prompt**: `pixel art sprite of a white dragon horse carrying a monk (Tang Sanzang), with tiny silhouette of Monkey King and Pigsy floating nearby, holy buddhist aura, isometric view, 16-bit style, white background`
*   **Idle Prompt**: `pixel art sprite of west team, monk chanting sutras (gold text floating), monkey jumping around, breathing frame, isometric view, white background`
*   **Action Prompt**: `pixel art sprite of west team, Monkey King shadow striking with golden staff, holy light explosion, attacking pose, isometric view, white background`

#### Lv.82 神笔马良 (Magic Paint)
*   **原型**: 神笔马良
*   **视觉**: 一个古代少年（马良），手里拿着一支巨大的发光毛笔，身边是一匹刚刚从纸上画出来、半实体半水墨的马。
*   **Base Prompt**: `pixel art sprite of a young Chinese boy (Ma Liang) holding a giant glowing calligraphy brush, standing next to a horse that is half-ink-wash painting and half-real, magical creation, isometric view, 16-bit style, white background`
*   **Idle Prompt**: `pixel art sprite of magic paint, boy drawing in the air, ink horse flickering, breathing frame, isometric view, white background`
*   **Action Prompt**: `pixel art sprite of magic paint, boy swiping brush, ink splash creating a gold ingot or weapon, attacking pose, isometric view, white background`

#### Lv.83 巴利俄斯 (Immortal Bal)
*   **原型**: 希腊神话
*   **视觉**: 一匹神骏的马，浑身散发着金色的不朽光辉，眼神深邃仿佛看透了生死。
*   **Base Prompt**: `pixel art sprite of an immortal divine horse (Balius) glowing with eternal golden light, ancient Greek armor pieces, eyes full of wisdom, isometric view, 16-bit style, white background`
*   **Idle Prompt**: `pixel art sprite of immortal bal, light pulsing rhythmically, time distortion effect around hooves, breathing frame, isometric view, white background`
*   **Action Prompt**: `pixel art sprite of immortal bal, reviving from a spectral form to solid form, healing aura, attacking pose, isometric view, white background`

#### Lv.84 星矢天马 (Cosmos Burn)
*   **原型**: 圣斗士星矢
*   **视觉**: 穿着红衣白甲（天马座圣衣）的少年，摆出流星拳的起手式，背后有天马星图。
*   **Base Prompt**: `pixel art sprite of an anime youth wearing red bodysuit and silver/white Pegasus Bronze Cloth armor (Seiya), glowing blue cosmos energy aura, 90s anime style, isometric view, 16-bit style, white background`
*   **Idle Prompt**: `pixel art sprite of Seiya, cosmos energy burning around him, hair flowing up, breathing frame, isometric view, white background`
*   **Action Prompt**: `pixel art sprite of Seiya, punching multiple times rapidly (Pegasus Meteor Fist), blue light streaks, attacking pose, isometric view, white background`

#### Lv.85 一马当先 (First Place)
*   **原型**: 成语
*   **视觉**: 一匹戴着“第一名”红绶带和金牌的赛马，冲破终点线的瞬间，彩带飞舞。
*   **Base Prompt**: `pixel art sprite of a racehorse breaking through a finish line tape, wearing a gold medal and a red sash saying "No.1", confetti falling, victory pose, isometric view, 16-bit style, white background`
*   **Idle Prompt**: `pixel art sprite of first place horse, posing for photos, medal shining, breathing frame, isometric view, white background`
*   **Action Prompt**: `pixel art sprite of first place horse, sprinting with a sonic boom, leaving opponents in dust, attacking pose, isometric view, white background`

#### Lv.86 关羽赤兔 (God of War)
*   **原型**: 三国演义
*   **视觉**: 红脸长须的关羽，身穿绿袍金甲，骑着火红的赤兔马，手持青龙偃月刀，威风凛凛。
*   **Base Prompt**: `pixel art sprite of the God of War Guan Yu (red face, long beard, green robe) riding the muscular Red Hare horse, holding the Green Dragon Crescent Blade, flames of war aura, majestic chinese warrior, isometric view, 16-bit style, white background`
*   **Idle Prompt**: `pixel art sprite of Guan Yu on Red Hare, stroking his beard, horse pawing ground, weapon gleaming, breathing frame, isometric view, white background`
*   **Action Prompt**: `pixel art sprite of Guan Yu, swinging the massive blade downward, green dragon spirit effect, attacking pose, isometric view, white background`

#### Lv.87 法拉利 (Luxury Logo)
*   **原型**: 知名跑车Logo
*   **视觉**: 一匹站立的黑色骏马（Prancing Horse），背景是黄色的盾牌，带有金属光泽和奢华感。
*   **Base Prompt**: `pixel art sprite of a glossy black horse rearing up on hind legs (Prancing Horse logo style), set against a yellow shield background, metallic luxury car emblem aesthetic, isometric view, 16-bit style, white background`
*   **Idle Prompt**: `pixel art sprite of luxury logo, shield rotating slowly, metallic sheen reflecting light, breathing frame, isometric view, white background`
*   **Action Prompt**: `pixel art sprite of luxury logo, transforming into a red sports car silhouette and speeding off, attacking pose, isometric view, white background`

#### Lv.88 拉奥黑王 (Raoh King)
*   **原型**: 北斗神拳
*   **视觉**: 极其巨大的黑马（黑王号），骑着身材魁梧的霸主（拉奥），头戴角盔，单手指天。
*   **Base Prompt**: `pixel art sprite of a gigantic black horse (Kokuoh-go), twice the size of normal horses, ridden by a conqueror in a horned helmet and cape (Raoh), raising a fist to the sky, intimidating power, Hokuto no Ken style, isometric view, 16-bit style, white background`
*   **Idle Prompt**: `pixel art sprite of Raoh on black horse, cape fluttering violently, red aura of fighting spirit, breathing frame, isometric view, white background`
*   **Action Prompt**: `pixel art sprite of Raoh, punching forward with a beam of energy (Tensho Honretsu), attacking pose, isometric view, white background`

#### Lv.89 走马灯 (Lantern Life)
*   **原型**: 传统工艺品/濒死体验
*   **视觉**: 一个旋转的传统纸灯笼，灯笼面上画着马奔跑的剪影，发出幽幽的光。
*   **Base Prompt**: `pixel art sprite of a traditional spinning paper lantern (Zoumadeng) with silhouettes of galloping horses projected on its panels, glowing from within, mystical artifact, isometric view, 16-bit style, white background`
*   **Idle Prompt**: `pixel art sprite of lantern, spinning slowly, horse silhouettes animating on the surface, breathing frame, isometric view, white background`
*   **Action Prompt**: `pixel art sprite of lantern, spinning rapidly, rewinding time visual effect (clock hands spinning back), attacking pose, isometric view, white background`

#### Lv.90 赫利俄斯 (Sun Chariot)
*   **原型**: 希腊神话
*   **视觉**: 太阳神驾驶着由四匹火焰马拉着的黄金战车，发出耀眼的光芒。
*   **Base Prompt**: `pixel art sprite of the Sun Chariot (Helios) pulled by four horses made of pure fire and light, golden chariot wheels, blindingly bright, isometric view, 16-bit style, white background`
*   **Idle Prompt**: `pixel art sprite of sun chariot, flames raging, sun disc glowing behind, breathing frame, isometric view, white background`
*   **Action Prompt**: `pixel art sprite of sun chariot, unleashing a solar flare explosion, attacking pose, isometric view, white background`

#### Lv.91 麒麟 (Qilin Myth)
*   **原型**: 中国神话
*   **视觉**: 龙头、鹿角、狮眼、虎背、熊腰、蛇鳞、马蹄、牛尾的瑞兽，脚踏祥云，浑身五彩。
*   **Base Prompt**: `pixel art sprite of a mythical Chinese Qilin (Kirin), dragon head, deer antlers, horse hooves, covered in colorful scales and holy fire, standing on auspicious clouds, isometric view, 16-bit style, white background`
*   **Idle Prompt**: `pixel art sprite of qilin, breathing holy fire gently, clouds drifting, scales shimmering, breathing frame, isometric view, white background`
*   **Action Prompt**: `pixel art sprite of qilin, roaring with a rainbow aura, blessing effect, attacking pose, isometric view, white background`

#### Lv.92 赛马娘 (Derby Girl)
*   **原型**: 赛马娘 (Special Week)
*   **视觉**: 穿着日本赛马服（紫白配色）的少女，有马耳和马尾，正在奔跑姿态。
*   **Base Prompt**: `pixel art sprite of an anime horse girl (Uma Musume style) with horse ears and tail, wearing a purple and white racing uniform (Special Week), running pose, energetic and cute, isometric view, 16-bit style, white background`
*   **Idle Prompt**: `pixel art sprite of derby girl, stretching legs, ears twitching, tail wagging, breathing frame, isometric view, white background`
*   **Action Prompt**: `pixel art sprite of derby girl, sprinting with "zone" eyes (glowing trails), overtaking effect, attacking pose, isometric view, white background`

#### Lv.93 三驾马车 (Tech Giants)
*   **原型**: 互联网三马
*   **视觉**: 一辆科幻战车，上面坐着三个Q版大佬：一个穿橙色毛衣（Jack），一个穿西装抱企鹅（Pony），一个穿红领带（Ming）。
*   **Base Prompt**: `pixel art sprite of a futuristic chariot driven by three chibi tycoons: Jack Ma (Orange sweater), Pony Ma (Glasses and holding a penguin), Ma Mingzhe (Red tie), floating gold coins and stock charts, tech empire vibe, isometric view, 16-bit style, white background`
*   **Idle Prompt**: `pixel art sprite of three tycoons, checking phones, coins raining down, stock line going up, breathing frame, isometric view, white background`
*   **Action Prompt**: `pixel art sprite of three tycoons, unleashing a wave of digital currency and server racks, money storm attack, isometric view, white background`

#### Lv.94 旋转木马 (Merry Go)
*   **原型**: 游乐园
*   **视觉**: 一个华丽的旋转木马设施，彩灯闪烁，音乐符号飘浮，充满童话色彩。
*   **Base Prompt**: `pixel art sprite of a colorful carousel (merry-go-round) with decorated horses on poles, striped roof, carnival lights, happy atmosphere, isometric view, 16-bit style, white background`
*   **Idle Prompt**: `pixel art sprite of carousel, spinning slowly, lights blinking in sequence, breathing frame, isometric view, white background`
*   **Action Prompt**: `pixel art sprite of carousel, spinning fast creating a tornado of music notes and stars, attacking pose, isometric view, white background`

#### Lv.95 刃马一体 (Samurai Mech)
*   **原型**: 机战OG (Dygenguar)
*   **视觉**: 巨大的黑蓝色武士机器人（大曾伽）骑在变形成马的黑色机器人（龙卷）上，手持超巨大的斩舰刀。
*   **Base Prompt**: `pixel art sprite of a super robot samurai (Dygenguar) riding a mechanical robot horse (Aussenseiter), combining into a single centaur form, wielding a colossal ship-cleaving sword (Zankantou), dramatic super robot wars pose, isometric view, 16-bit style, white background`
*   **Idle Prompt**: `pixel art sprite of robot samurai on horse, sword energy crackling, cape blowing, breathing frame, isometric view, white background`
*   **Action Prompt**: `pixel art sprite of robot samurai, slashing the sword vertically with a giant energy trail, "CHESTO!" vibe, attacking pose, isometric view, white background`

#### Lv.96 奥丁神驹 (Sleipnir God)
*   **原型**: 北欧神话
*   **视觉**: 拥有八条腿的灰色神马，奥丁骑在上面，手持冈格尼尔长枪，周围有乌鸦飞舞。
*   **Base Prompt**: `pixel art sprite of a grey eight-legged horse (Sleipnir) ridden by the Allfather Odin (one eye, winged helmet), holding Gungnir spear, ravens flying, norse mythology style, isometric view, 16-bit style, white background`
*   **Idle Prompt**: `pixel art sprite of sleipnir, all eight legs moving restlessly, Odin watching, breathing frame, isometric view, white background`
*   **Action Prompt**: `pixel art sprite of sleipnir, galloping across the sky (Bifrost bridge effect), spear throw, attacking pose, isometric view, white background`

#### Lv.97 天马行空 (Sky Concept)
*   **原型**: 成语
*   **视觉**: 一匹由云朵、星空和想象力构成的半透明马，在天空中自由奔跑，没有固定的形态。
*   **Base Prompt**: `pixel art sprite of a horse made entirely of fluffy white clouds and blue sky texture, semi-transparent and ethereal, running on air, dreamlike concept, isometric view, 16-bit style, white background`
*   **Idle Prompt**: `pixel art sprite of sky horse, clouds shifting shape, birds flying through it, breathing frame, isometric view, white background`
*   **Action Prompt**: `pixel art sprite of sky horse, dissolving into mist and reforming elsewhere, teleportation effect, attacking pose, isometric view, white background`

#### Lv.98 彩虹桥 (Bifrost Br)
*   **原型**: 北欧神话
*   **视觉**: 一道跨越天际的彩虹桥，上面奔跑着无数光之马的幻影。
*   **Base Prompt**: `pixel art sprite of a segment of the Bifrost rainbow bridge, glowing with prismatic light, spectral horses galloping along it, cosmic scenery, isometric view, 16-bit style, white background`
*   **Idle Prompt**: `pixel art sprite of bifrost, colors cycling, light particles rising, breathing frame, isometric view, white background`
*   **Action Prompt**: `pixel art sprite of bifrost, beaming a pillar of light down (teleportation), attacking pose, isometric view, white background`

#### Lv.99 龙马精神 (Spirit Drag)
*   **原型**: 成语
*   **视觉**: 一条龙和一匹马的灵魂交织在一起，形成一个太极般的能量球，充满了精气神。
*   **Base Prompt**: `pixel art sprite of a spiritual energy avatar combining a dragon and a horse, swirling together in a Yin-Yang formation, burning with red and gold aura, pure vitality, isometric view, 16-bit style, white background`
*   **Idle Prompt**: `pixel art sprite of spirit dragon horse, energy swirling faster, aura flaring, breathing frame, isometric view, white background`
*   **Action Prompt**: `pixel art sprite of spirit dragon horse, exploding outward in a burst of morale-boosting light, buff effect, isometric view, white background`

#### Lv.100 马一龙 (Elon Mars)
*   **原型**: Elon Musk
*   **视觉**: 像素版的马斯克，穿着SpaceX宇航服，骑着银色的星舰（Starship）火箭，旁边跟着一只柴犬（Doge）。
*   **Base Prompt**: `pixel art sprite of a caricature of Elon Musk in a white space suit, riding a retro-futuristic silver rocket (Starship) like a horse, a Doge dog floating nearby, Mars red planet background element, confident expression, isometric view, 16-bit style, white background`
*   **Idle Prompt**: `pixel art sprite of Elon on rocket, rocket thrusters pulsing blue, Doge barking, breathing frame, isometric view, white background`
*   **Action Prompt**: `pixel art sprite of Elon on rocket, rocket launching forward with massive fire trail, energetic space launch effect, attacking pose, isometric view, white background`

#### Lv.101 宇宙神驹 (Cosmic One)
*   **原型**: 宇宙概念
*   **视觉**: 一匹由星系、星云和黑洞构成的马，它是宇宙本身，深邃而宏大。
*   **Base Prompt**: `pixel art sprite of a horse silhouette filled with deep space textures, galaxies, nebulae, and stars inside its body, cosmic horror/awe style, eyes are supernovas, isometric view, 16-bit style, white background`
*   **Idle Prompt**: `pixel art sprite of cosmic horse, stars twinkling inside body, nebula swirling, breathing frame, isometric view, white background`
*   **Action Prompt**: `pixel art sprite of cosmic horse, creating a Big Bang explosion, white screen transition effect, attacking pose, isometric view, white background`

---

## 4. 道具图标 (Item Icons)

*   **大炮 (Cannon)**: `pixel art icon of a black Chinese Chess cannon piece, metallic texture, red symbol "炮", isometric view, white background`
*   **老虎玩偶 (Tiger Doll)**: `pixel art icon of a cute plush tiger doll, orange with black stripes, sitting pose, soft texture, isometric view, white background`
*   **鹿牌 (Deer Sign)**: `pixel art icon of a wooden sign board with a crude drawing of a deer, rustic style, isometric view, white background`
*   **神笔 (Magic Brush)**: `pixel art icon of a magical Chinese calligraphy brush with a glowing tip, trailing colorful ink, isometric view, white background`
*   **金元宝 (Gold Ingot)**: `pixel art icon of a traditional Chinese gold sycee, shiny gold texture, isometric view, white background`

---

## 5. UI 与特效 (UI & VFX)

*   **技能按钮 (Skill Btn)**: `pixel art UI button, emerald green rectangular shape with gold border, "Skill" text placeholder, pressable 3D look`
*   **商店背景 (Shop Bg)**: `pixel art UI panel, wooden texture with red chinese roof details, festive style`
*   **消除特效 (Merge VFX)**: `pixel art visual effect, bright yellow star burst, explosion of sparkles, vibrant and energetic, white background`
*   **生成烟雾 (Spawn VFX)**: `pixel art visual effect, white puffy cartoon smoke cloud, popping effect, white background`
