# 实现规格文档

## 技术栈

| 层级 | 技术 |
|------|------|
| 前端框架 | React 18 + TypeScript |
| 游戏渲染 | HTML5 Canvas 2D |
| 状态管理 | Zustand |
| 数据获取 | TanStack Query |
| 路由 | Wouter |
| 样式 | TailwindCSS + shadcn/ui |
| 构建工具 | Vite |
| 后端 | Node.js + Express |
| 数据库 | PostgreSQL (Drizzle ORM) |

---

## 文件结构

```
client/
├── src/
│   ├── components/
│   │   ├── ui/           # shadcn组件
│   │   ├── game/         # 游戏相关React组件
│   │   │   ├── GameCanvas.tsx
│   │   │   ├── HUD.tsx
│   │   │   ├── SkillCutscene.tsx
│   │   │   └── ...
│   │   └── menu/         # 菜单组件
│   │       ├── MainMenu.tsx
│   │       ├── CharacterSelect.tsx
│   │       ├── TrackSelect.tsx
│   │       └── ...
│   ├── engine/           # 游戏引擎核心
│   │   ├── core/
│   │   │   ├── GameEngine.ts
│   │   │   ├── GameLoop.ts
│   │   │   └── Scene.ts
│   │   ├── entities/
│   │   │   ├── Entity.ts
│   │   │   ├── Player.ts
│   │   │   ├── Enemy.ts
│   │   │   └── Item.ts
│   │   ├── systems/
│   │   │   ├── CollisionSystem.ts
│   │   │   ├── RenderSystem.ts
│   │   │   ├── InputManager.ts
│   │   │   └── SpawnManager.ts
│   │   ├── graphics/
│   │   │   ├── SpriteSheet.ts
│   │   │   ├── Animator.ts
│   │   │   └── ParallaxBackground.ts
│   │   └── scenes/
│   │       ├── GameScene.ts
│   │       ├── BossScene.ts
│   │       └── ResultScene.ts
│   ├── stores/
│   │   ├── gameStore.ts
│   │   └── playerStore.ts
│   ├── config/
│   │   ├── characters.json
│   │   ├── tracks.json
│   │   └── enemies.json
│   ├── pages/
│   │   ├── Home.tsx
│   │   ├── Game.tsx
│   │   ├── Achievements.tsx
│   │   └── Settings.tsx
│   └── utils/
│       ├── assetLoader.ts
│       └── mathUtils.ts
├── public/
│   └── assets/
│       ├── characters/
│       ├── tracks/
│       ├── enemies/
│       ├── items/
│       └── ui/
server/
├── index.ts
├── routes.ts
├── storage.ts
└── vite.ts
shared/
└── schema.ts
```

---

## 关键类型定义

```typescript
// shared/schema.ts

// 角色配置
interface CharacterConfig {
  id: string;
  name: string;
  series: 'mythology' | 'anime' | 'hero' | 'culture' | 'meme' | 'special';
  type: 'mount' | 'run' | 'fly';
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
  unlockCondition: UnlockCondition;
  stats: CharacterStats;
  skills: [SkillConfig, SkillConfig];
  animations: AnimationSet;
}

interface CharacterStats {
  hp: number;
  attack: number;
  defense: number;
  speed: number;   // 百分比，100为基准
  critRate: number; // 百分比
  cdr: number;      // 百分比
}

interface SkillConfig {
  id: string;
  name: string;
  nameJp?: string;
  cooldown: number;  // 秒
  damage: number;    // 倍率
  effect: SkillEffect;
  hasCutscene: boolean;
}

// 赛道配置
interface TrackConfig {
  id: string;
  name: string;
  difficulty: 1 | 2 | 3;
  unlockCondition: UnlockCondition;
  length: number;  // 米
  phases: PhaseConfig[];
  boss: BossConfig;
  specialMechanics: string[];
}

interface PhaseConfig {
  startDistance: number;
  endDistance: number;
  speedMultiplier: number;
  enemyDensity: number;
  obstacleDensity: number;
}

// 敌人配置
interface EnemyConfig {
  id: string;
  name: string;
  type: 'minion' | 'elite' | 'boss';
  hp: number;
  attack: number;
  scoreValue: number;
  dropTable: DropEntry[];
  behavior: BehaviorType;
}
```

---

## 游戏流程状态机

