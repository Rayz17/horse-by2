# 美术Prompt规范与索引

## 1. 通用规格说明

### 1.1 精灵图(Sprite Sheet)规格

| 项目 | 规格 |
|------|------|
| 单帧尺寸 | 64×64 像素 |
| 拼接方式 | 横向排列 |
| 背景 | 透明 (transparent) |
| 风格 | 像素艺术 (pixel art) |
| 边缘 | 清晰锐利，无抗锯齿 |

### 1.2 特写立绘规格

| 项目 | 规格 |
|------|------|
| 尺寸 | 192×256 像素 |
| 用途 | 技能特写、角色选择、胜利画面 |
| 背景 | 透明 |
| 风格 | 高精度像素画 |
| 构图 | 角色占画面80%，动态姿势 |

### 1.3 赛道背景规格

| 层级 | 尺寸 | 滚动速度 |
|------|------|---------|
| 背景层 (Layer 1) | 640×360 像素 | 0.2x |
| 中景层 (Layer 2) | 640×360 像素 | 0.5x |
| 近景层 (Layer 3) | 640×360 像素 | 0.8x |
| 地面层 (Layer 4) | 640×64 像素 | 1.0x |

**要求**: 所有背景层需支持无缝水平循环 (seamless horizontal tile)

---

## 2. Prompt通用后缀

### 2.1 角色精灵图后缀
```
pixel art sprite sheet, 64x64 pixels per frame, transparent background,
retro game aesthetic, clean pixel edges, limited color palette,
side-scrolling game character, no anti-aliasing
```

### 2.2 角色特写立绘后缀
```
highly detailed pixel art, retro game portrait style,
transparent background, bold outlines, rich color palette
```

### 2.3 赛道背景后缀
```
seamless horizontal tile, pixel art, retro game aesthetic,
parallax scrolling layer, transparent where needed
```

### 2.4 敌人精灵图后缀
```
pixel art enemy sprite, transparent background,
retro game enemy design, clean pixel edges
```

---

## 3. 动画类型标准

每个角色需要9种动画：

| 动画ID | 名称 | 标准帧数 | 描述 |
|--------|------|---------|------|
| idle | 待机 | 4帧 | 站立呼吸、微动 |
| run | 奔跑 | 6-8帧 | 完整跑步循环 |
| jump | 跳跃 | 4帧 | 起跳到顶点 |
| fall | 下落 | 2帧 | 顶点到落地准备 |
| attack | 普攻 | 4-6帧 | 基础攻击动作 |
| skill1 | 技能1 | 8-12帧 | 主动技能1 |
| skill2 | 技能2 | 8-14帧 | 主动技能2(终极) |
| hurt | 受伤 | 3帧 | 受击反应 |
| death | 死亡 | 6帧 | 倒下消失 |

---

## 4. 角色分类说明

### 4.1 神话传说系列 (6角色)
| 序号 | 角色 | 文件 |
|------|------|------|
| #1 | 关公·赤兔 | 01-guan-yu.md |
| #2 | 唐僧·白龙 | 02-tang-seng.md |
| #3 | 天马行空 | 03-tianma.md |
| #4 | 八骏图·骅骝 | 04-hualiu.md |
| #5 | 麒麟 | 05-qilin.md |
| #6 | 龙马精神 | 06-longma.md |

### 4.2 动漫游戏系列 (8角色)
| 序号 | 角色 | 文件 |
|------|------|------|
| #7 | 骷髅骑士 | 07-skull-knight.md |
| #8 | 刃马一体 | 08-jinba-ittai.md |
| #9 | BTX太阳 | 09-btx-sun.md |
| #10 | 天马座星矢 | 10-seiya.md |
| #11 | 马男波杰克 | 11-bojack.md |
| #12 | 彩虹小马·云宝 | 12-rainbow-dash.md |
| #13 | 暮光闪闪 | 13-twilight.md |
| #14 | 埃尔文团长 | 14-erwin.md |

### 4.3 动作英雄系列 (6角色)
| 序号 | 角色 | 文件 |
|------|------|------|
| #15 | 马里奥骑士 | 15-mario-yoshi.md |
| #16 | 林克骑马 | 16-link-epona.md |
| #17 | 蒙古骑兵 | 17-mongol.md |
| #18 | 胡迪警长 | 18-woody.md |
| #19 | 塞西尔骑士 | 19-cecil.md |
| #20 | 特洛伊木马 | 20-trojan.md |

### 4.4 文化梗系列 (6角色)
| 序号 | 角色 | 文件 |
|------|------|------|
| #21 | 马赛克先生 | 21-mosaic.md |
| #22 | 皇马C罗 | 22-cr7.md |
| #23 | 独角兽 | 23-unicorn.md |
| #24 | 黑马王子 | 24-dark-prince.md |
| #25 | 塞翁 | 25-saiweng.md |
| #26 | 三驾马车 | 26-three-ma.md |

### 4.5 恶搞神梗系列 (4角色)
| 序号 | 角色 | 文件 |
|------|------|------|
| #27 | 草泥马 | 27-grass-mud.md |
| #28 | 马后炮 | 28-mahou-pao.md |
| #29 | 千里马 | 29-qianli-ma.md |
| #30 | 马桶MT | 30-ma-tong.md |

### 4.6 特殊角色 (1角色)
| 序号 | 角色 | 文件 |
|------|------|------|
| #31 | 机械战马 | 31-mecha-horse.md |

---

## 5. 生成优先级

### P0 - 核心 (第1-2周)
- 关公·赤兔 全套
- 霓虹都市背景
- 基础敌人3种
- UI基础元素

### P1 - 重要 (第3-4周)
- MVP 12角色全套
- 糖果王国背景
- 春节大街背景
- Boss年兽

### P2 - 次要 (第5-6周)
- 剩余19角色
- 剩余3赛道背景
- 全部特写立绘
- 成就图标

---

*本文档为美术Prompt规范索引*
