import Phaser from 'phaser';
import { BalanceConfig, SkillSetpiece } from '../types';
import { AudioManager } from './AudioManager';
import { SetpiecePlayer } from './SetpiecePlayer';

export class GameFeel {
    private comboCount = 0;
    private milestoneTiers = new Set<number>();

    constructor(
        private scene: Phaser.Scene,
        private balance: BalanceConfig['feel'],
        private audio: AudioManager
    ) {}

    resetCombo() {
        this.comboCount = 0;
    }

    onMerge(scoreBase: number, x: number, y: number, isCritical: boolean, mergeIndexInTurn: number, extraMult = 1, pairLabel = false): number {
        if (mergeIndexInTurn > 0) {
            this.comboCount = mergeIndexInTurn + 1;
        } else {
            this.comboCount = 1;
        }

        const step = Number(this.balance.comboMultiplierStep ?? 0.25);
        const cap = Number(this.balance.comboMultiplierCap ?? 3);
        const mult = this.balance.comboEnabled
            ? Math.min(cap, 1 + step * (this.comboCount - 1))
            : 1;
        const score = Math.floor(scoreBase * mult * extraMult);

        if (this.balance.floatingScoreEnabled) {
            this.spawnFloatingScore(x, y, score, isCritical, pairLabel);
        }

        if (this.balance.squashStretchEnabled) {
            // handled by tile
        }

        if (isCritical) {
            this.audio.play('critical');
            if (this.balance.vibrateEnabled) navigator.vibrate?.(40);
            this.scene.cameras.main.shake(80, 0.004);
        } else {
            this.audio.play('merge');
            if (this.balance.vibrateEnabled) navigator.vibrate?.(15);
        }

        if (this.comboCount >= 2) {
            this.scene.events.emit('combo-display', this.comboCount);
            this.audio.play('combo', 1 + 0.06 * this.comboCount);
        }

        return score;
    }

    playSetpiece(req: SkillSetpiece, onImpact: () => void): Promise<void> {
        return new SetpiecePlayer(this.scene, this.audio).play(req, onImpact);
    }

    playQuip(name: string, line: string, textureKey: string | undefined, onImpact: () => void): Promise<void> {
        return new SetpiecePlayer(this.scene, this.audio).playQuip({
            id: 'quip',
            stamp: line,
            casterName: name,
            textureKey,
            cells: []
        }, onImpact);
    }

    maybeMilestone(tier: number, level: number) {
        if (!this.balance.milestoneSlowMoEnabled) return;
        const key = tier * 100 + level;
        if (this.milestoneTiers.has(key)) return;
        this.milestoneTiers.add(key);
        const prev = this.scene.time.timeScale;
        this.scene.time.timeScale = Number(this.balance.milestoneSlowMoScale ?? 0.3);
        this.scene.cameras.main.zoomTo(Number(this.balance.milestoneZoom ?? 1.06), 200);
        this.scene.time.delayedCall(Number(this.balance.milestoneSlowMoMs ?? 400), () => {
            this.scene.time.timeScale = prev;
            this.scene.cameras.main.zoomTo(1, 200);
        });
        this.audio.play('milestone');
    }

    private spawnFloatingScore(x: number, y: number, score: number, critical: boolean, pairLabel = false) {
        const t = this.scene.add.text(x, y, this.comboCount >= 2 ? `+${score} ×${this.comboCount}` : `+${score}`, {
            fontFamily: 'Arial Black',
            fontSize: critical ? 36 : 24,
            color: critical ? '#ffd700' : '#ffffff',
            stroke: '#000000',
            strokeThickness: 4
        }).setOrigin(0.5).setDepth(1500);
        this.scene.tweens.add({
            targets: t,
            y: y - 48,
            alpha: 0,
            duration: 700,
            onComplete: () => t.destroy()
        });
        if (pairLabel) {
            const pair = this.scene.add.text(x, y + 22, '成双', {
                fontFamily: 'Arial Black', fontSize: 20, color: '#ff99cc',
                stroke: '#000000', strokeThickness: 4
            }).setOrigin(0.5).setDepth(1500);
            this.scene.tweens.add({
                targets: pair,
                y: y - 20,
                alpha: 0,
                duration: 700,
                onComplete: () => pair.destroy()
            });
        }
    }
}
