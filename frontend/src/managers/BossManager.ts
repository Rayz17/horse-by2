import Phaser from 'phaser';
import { Boss } from '../objects/Boss';
import { BossData } from '../types';
import { Grid } from '../objects/Grid';
import { BalanceConfig } from '../types';

export class BossManager {
    private scene: Phaser.Scene;
    private grid: Grid;
    private bosses: BossData[];
    private activeBoss: Boss | null = null;
    private bossFreeTurns: number = 0;
    private bossR: number = 0;
    private bossC: number = 0;
    private bossW: number = 2;
    private bossH: number = 2;
    private bossCountdown: number = 0;
    private frozenTurns = 0;
    private turnsOnField = 0;
    private enraged = false;
    private telegraphSkill: string | null = null;
    private freezeIcon: Phaser.GameObjects.Image | null = null;
    private balance: BalanceConfig['boss'];
    private spawnTurnsOverride: number | null = null;

    constructor(scene: Phaser.Scene, grid: Grid) {
        this.scene = scene;
        this.grid = grid;
        this.bosses = scene.cache.json.get('bosses');
        const balance = scene.cache.json.get('balance') as BalanceConfig | undefined;
        this.balance = balance?.boss || {
            obstacleCap: 8,
            enrageTurns: 25,
            enragedSkillInterval: 2,
            normalSkillInterval: 3,
            telegraphEnabled: true
        };
    }

    private isBossLive() {
        const boss = this.activeBoss;
        return !!(boss && boss.active && boss.scene && boss.visible && boss.alpha > 0.05);
    }

    public getOccupancy() {
        if (!this.isBossLive()) return null;
        return { r: this.bossR, c: this.bossC, w: this.bossW, h: this.bossH };
    }

    public sanitizeOccupancy() {
        if (!this.isBossLive()) {
            this.frozenTurns = 0;
            this.clearFreezeIcon();
            this.activeBoss = null;
        }
        this.grid.reconcileBoard(this.getOccupancy());
    }

    public nextTurn() {
        this.sanitizeOccupancy();
        if (!this.activeBoss) {
            this.bossFreeTurns++;
            this.checkBossSpawn();
            return;
        }

        this.turnsOnField++;
        if (this.turnsOnField >= Number(this.balance.enrageTurns)) {
            this.enraged = true;
        }

        if (this.frozenTurns > 0) {
            this.frozenTurns--;
            this.updateFreezeIcon();
            return;
        }

        if (this.telegraphSkill) {
            this.executeTelegraphedSkill();
            return;
        }

        this.bossCountdown--;
        if (this.bossCountdown <= 0) {
            if (this.balance.telegraphEnabled) {
                this.telegraphSkill = this.activeBoss!.bossData.skill.name;
                this.activeBoss!.say(`下回合：${this.telegraphSkill}`);
                this.activeBoss!.playAttack();
                this.scene.events.emit('show-toast', `⚠️ 下回合：${this.telegraphSkill}`);
                this.bossCountdown = 1;
            } else {
                this.releaseBossSkill();
            }
        }
    }

    private executeTelegraphedSkill() {
        this.releaseBossSkill();
        this.telegraphSkill = null;
    }

    private releaseBossSkill() {
        if (!this.activeBoss) return;
        const data = this.activeBoss.bossData;
        this.activeBoss.say(data.dialogue.skill);
        this.executeBossSkill(data.skill.id);
        const interval = this.enraged ? Number(this.balance.enragedSkillInterval) : Number(this.balance.normalSkillInterval);
        this.bossCountdown = interval;
    }

    public setSpawnTurnsOverride(turns: number | null) {
        this.spawnTurnsOverride = turns;
    }

    public advanceSpawnClock(turns: number) {
        this.bossFreeTurns += Math.max(0, turns);
        this.checkBossSpawn();
    }

    public forceSpawnBoss(bossId: string, at?: { r: number; c: number }) {
        const bossData = this.bosses.find(b => b.id === bossId);
        if (bossData) {
            this.bossFreeTurns = 0;
            if (this.activeBoss) this.handleBossDefeat(false);
            this.spawnBoss(bossData, at);
        }
    }

    private checkBossSpawn() {
        if (this.activeBoss) return;
        const phase = this.grid.getEndgamePhase();
        const balance = this.scene.cache.json.get('balance') as BalanceConfig | undefined;
        const spawnTurns = this.spawnTurnsOverride ?? (phase === 'normal'
            ? (balance?.bossSpawnTurnsNormal ?? 30)
            : (balance?.bossSpawnTurnsEndgame ?? 20));

        if (this.bossFreeTurns < spawnTurns) return;
        this.bossFreeTurns = 0;
        const maxLevel = this.grid.getMaxLevel();
        if (maxLevel <= 0) return;

        let bossId = 'fire_monkey';
        if (maxLevel >= 91) bossId = 'chaos_void';
        else if (maxLevel >= 76) bossId = 'frost_wyrm';
        else if (maxLevel >= 61) bossId = 'shadow_assassin';
        else if (maxLevel >= 46) bossId = 'lava_beast';
        else if (maxLevel >= 31) bossId = 'stone_golem';
        else if (maxLevel >= 16) bossId = 'miasma_bat';

        const bossData = this.bosses.find(b => b.id === bossId);
        if (bossData) this.spawnBoss(bossData);
    }

