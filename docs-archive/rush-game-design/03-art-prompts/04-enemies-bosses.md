# 敌人与Boss Prompt完整列表

## 敌人规格说明

| 类型 | 尺寸 | 帧数 | 动画 |
|------|------|------|------|
| 小兵 | 32×32 px | 4帧 | idle/move/attack/death |
| 精英 | 48×48 px | 6帧 | idle/move/attack/skill/death |
| Boss | 96-128 px | 8-12帧 | 多阶段动画 |

---

## 小兵 (6种)

### 1. 年兽幼崽
```
4-frame enemy sprite sheet of baby Nian beast, 32x32 pixels per frame,

Design: small red monster with tiny horns and sharp teeth,
cute but fierce appearance (kawaii monster),
Chinese New Year creature design,
yellow glowing eyes,

Animations: idle wobble, running toward left, bite attack, poof death,

pixel art, transparent background, retro game enemy style
```

### 2. 害马精
```
4-frame enemy sprite sheet of horse-harming goblin spirit, 32x32 pixels per frame,

Design: small green goblin/yokai creature,
holding rope lasso weapon,
malicious grin, floating movement,
Chinese mythology demon style,

Animations: floating bob, moving left, throwing rope, dissolve death,

pixel art, transparent background, retro game enemy style
```

### 3. 噩梦马
```
4-frame enemy sprite sheet of nightmare horse ghost, 32x32 pixels per frame,

Design: ghostly black horse silhouette,
glowing red eyes, ethereal mane,
semi-transparent body,
dark fantasy nightmare creature,

Animations: hovering, charging left, phase through, fade death,

pixel art, transparent background, retro game enemy style
```

### 4. 赛博无人机
```
4-frame enemy sprite sheet of cyberpunk surveillance drone, 32x32 pixels per frame,

Design: small hovering drone with propellers,
neon accent lights (cyan/purple),
single eye camera lens,
laser cannon attachment,

Animations: hovering with propeller spin, moving, laser shot, explode death,

pixel art, transparent background, cyberpunk aesthetic
```

### 5. 糖果哥布林
```
4-frame enemy sprite sheet of candy goblin creature, 32x32 pixels per frame,

Design: colorful small goblin made of candy,
lollipop weapon, gumdrop body parts,
mischievous cute expression,
candy wrapper clothing,

Animations: bouncing idle, hopping movement, candy throw, melt death,

pixel art, transparent background, cute candy style
```

### 6. 春节舞狮
```
4-frame enemy sprite sheet of lion dance head creature, 32x32 pixels per frame,

Design: Chinese lion dance costume head,
red and gold colors, big eyes,
open mouth with teeth showing,
festive but aggressive,

Animations: bobbing, bouncing forward, biting, collapse death,

pixel art, transparent background, Chinese festival style
```

---

## 精英怪 (4种)

### 1. 小年兽
```
6-frame elite enemy sprite sheet of young Nian beast, 48x48 pixels per frame,

Design: medium-sized red monster with large horns,
flames surrounding body,
intimidating stance,
mature version of baby Nian,

Animations: standing with fire aura, charging, fire breath attack,
special rage mode, explosion death,

pixel art, transparent background, Chinese mythology style
```

### 2. 雷夔
```
6-frame elite enemy sprite sheet of Lei Kui thunder beast, 48x48 pixels per frame,

Design: mythical one-legged ox-like creature,
lightning crackling around body,
single powerful leg,
storm cloud companion,
ancient Chinese mythology design,

Animations: standing on one leg, hopping movement, thunder ball charge,
thunder strike attack, electrocution death,

pixel art, transparent background, Chinese mythology style
```

### 3. 马面使者
```
6-frame elite enemy sprite sheet of Horse-Face underworld messenger, 48x48 pixels per frame,

Design: horse-headed humanoid figure,
black robes like death deity,
wielding scythe weapon,
ghostly aura,
Chinese underworld guard design,

Animations: hovering stance, gliding movement, scythe swing,
summon lesser ghosts, fade to underworld death,

pixel art, transparent background, Chinese mythology style
```

### 4. 机械守卫
```
6-frame elite enemy sprite sheet of cyberpunk mech guard, 48x48 pixels per frame,

Design: heavily armored bipedal robot,
energy shield generator,
laser array weapons on shoulders,
chrome and neon color scheme,
industrial military design,

Animations: power stance, walking, shield up, laser barrage,
overload explosion death,

pixel art, transparent background, cyberpunk style
```

---

## Boss (3种)

### 1. 年兽王 (最终Boss)
```
Boss sprite sheet of Nian Beast King, 128x128 pixels,

Design: massive red monster with giant horns,
terrifying majestic presence,
fire aura surrounding entire body,
ancient and powerful creature,
Chinese New Year ultimate monster,

Phase 1 (100%-60% HP):
- idle with fire breathing
- charge attack
- fire breath sweep

Phase 2 (60%-30% HP):
- enraged with glowing eyes
- ground slam shockwave
- summon mini Nian beasts

Phase 3 (30%-0% HP):
- full fire aura body
- rapid attacks
- desperation fury mode

Death: dramatic explosion with fire dissipating,

pixel art, transparent background, Chinese mythology epic style
```

### 2. 夔 (雷电Boss)
```
Boss sprite sheet of Kui ancient thunder beast, 96x96 pixels,

Design: giant one-legged ox creature,
storm clouds permanently surrounding,
lightning constantly arcing,
mountain-shaking presence,
ancient Chinese mythology primordial beast,

Attacks:
- thunder ball projectiles
- lightning strike from above
- ground-shaking stomp
- storm cloud summon

Death: lightning explosion, clouds dispersing,

pixel art, transparent background, Chinese mythology style
```

### 3. 机械年兽 (赛博Boss)
```
Boss sprite sheet of Cyber Nian Mech, 128x128 pixels,

Design: mechanical recreation of Nian beast,
chrome body with neon accents,
laser weapons integrated,
missile pods on shoulders,
deployable drone minions,
cyberpunk meets Chinese mythology fusion,

Attacks:
- laser beam sweep
- missile barrage
- drone deployment
- EMP pulse (stun)
- transformation phases

Death: dramatic mech breakdown with explosions,

pixel art, transparent background, cyberpunk fusion style
```

---

## 输出文件命名

### 小兵
| 敌人 | 文件名 |
|------|--------|
| 年兽幼崽 | `enemy_baby_nian_4f.png` |
| 害马精 | `enemy_goblin_spirit_4f.png` |
| 噩梦马 | `enemy_nightmare_4f.png` |
| 赛博无人机 | `enemy_cyber_drone_4f.png` |
| 糖果哥布林 | `enemy_candy_goblin_4f.png` |
| 春节舞狮 | `enemy_lion_dance_4f.png` |

### 精英怪
| 敌人 | 文件名 |
|------|--------|
| 小年兽 | `elite_young_nian_6f.png` |
| 雷夔 | `elite_lei_kui_6f.png` |
| 马面使者 | `elite_horse_face_6f.png` |
| 机械守卫 | `elite_mech_guard_6f.png` |

### Boss
| Boss | 文件名 |
|------|--------|
| 年兽王 | `boss_nian_king_sheet.png` |
| 夔 | `boss_kui_sheet.png` |
| 机械年兽 | `boss_cyber_nian_sheet.png` |

**总计: 6小兵 + 4精英 + 3Boss = 13套敌人精灵图**

---

*敌人与Boss Prompt完整列表完成*
