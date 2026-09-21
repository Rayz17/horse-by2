# 技术架构设计

## 系统架构概览

```
┌─────────────────────────────────────────────────────────┐
│                    马年狂奔 - 系统架构                   │
├─────────────────────────────────────────────────────────┤
│  前端 (React + Canvas)                                  │
│  ├── 菜单系统 (React Components)                        │
│  ├── 游戏引擎 (HTML5 Canvas)                            │
│  └── 状态管理 (Zustand)                                 │
├─────────────────────────────────────────────────────────┤
│  后端 (Node.js + Express)                               │
│  ├── API Routes                                         │
│  ├── 存储层 (PostgreSQL/Memory)                         │
│  └── 排行榜服务                                         │
├─────────────────────────────────────────────────────────┤
│  数据层                                                  │
│  ├── 玩家数据 (解锁/金币/成就)                          │
│  ├── 排行榜 (全局/赛道/周榜)                            │
│  └── 游戏配置 (静态JSON)                                │
└─────────────────────────────────────────────────────────┘
```

---

## 游戏引擎设计

### 核心类结构

```typescript
// 游戏主类
class GameEngine {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  gameLoop: GameLoop;
  currentScene: Scene;
  
  init(): void;
  update(deltaTime: number): void;
  render(): void;
  changeScene(scene: Scene): void;
}

// 游戏循环
class GameLoop {
  fps: number = 60;
  running: boolean = false;
  lastTime: number = 0;
  
  start(): void;
  stop(): void;
  tick(currentTime: number): void;
}

// 场景基类
abstract class Scene {
  abstract update(dt: number): void;
  abstract render(ctx: CanvasRenderingContext2D): void;
  abstract handleInput(input: InputState): void;
}

// 游戏场景
class GameScene extends Scene {
  player: Player;
  enemies: Enemy[];
  items: Item[];
  background: ParallaxBackground;
  camera: Camera;
  
  spawnManager: SpawnManager;
  collisionSystem: CollisionSystem;
  scoreSystem: ScoreSystem;
}
```

### 实体系统

```typescript
// 游戏实体基类
abstract class Entity {
  x: number;
  y: number;
  width: number;
  height: number;
  velocity: Vector2;
  sprite: SpriteSheet;
  
  abstract update(dt: number): void;
  abstract render(ctx: CanvasRenderingContext2D): void;
  getBounds(): Rectangle;
}

// 玩家类
class Player extends Entity {
  characterId: string;
  hp: number;
  maxHp: number;
  attack: number;
  defense: number;
  speed: number;
  
  skill1: Skill;
  skill2: Skill;
  
  state: PlayerState;
  animator: Animator;
  
  jump(): void;
  useSkill1(): void;
  useSkill2(): void;
  takeDamage(amount: number): void;
  heal(amount: number): void;
}

// 敌人类
class Enemy extends Entity {
  type: EnemyType;
  hp: number;
  attack: number;
  scoreValue: number;
  dropTable: DropTable;
  
  ai: EnemyAI;
  
  takeDamage(amount: number): void;
  die(): void;
}
```

---

## 渲染系统

### 分层渲染

```typescript
class RenderSystem {
  layers: Map<string, RenderLayer>;
  
  constructor() {
    this.layers = new Map([
      ['background', new BackgroundLayer()],   // 视差背景
      ['entities', new EntityLayer()],         // 敌人/道具
      ['player', new PlayerLayer()],           // 玩家
      ['effects', new EffectLayer()],          // 特效
      ['ui', new UILayer()],                   // HUD
    ]);
  }
  
  render(ctx: CanvasRenderingContext2D): void {
    for (const layer of this.layers.values()) {
      layer.render(ctx);
    }
  }
}
```

### 视差背景

```typescript
class ParallaxBackground {
  layers: BackgroundLayer[];
  
  constructor(trackId: string) {
    this.layers = [
      { image: loadImage(`${trackId}_layer1.png`), speed: 0.2 },
      { image: loadImage(`${trackId}_layer2.png`), speed: 0.5 },
      { image: loadImage(`${trackId}_layer3.png`), speed: 0.8 },
      { image: loadImage(`${trackId}_layer4.png`), speed: 1.0 },
    ];
  }
  
  update(cameraX: number): void {
    for (const layer of this.layers) {
      layer.offset = (cameraX * layer.speed) % layer.image.width;
    }
  }
  
  render(ctx: CanvasRenderingContext2D): void {
    for (const layer of this.layers) {
      // 绘制两次实现无缝循环
      ctx.drawImage(layer.image, -layer.offset, 0);
      ctx.drawImage(layer.image, layer.image.width - layer.offset, 0);
    }
  }
}
```

---

## 精灵动画系统

```typescript
class SpriteSheet {
  image: HTMLImageElement;
  frameWidth: number;
  frameHeight: number;
  animations: Map<string, AnimationData>;
  
  getFrame(animName: string, frameIndex: number): Rectangle;
}

class Animator {
  spriteSheet: SpriteSheet;
  currentAnimation: string;
  currentFrame: number;
  frameTime: number;
  elapsed: number;
  
  play(animName: string, loop: boolean = true): void;
  update(dt: number): void;
  getCurrentFrame(): Rectangle;
}

interface AnimationData {
  startFrame: number;
  frameCount: number;
  fps: number;
  loop: boolean;
}
```

---

## 碰撞系统