    private spawnBoss(data: BossData, at?: { r: number; c: number }) {
        this.grid.clearBossOccupancyKeepingObstacles();
        const area = at && this.grid.canPlaceBoss(at.r, at.c) ? at : this.grid.getLowest2x2Area();
        this.bossR = area.r;
        this.bossC = area.c;
        this.bossCountdown = this.enraged ? Number(this.balance.enragedSkillInterval) : Number(this.balance.normalSkillInterval);
        this.turnsOnField = 0;
        this.enraged = false;
        this.telegraphSkill = null;

        this.grid.blockTiles(this.bossR, this.bossC, this.bossW, this.bossH);
        this.grid.refreshBlockedMarkers();
        const p1 = this.grid.getPixel(this.bossR, this.bossC);
        const p2 = this.grid.getPixel(this.bossR + this.bossH - 1, this.bossC + this.bossW - 1);
        const centerX = (p1.x + p2.x) / 2;
        const centerY = (p1.y + p2.y) / 2;

        this.activeBoss = new Boss(this.scene, centerX, -200, data);
        this.activeBoss.say(data.dialogue.spawn);
        this.scene.tweens.add({ targets: this.activeBoss, y: centerY, duration: 1000, ease: 'Bounce' });
        this.scene.events.emit('show-toast', `⚠️ 警告：${data.name} 降临！`);
        this.scene.events.emit('boss-spawned', data);
        if (data.weakness?.length) this.grid.setProtectedIds(data.weakness);
    }

    private executeBossSkill(skillId: string) {
        if (!this.activeBoss) return;
        this.activeBoss.playAttack();
        const obstacleCount = this.grid.getBossObstacleCount();
        const cap = Number(this.balance.obstacleCap ?? 8);

        switch (skillId) {
            case 'fire_patch':
                if (obstacleCount >= cap) this.penaltyWhenCapped();
                else {
                    this.scene.events.emit('show-toast', 'Boss使用了乱扔火把！🔥');
                    this.grid.applyBossSkill('fire', 2);
                }
                break;
            case 'miasma_steal':
                this.scene.events.emit('show-toast', 'Boss使用了毒雾掠夺！💨');
                this.scene.events.emit('boss-steal-gold', 500);
                if (obstacleCount < cap) this.grid.applyBossSkill('poison', 2);
                else this.penaltyWhenCapped();
                break;
            case 'stone_wall':
                if (obstacleCount >= cap) this.penaltyWhenCapped();
                else {
                    this.scene.events.emit('show-toast', 'Boss使用了石墙防御！🪨');
                    this.grid.applyBossSkill('stone', 2);
                }
                break;
            case 'magma_floor':
                if (obstacleCount >= cap) this.penaltyWhenCapped();
                else {
                    this.scene.events.emit('show-toast', 'Boss使用了熔岩地核！🌋');
                    this.grid.applyBossSkill('magma', 3);
                }
                break;
            case 'shadow_clone':
                this.scene.events.emit('show-toast', 'Boss召唤了暗影复制体！👥');
                this.grid.applyBossSkill('shadow_clone', 1);
                break;
            case 'blizzard_freeze':
                if (obstacleCount >= cap) this.penaltyWhenCapped();
                else {
                    this.scene.events.emit('show-toast', 'Boss使用了暴雪冰封！🥶');
                    this.grid.applyBossSkill('freeze', 3);
                }
                this.activeBoss.setInvincible(true);
                break;
            case 'devour_grid':
                if (obstacleCount >= cap) this.penaltyWhenCapped();
                else {
                    this.scene.events.emit('show-toast', 'Boss使用了吞噬星空！🌌');
                    this.grid.applyBossSkill('devour', 1);
                }
                break;
        }
    }

    private penaltyWhenCapped() {
        this.scene.events.emit('boss-steal-gold', 200);
        this.scene.events.emit('show-toast', 'Boss障碍已满，改为掠夺金币！');
    }