```typescript
enum GameState {
  LOADING = 'loading',
  MENU = 'menu',
  CHARACTER_SELECT = 'character_select',
  TRACK_SELECT = 'track_select',
  PLAYING = 'playing',
  PAUSED = 'paused',
  BOSS_FIGHT = 'boss_fight',
  SKILL_CUTSCENE = 'skill_cutscene',
  GAME_OVER = 'game_over',
  VICTORY = 'victory',
  RESULT = 'result',
}

class GameStateMachine {
  currentState: GameState = GameState.LOADING;
  
  transitions: Map<GameState, GameState[]> = new Map([
    [GameState.LOADING, [GameState.MENU]],
    [GameState.MENU, [GameState.CHARACTER_SELECT, GameState.TRACK_SELECT]],
    [GameState.CHARACTER_SELECT, [GameState.MENU, GameState.TRACK_SELECT]],
    [GameState.TRACK_SELECT, [GameState.MENU, GameState.PLAYING]],
    [GameState.PLAYING, [GameState.PAUSED, GameState.BOSS_FIGHT, 
                         GameState.SKILL_CUTSCENE, GameState.GAME_OVER]],
    [GameState.PAUSED, [GameState.PLAYING, GameState.MENU]],
    [GameState.BOSS_FIGHT, [GameState.VICTORY, GameState.GAME_OVER, 
                           GameState.SKILL_CUTSCENE]],
    [GameState.SKILL_CUTSCENE, [GameState.PLAYING, GameState.BOSS_FIGHT]],
    [GameState.GAME_OVER, [GameState.RESULT]],
    [GameState.VICTORY, [GameState.RESULT]],
    [GameState.RESULT, [GameState.MENU, GameState.PLAYING]],
  ]);
  
  canTransitionTo(newState: GameState): boolean {
    const allowed = this.transitions.get(this.currentState);
    return allowed?.includes(newState) ?? false;
  }
  
  transitionTo(newState: GameState): void {
    if (this.canTransitionTo(newState)) {
      this.onExit(this.currentState);
      this.currentState = newState;
      this.onEnter(newState);
    }
  }
}
```

---

## 性能指标

| 指标 | 目标 | 最低可接受 |
|------|------|-----------|
| 帧率 | 60 FPS | 30 FPS |
| 首屏加载 | 2秒 | 5秒 |
| 游戏加载 | 3秒 | 8秒 |
| 内存占用 | 100MB | 200MB |
| 初始包大小 | 10MB | 20MB |
| 响应延迟 | <16ms | <33ms |

---

## 调试工具

```typescript
// 开发模式下的调试面板
class DebugPanel {
  visible: boolean = false;
  
  metrics = {
    fps: 0,
    entities: 0,
    drawCalls: 0,
    memoryUsage: 0,
  };
  
  update(): void {
    this.metrics.fps = this.calculateFPS();
    this.metrics.entities = GameScene.instance.entities.length;
    // ...
  }
  
  render(ctx: CanvasRenderingContext2D): void {
    if (!this.visible) return;
    
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.fillRect(10, 10, 200, 100);
    
    ctx.fillStyle = '#00ff00';
    ctx.font = '12px monospace';
    ctx.fillText(`FPS: ${this.metrics.fps}`, 20, 30);
    ctx.fillText(`Entities: ${this.metrics.entities}`, 20, 50);
    // ...
  }
}

// 作弊命令（仅开发模式）
const cheatCommands = {
  'god': () => player.invincible = true,
  'coins': (n: number) => gameStore.addCoins(n),
  'unlock': (id: string) => gameStore.unlockCharacter(id),
  'skip': () => teleportToBoss(),
  'win': () => gameState.transitionTo(GameState.VICTORY),
};
```

---

## 本地存储结构

```typescript
interface LocalSaveData {
  version: string;
  player: {
    id: string;
    nickname: string;
    coins: number;
    unlockedCharacters: string[];
    achievements: string[];
    settings: GameSettings;
  };
  progress: {
    highScores: Record<string, number>;
    completedTracks: string[];
    totalDistance: number;
    totalKills: number;
    totalCoins: number;
    playTime: number;
  };
  lastSaved: number;
}

class SaveManager {
  private readonly SAVE_KEY = 'horse_rush_save';
  
  save(data: LocalSaveData): void {
    localStorage.setItem(this.SAVE_KEY, JSON.stringify(data));
  }
  
  load(): LocalSaveData | null {
    const saved = localStorage.getItem(this.SAVE_KEY);
    if (!saved) return null;
    
    try {
      const data = JSON.parse(saved);
      return this.migrate(data);
    } catch {
      return null;
    }
  }
  
  migrate(data: LocalSaveData): LocalSaveData {
    // 版本迁移逻辑
    return data;
  }
}
```

---

## 测试策略

### 单元测试

| 模块 | 测试重点 |
|------|---------|
| 碰撞系统 | 矩形重叠检测准确性 |
| 伤害计算 | 公式正确性 |
| 状态机 | 状态转换合法性 |
| 动画系统 | 帧切换逻辑 |

### 集成测试

| 场景 | 测试内容 |
|------|---------|
| 完整游戏流程 | 从菜单到结算 |
| 角色切换 | 不同角色技能触发 |
| 存档读取 | 数据持久化正确性 |

### 性能测试

| 测试项 | 方法 |
|--------|------|
| 帧率稳定性 | 密集敌人场景测试 |
| 内存泄漏 | 长时间运行监控 |
| 加载速度 | 多次测量取平均 |

---

*实现规格文档完成*