```typescript
class CollisionSystem {
  checkCollision(a: Entity, b: Entity): boolean {
    const boundsA = a.getBounds();
    const boundsB = b.getBounds();
    return this.rectangleOverlap(boundsA, boundsB);
  }
  
  rectangleOverlap(a: Rectangle, b: Rectangle): boolean {
    return a.x < b.x + b.width &&
           a.x + a.width > b.x &&
           a.y < b.y + b.height &&
           a.y + a.height > b.y;
  }
  
  processCollisions(player: Player, entities: Entity[]): void {
    for (const entity of entities) {
      if (this.checkCollision(player, entity)) {
        if (entity instanceof Enemy) {
          this.handlePlayerEnemyCollision(player, entity);
        } else if (entity instanceof Item) {
          this.handlePlayerItemCollision(player, entity);
        }
      }
    }
  }
}
```

---

## 输入系统

```typescript
class InputManager {
  touchZones: TouchZone[];
  activeInputs: Set<string>;
  
  constructor(canvas: HTMLCanvasElement) {
    this.touchZones = [
      { id: 'jump', x: 0, width: canvas.width / 3 },
      { id: 'skill1', x: canvas.width / 3, width: canvas.width / 3 },
      { id: 'skill2', x: canvas.width * 2 / 3, width: canvas.width / 3 },
    ];
    
    canvas.addEventListener('touchstart', this.onTouchStart.bind(this));
    canvas.addEventListener('touchend', this.onTouchEnd.bind(this));
  }
  
  onTouchStart(e: TouchEvent): void {
    for (const touch of e.changedTouches) {
      const zone = this.getZoneAt(touch.clientX);
      if (zone) {
        this.activeInputs.add(zone.id);
      }
    }
  }
  
  isPressed(action: string): boolean {
    return this.activeInputs.has(action);
  }
}
```

---

## 状态管理 (Zustand)

```typescript
interface GameState {
  // 玩家数据
  selectedCharacter: string;
  unlockedCharacters: string[];
  coins: number;
  achievements: string[];
  
  // 游戏进度
  currentTrack: string;
  highScores: Record<string, number>;
  
  // 临时状态
  isPlaying: boolean;
  isPaused: boolean;
  currentScore: number;
  
  // Actions
  selectCharacter: (id: string) => void;
  unlockCharacter: (id: string) => void;
  addCoins: (amount: number) => void;
  unlockAchievement: (id: string) => void;
  setHighScore: (track: string, score: number) => void;
}

const useGameStore = create<GameState>((set) => ({
  selectedCharacter: 'guan_yu',
  unlockedCharacters: ['guan_yu', 'seiya', 'mario_yoshi', ...],
  coins: 0,
  achievements: [],
  
  selectCharacter: (id) => set({ selectedCharacter: id }),
  unlockCharacter: (id) => set((state) => ({
    unlockedCharacters: [...state.unlockedCharacters, id]
  })),
  addCoins: (amount) => set((state) => ({
    coins: state.coins + amount
  })),
  // ...
}));
```

---

## API设计

### 端点列表

| 方法 | 路径 | 描述 |
|------|------|------|
| GET | /api/leaderboard/:trackId | 获取赛道排行榜 |
| POST | /api/leaderboard | 提交分数 |
| GET | /api/player/:id | 获取玩家数据 |
| PUT | /api/player/:id | 更新玩家数据 |
| GET | /api/config/characters | 获取角色配置 |
| GET | /api/config/tracks | 获取赛道配置 |

### 数据模型

```typescript
// 玩家模型
interface Player {
  id: string;
  nickname: string;
  avatarUrl?: string;
  coins: number;
  unlockedCharacters: string[];
  achievements: string[];
  highScores: Record<string, number>;
  createdAt: Date;
  lastLoginAt: Date;
}

// 排行榜记录
interface LeaderboardEntry {
  id: string;
  playerId: string;
  playerName: string;
  trackId: string;
  score: number;
  characterUsed: string;
  createdAt: Date;
}
```

---

## 资源加载系统

```typescript
class AssetLoader {
  private cache: Map<string, HTMLImageElement | AudioBuffer>;
  private loadQueue: Promise<void>[] = [];
  
  async loadImage(path: string): Promise<HTMLImageElement> {
    if (this.cache.has(path)) {
      return this.cache.get(path) as HTMLImageElement;
    }
    
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        this.cache.set(path, img);
        resolve(img);
      };
      img.onerror = reject;
      img.src = path;
    });
  }
  
  async loadCharacter(characterId: string): Promise<void> {
    const animations = ['idle', 'run', 'jump', 'fall', 'attack', 
                        'skill1', 'skill2', 'hurt', 'death'];
    
    await Promise.all(animations.map(anim => 
      this.loadImage(`/assets/characters/${characterId}/${anim}.png`)
    ));
  }
  
  async preloadTrack(trackId: string): Promise<void> {
    await Promise.all([
      this.loadImage(`/assets/tracks/${trackId}/layer1.png`),
      this.loadImage(`/assets/tracks/${trackId}/layer2.png`),
      this.loadImage(`/assets/tracks/${trackId}/layer3.png`),
      this.loadImage(`/assets/tracks/${trackId}/layer4.png`),
    ]);
  }
}
```

---

## 性能优化策略

### 渲染优化

1. **离屏Canvas**: 预渲染静态元素
2. **对象池**: 复用子弹/粒子对象
3. **视口剔除**: 只渲染可见区域内的实体
4. **分层渲染**: 静态层缓存，只更新动态层

### 内存优化

1. **延迟加载**: 按需加载角色资源
2. **资源卸载**: 切换场景时释放不用的资源
3. **精灵图集**: 合并小图减少请求

### 代码优化

1. **requestAnimationFrame**: 使用浏览器优化的动画循环
2. **避免GC**: 复用对象，减少临时对象创建
3. **Web Workers**: 复杂计算放到后台线程

---

*技术架构设计文档完成*