    public onMerge(char: { level: number; id: string }) {
        if (!this.activeBoss) return;
        let damage = char.level * 10;
        if (this.activeBoss.bossData.weakness.includes(char.id)) {
            damage *= 3;
            this.activeBoss.say(this.activeBoss.bossData.dialogue.weakness_hit);
            const p = this.grid.getPixel(this.bossR, this.bossC);
            this.showFloatingText(p.x, p.y, 'CRITICAL HIT!');
        }
        this.takeDamage(damage);
    }

    public getActiveBoss(): Boss | null {
        return this.activeBoss;
    }

    public getCurrentBossMaxHp(): number {
        return this.activeBoss?.bossData.maxHp ?? this.activeBoss?.bossData.hp ?? 0;
    }

    public freeze(turns: number) {
        this.frozenTurns = Math.max(this.frozenTurns, turns);
        this.updateFreezeIcon();
    }

    public cancelTelegraph() {
        this.telegraphSkill = null;
    }

    public isEnraged() {
        return this.enraged;
    }

    public getTelegraphSkill() {
        return this.telegraphSkill;
    }

    private freezeIconSize() {
        return Math.round(Math.max(this.grid.getTileSize() * 1.2, 104));
    }

    private clearFreezeIcon() {
        if (this.freezeIcon) {
            this.freezeIcon.destroy();
            this.freezeIcon = null;
        }
    }

    private updateFreezeIcon() {
        if (!this.isBossLive() || this.frozenTurns <= 0) {
            this.clearFreezeIcon();
            return;
        }
        if (!this.scene.textures.exists('icon_freeze')) return;

        const boss = this.activeBoss!;
        const size = this.freezeIconSize();
        const offsetY = -this.grid.getTileSize() * 0.12;
        if (!this.freezeIcon || !this.freezeIcon.active) {
            this.freezeIcon = this.scene.add.image(0, offsetY, 'icon_freeze')
                .setOrigin(0.5)
                .setDisplaySize(size, size);
            boss.add(this.freezeIcon);
        } else {
            this.freezeIcon.setDisplaySize(size, size);
            this.freezeIcon.setPosition(0, offsetY);
            if (this.freezeIcon.parentContainer !== boss) {
                boss.add(this.freezeIcon);
            }
        }
    }

    public takeDamage(damage: number) {
        if (this.activeBoss && damage > 0) {
            const isDead = this.activeBoss.takeDamage(damage);
            if (isDead) this.handleBossDefeat(true);
        }
    }

    private showFloatingText(x: number, y: number, text: string) {
        const t = this.scene.add.text(x, y, text, {
            fontFamily: 'Arial Black', fontSize: 32, color: '#ff0000', stroke: '#ffffff', strokeThickness: 4
        }).setOrigin(0.5).setDepth(2000);
        this.scene.tweens.add({ targets: t, y: y - 100, alpha: 0, duration: 1000, onComplete: () => t.destroy() });
    }

    private handleBossDefeat(emitReward: boolean) {
        if (!this.activeBoss) return;
        const bossData = this.activeBoss.bossData;
        this.grid.unblockTiles(this.bossR, this.bossC, this.bossW, this.bossH);
        this.grid.clearBossEffects();
        this.grid.refreshBlockedMarkers();
        this.grid.unfreezeAll();
        this.grid.setProtectedIds([]);
        const boss = this.activeBoss;
        this.activeBoss = null;
        this.frozenTurns = 0;
        this.telegraphSkill = null;
        this.clearFreezeIcon();
        this.scene.tweens.add({
            targets: boss,
            alpha: 0,
            scale: 0,
            duration: 500,
            onComplete: () => boss.destroy()
        });
        if (emitReward) this.scene.events.emit('boss-defeated', bossData);
    }

    public exportState() {
        if (!this.activeBoss) return null;
        return {
            id: this.activeBoss.bossData.id,
            hp: this.activeBoss.hp,
            turns: this.bossCountdown,
            frozenTurns: this.frozenTurns,
            enraged: this.enraged,
            telegraphSkill: this.telegraphSkill || undefined,
            obstacleCount: this.grid.getBossObstacleCount(),
            r: this.bossR,
            c: this.bossC
        };
    }

    public restoreState(state: {
        id: string;
        hp: number;
        turns: number;
        frozenTurns: number;
        enraged: boolean;
        telegraphSkill?: string;
        r?: number;
        c?: number;
    }) {
        const savedAt = (state.r != null && state.c != null && this.grid.canPlaceBoss(state.r, state.c))
            ? { r: state.r, c: state.c }
            : this.grid.inferBossOccupancy() || undefined;
        this.forceSpawnBoss(state.id, savedAt);
        if (this.activeBoss) {
            this.activeBoss.hp = state.hp;
            this.bossCountdown = state.turns;
            this.frozenTurns = state.frozenTurns;
            this.enraged = state.enraged;
            this.telegraphSkill = state.telegraphSkill || null;
            this.updateFreezeIcon();
        }
    }
}
