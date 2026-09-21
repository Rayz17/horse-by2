# 05-technical/data-structure.md

# 数据结构定义 (Data Structures)

## 1. 角色配置 (Character Config)
`assets/data/horses.json`

```json
[
  {
    "id": "foal_01",
    "name": "初生牛犊",
    "level": 1,
    "rarity": "N", // N, R, SR, SSR, Hidden
    "description": "初生牛犊不怕虎，但这只是匹小马。",
    "blessing": "马到成功，起步顺利。",
    "skill_id": "move_any",
    "sprite_path": "assets/images/sprites/foal_01.png",
    "prompt": "Cute baby horse foal, pixel art..."
  },
  {
    "id": "coder_feng",
    "name": "二马弟弟",
    "level": 68,
    "rarity": "Hidden",
    "description": "他是天才程序员冯（二马）先生...",
    "blessing": "代码无误运行快，人生无解亦精彩...",
    "skill_id": "algo_optimize",
    "sprite_path": "assets/images/sprites/coder_feng.png"
  },
  {
    "id": "red_hare",
    "name": "赤兔",
    "level": 86,
    "rarity": "SSR",
    "description": "人中吕布，马中赤兔。",
    "blessing": "赤兔迎春，事业如火。",
    "skill_id": "move_any",
    "sprite_path": "assets/images/sprites/red_hare.png"
  }
]
```

## 2. 突变配方 (Mutation Recipes)
`assets/data/mutations.json`

```json
[
  {
    "source_a": "red_hare",
    "source_b": "wuzhui",
    "result": "overlord_red_hare",
    "probability": 1.0,
    "unlock_achievement": "achievement_overlord"
  }
]
```

## 3. 存档数据 (Save Data)
用户本地存储 (localStorage) 结构。

```json
{
  "user_id": "uuid_v4",
  "high_score": 50000,
  "unlocked_characters": ["foal_01", "merry_go_round", "coder_feng", ...],
  "current_grid": [
    [null, "foal_01", null, ...],
    ...
  ],
  "skills_inventory": {
    "kick": 5,
    "summon": 2
  }
}
```
