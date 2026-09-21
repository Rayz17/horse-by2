import Phaser from 'phaser';
import { SkillSetpiece } from '../types';
import { AudioManager } from './AudioManager';

export class SetpiecePlayer {
    constructor(
        private scene: Phaser.Scene,
        private audio: AudioManager
    ) {}

    play(req: SkillSetpiece, onImpact: () => void): Promise<void> {
        if (req.id === 'quip') {
            return this.playQuip(req, onImpact);
        }
        return new Promise(resolve => {
            let layer: Phaser.GameObjects.Container | null = null;
            const finish = () => {
                this.scene.cameras.main.zoomTo(1, 80);
                if (layer?.active) this.disposeLayer(layer);
                resolve();
            };
            try {
            layer = this.scene.add.container(0, 0).setDepth(4200);
            const cam = this.scene.cameras.main;
            const dim = this.rect(layer, 360, 640, 720, 1280, 0x000000, 0);
            const barTop = this.rect(layer, 360, -40, 720, 80, 0x000000, 1);
            const barBot = this.rect(layer, 360, 1320, 720, 80, 0x000000, 1);

            const brief = !!req.brief;
            const startZoom = cam.zoom;
            this.scene.tweens.add({ targets: dim, alpha: brief ? 0.35 : 0.55, duration: brief ? 80 : 180 });
            this.scene.tweens.add({ targets: barTop, y: 40, duration: brief ? 90 : 200, ease: 'Cubic.easeOut' });
            this.scene.tweens.add({ targets: barBot, y: 1240, duration: brief ? 90 : 200, ease: 'Cubic.easeOut' });
            cam.zoomTo(Math.min(brief ? 1.04 : 1.08, startZoom + (brief ? 0.03 : 0.06)), brief ? 120 : 220);
            this.audio.play('skill');

            const later = (ms: number, fn: () => void) => {
                this.scene.time.delayedCall(ms, () => {
                    if (!layer?.active) return;
                    try { fn(); } catch (err) { console.error(err); }
                });
            };

            later(brief ? 80 : 220, () => this.playGag(layer!, req));
            later(brief ? 280 : 780, () => {
                cam.shake(brief ? 140 : 220, brief ? 0.008 : 0.012);
                onImpact();
            });
            later(brief ? 480 : 1080, () => this.stamp(layer!, req.stamp));
            later(brief ? 700 : 1580, () => {
                this.scene.tweens.add({ targets: dim, alpha: 0, duration: brief ? 100 : 180 });
                this.scene.tweens.add({ targets: barTop, y: -40, duration: brief ? 100 : 180 });
                this.scene.tweens.add({ targets: barBot, y: 1320, duration: brief ? 100 : 180 });
                cam.zoomTo(1, brief ? 120 : 200);
            });
            this.scene.time.delayedCall(brief ? 880 : 1760, finish);
            } catch (err) {
                console.error(err);
                try { onImpact(); } catch { /* board change still attempted */ }
                finish();
            }
        });
    }

    private playGag(layer: Phaser.GameObjects.Container, req: SkillSetpiece) {
        switch (req.id) {
            case 'dacha': this.gagDacha(layer, req); break;
            case 'overtime': this.gagOvertime(layer); break;
            case 'pollute': this.gagPollute(layer); break;
            case 'debug': this.gagDebug(layer, req); break;
            case 'censor': this.gagCensor(layer); break;
            case 'paint': this.gagPaint(layer, req); break;
            case 'derby': this.gagDerby(layer, req); break;
            case 'giants': this.gagGiants(layer); break;
            case 'cosmic': this.gagCosmic(layer); break;
            case 'cannon': this.gagCannon(layer, req); break;
            case 'zankanto': this.gagZankanto(layer, req); break;
            case 'sekiba': this.gagSekiba(layer, req); break;
            case 'meteor': this.gagMeteor(layer, req); break;
            case 'upgrade': this.gagUpgrade(layer, req); break;
            case 'bomb': this.gagBomb(layer); break;
            case 'snipe': this.gagSnipe(layer, req); break;
            case 'freeze': this.gagFreeze(layer); break;
            case 'summon': this.gagSummon(layer, req); break;
            case 'economy': this.gagEconomy(layer); break;
            case 'clear': this.gagClear(layer); break;
            case 'shuffle': this.gagShuffle(layer); break;
            case 'heal': this.gagHeal(layer); break;
            case 'transform': this.gagTransform(layer, req); break;
            case 'quip': break;
        }
    }

    playQuip(req: SkillSetpiece, onImpact: () => void): Promise<void> {
        return new Promise(resolve => {
            let layer: Phaser.GameObjects.Container | null = null;
            const finish = () => {
                if (layer?.active) this.disposeLayer(layer);
                resolve();
            };
            try {
                layer = this.scene.add.container(0, 0).setDepth(4200);
                this.rect(layer, 360, 118, 680, 56, 0x000000, 0.82);
                this.label(layer, 360, 118, `${req.casterName}　${req.stamp}`, {
                    fontFamily: 'Arial Black',
                    fontSize: 22,
                    color: '#ffe082',
                    stroke: '#000',
                    strokeThickness: 4
                });
                this.audio.play('skill');
                this.scene.time.delayedCall(280, () => {
                    try { onImpact(); } catch { /* board change still attempted */ }
                });
                this.scene.time.delayedCall(600, finish);
            } catch (err) {
                console.error(err);
                try { onImpact(); } catch { /* board change still attempted */ }
                finish();
            }
        });
    }

    private gagDacha(layer: Phaser.GameObjects.Container, req: SkillSetpiece) {
        const head = this.portraitOrFallback(layer, req, 360, -80, 280);
        this.scene.tweens.add({ targets: head, y: 210, duration: 360, ease: 'Back.easeOut' });

        const lines = ['马冬梅', '马什么梅', '你瞅啥呢'];
        lines.forEach((line, i) => {
            this.safeDelay(layer, 80 + i * 140, () => {
                const bubble = this.label(layer, 360, 430 + i * 54, line, {
                    fontFamily: 'Arial Black',
                    fontSize: i === 2 ? 42 : 34,
                    color: '#fff4c2',
                    stroke: '#000000',
                    strokeThickness: 6
                });
                this.scene.tweens.add({
                    targets: bubble,
                    scale: { from: 0.4, to: 1 },
                    duration: 180,
                    ease: 'Back.easeOut'
                });
            });
        });
    }

    private gagOvertime(layer: Phaser.GameObjects.Container) {
        const flash = this.rect(layer, 360, 640, 720, 1280, 0xf4f1c8, 0);
        this.scene.tweens.add({
            targets: flash,
            alpha: { from: 0, to: 0.85 },
            duration: 40,
            yoyo: true,
            repeat: 3
        });
        this.label(layer, 360, 280, '996 已读', {
            fontFamily: 'Arial Black',
            fontSize: 56,
            color: '#ffe14a',
            stroke: '#000000',
            strokeThickness: 8
        }).setAngle(-6);
        this.safeDelay(layer, 520, () => {
            const off = this.label(layer, 360, 720, '下班了', {
                fontFamily: 'Arial Black', fontSize: 40, color: '#88ff88', stroke: '#000', strokeThickness: 5
            });
            const more = this.label(layer, 360, 720, '再加半小时', {
                fontFamily: 'Arial Black', fontSize: 48, color: '#ff4444', stroke: '#000', strokeThickness: 6
            }).setScale(0.2);
            this.scene.tweens.add({
                targets: more,
                scale: 1.1,
                duration: 220,
                ease: 'Back.easeOut',
                onStart: () => { off.setAlpha(0.25); }
            });
        });
    }

    private gagPollute(layer: Phaser.GameObjects.Container) {
        this.rect(layer, 360, 640, 720, 1280, 0x1c4a2a, 0.45);
        const swirl = this.label(layer, 360, 640, 'RUA', {
            fontFamily: 'Arial Black', fontSize: 96, color: '#7cff9a', stroke: '#003311', strokeThickness: 10
        }).setAlpha(0.15);
        this.scene.tweens.add({
            targets: swirl,
            angle: 360,
            scale: { from: 0.4, to: 1.6 },
            alpha: { from: 0.15, to: 0.55 },
            duration: 520
        });
    }

    private gagDebug(layer: Phaser.GameObjects.Container, req: SkillSetpiece) {
        const term = this.rect(layer, 360, 640, 640, 720, 0x041108, 0.92);
        term.setStrokeStyle(3, 0x33ff66);
        this.label(layer, 80, 300, '> horse-os debug --force', {
            fontFamily: 'Courier New', fontSize: 22, color: '#33ff66'
        }, false);
        const logs = req.logs?.length
            ? req.logs
            : ['unfreeze --all', 'rm -rf obstacles', 'gc holes', 'optimize merge'];
        logs.forEach((line, i) => {
            this.safeDelay(layer, 70 * i, () => {
                this.label(layer, 90, 360 + i * 36, `$ ${line}`, {
                    fontFamily: 'Courier New', fontSize: 24, color: '#7dff9a'
                }, false);
            });
        });
        this.safeDelay(layer, 480, () => {
            this.scene.tweens.add({
                targets: term,
                scaleX: 1.08,
                scaleY: 0.15,
                alpha: 0.2,
                duration: 180
            });
        });
    }

    private gagCensor(layer: Phaser.GameObjects.Container) {
        for (let i = 0; i < 28; i++) {
            const x = 40 + (i % 7) * 100;
            const y = 220 + Math.floor(i / 7) * 160;
            this.rect(layer, x, y, 88, 140, Phaser.Math.Between(0x222222, 0x888888), 0.85).setOrigin(0);
        }
        const stamp = this.label(layer, 360, 640, '和谐', {
            fontFamily: 'Arial Black', fontSize: 92, color: '#ff2a2a', stroke: '#3a0000', strokeThickness: 10
        }).setAngle(-18).setScale(2).setAlpha(0);
        this.scene.tweens.add({
            targets: stamp,
            scale: 1,
            alpha: 1,
            duration: 220,
            ease: 'Back.easeOut'
        });
        this.safeDelay(layer, 500, () => {
            const snow = this.rect(layer, 360, 640, 720, 1280, 0xffffff, 0.35);
            this.scene.tweens.add({ targets: snow, alpha: 0, duration: 220 });
        });
    }

    private gagPaint(layer: Phaser.GameObjects.Container, req: SkillSetpiece) {
        const brush = this.portraitOrFallback(layer, req, -120, 360, 220);
        brush.setAngle(-25);
        this.scene.tweens.add({
            targets: brush,
            x: 860,
            y: 820,
            duration: 420,
            ease: 'Cubic.easeIn'
        });
        const ink = this.rect(layer, 360, 640, 720, 1280, 0x111111, 0);
        this.scene.tweens.add({ targets: ink, alpha: 0.45, duration: 280, delay: 160 });
        const seal = this.label(layer, 560, 980, '画', {
            fontFamily: 'Arial Black', fontSize: 72, color: '#c41a1a', stroke: '#3a0000', strokeThickness: 6
        }).setAngle(-12).setAlpha(0);
        this.scene.tweens.add({ targets: seal, alpha: 1, scale: { from: 1.6, to: 1 }, duration: 200, delay: 360 });
    }

    private gagDerby(layer: Phaser.GameObjects.Container, req: SkillSetpiece) {
        this.rect(layer, 360, 420, 520, 90, 0x6b2b12, 1);
        const nums = ['3', '2', '1'];
        nums.forEach((n, i) => {
            this.safeDelay(layer, i * 120, () => {
                const t = this.label(layer, 360, 420, n, {
                    fontFamily: 'Arial Black', fontSize: 72, color: '#fff36a', stroke: '#000', strokeThickness: 8
                });
                this.scene.tweens.add({ targets: t, scale: 2.2, alpha: 0, duration: 140 });
            });
        });
        const runner = this.portraitOrFallback(layer, req, 80, 700, 180);
        this.scene.tweens.add({
            targets: runner,
            x: 780,
            duration: 360,
            delay: 360,
            ease: 'Cubic.easeIn'
        });
        const ghost = this.rect(layer, 80, 700, 160, 40, 0xffffff, 0.35);
        this.scene.tweens.add({ targets: ghost, x: 780, alpha: 0, duration: 360, delay: 360 });
    }

    private gagGiants(layer: Phaser.GameObjects.Container) {
        const hands = [
            this.label(layer, -80, 640, '✋', { fontSize: '120px' }),
            this.label(layer, 800, 640, '✋', { fontSize: '120px' }).setFlipX(true),
            this.label(layer, 360, 80, '✋', { fontSize: '120px' }).setAngle(180)
        ];
        this.scene.tweens.add({ targets: hands[0], x: 220, duration: 280, ease: 'Back.easeOut' });
        this.scene.tweens.add({ targets: hands[1], x: 500, duration: 280, ease: 'Back.easeOut' });
        this.scene.tweens.add({ targets: hands[2], y: 280, duration: 280, ease: 'Back.easeOut' });
        this.safeDelay(layer, 360, () => {
            const box = this.rect(layer, 360, -80, 220, 160, 0xffd24a, 1);
            box.setStrokeStyle(6, 0x000000);
            const label = this.label(layer, 360, -80, '垄断', {
                fontFamily: 'Arial Black', fontSize: 40, color: '#111111'
            });
            this.scene.tweens.add({
                targets: [box, label],
                y: 640,
                duration: 280,
                ease: 'Bounce.easeOut'
            });
        });
    }

    private gagCosmic(layer: Phaser.GameObjects.Container) {
        this.rect(layer, 360, 640, 720, 1280, 0x07061a, 0.72);
        for (let i = 0; i < 18; i++) {
            const star = this.scene.add.circle(
                Phaser.Math.Between(40, 680),
                Phaser.Math.Between(80, 1200),
                Phaser.Math.Between(2, 5),
                0xffffff,
                1
            );
            layer.add(star);
            this.scene.tweens.add({
                targets: star,
                x: 360,
                y: 640,
                alpha: 0,
                duration: 420,
                delay: i * 12
            });
        }
        const gate = this.rect(layer, 360, 120, 40, 8, 0xfff3a1, 1);
        this.scene.tweens.add({
            targets: gate,
            scaleX: 10,
            scaleY: 18,
            alpha: 0.35,
            duration: 360,
            delay: 200
        });
    }

    private gagCannon(layer: Phaser.GameObjects.Container, req: SkillSetpiece) {
        this.rect(layer, 360, 640, 720, 1280, 0x0b1a2a, 0.45);
        const ship = this.portraitOrFallback(layer, req, -160, 640, 220);
        this.scene.tweens.add({ targets: ship, x: 140, duration: 220, ease: 'Cubic.easeOut' });
        const beam = this.rect(layer, -40, 640, 40, 70, 0xc8f6ff, 1);
        this.scene.tweens.add({
            targets: beam,
            x: 900,
            scaleX: 18,
            alpha: 0.15,
            duration: 420,
            ease: 'Cubic.easeIn'
        });
        this.safeDelay(layer, 180, () => {
            const flash = this.rect(layer, 360, 640, 720, 90, 0xffffff, 0.85);
            this.scene.tweens.add({ targets: flash, alpha: 0, duration: 180 });
        });
    }

    private gagZankanto(layer: Phaser.GameObjects.Container, req: SkillSetpiece) {
        this.rect(layer, 360, 640, 720, 1280, 0x1a0a0a, 0.4);
        const rider = this.portraitOrFallback(layer, req, 160, 760, 240);
        rider.setAngle(-8);
        this.scene.tweens.add({ targets: rider, x: 280, y: 600, duration: 180, ease: 'Back.easeOut' });
        const slash = this.rect(layer, -200, 200, 80, 16, 0xffffff, 1).setAngle(38);
        this.scene.tweens.add({
            targets: slash,
            x: 980,
            y: 1080,
            scaleX: 8,
            alpha: 0.2,
            duration: 280,
            ease: 'Cubic.easeIn'
        });
        this.safeDelay(layer, 200, () => {
            const after = this.rect(layer, 360, 640, 720, 18, 0xff3b3b, 0.9).setAngle(38);
            this.scene.tweens.add({ targets: after, alpha: 0, scaleY: 0.2, duration: 240 });
        });
    }

    private gagSekiba(layer: Phaser.GameObjects.Container, req: SkillSetpiece) {
        this.rect(layer, 360, 640, 720, 1280, 0x2a1600, 0.5);
        const horse = this.portraitOrFallback(layer, req, 360, 980, 280);
        this.scene.tweens.add({ targets: horse, y: 520, scale: 1.15, duration: 280, ease: 'Back.easeOut' });
        const fist = this.label(layer, 360, 120, '✊', { fontSize: '96px' });
        this.scene.tweens.add({
            targets: fist,
            y: 640,
            scale: { from: 0.4, to: 1.4 },
            duration: 260,
            ease: 'Cubic.easeIn'
        });
        this.safeDelay(layer, 240, () => {
            const burst = this.rect(layer, 360, 640, 80, 80, 0xffd24a, 0.95);
            this.scene.tweens.add({ targets: burst, scaleX: 12, scaleY: 12, alpha: 0, duration: 280 });
        });
    }

    private gagMeteor(layer: Phaser.GameObjects.Container, req: SkillSetpiece) {
        this.rect(layer, 360, 640, 720, 1280, 0x140828, 0.5);
        const hero = this.portraitOrFallback(layer, req, 360, 980, 220);
        this.scene.tweens.add({ targets: hero, y: 760, duration: 200, ease: 'Back.easeOut' });
        for (let i = 0; i < 12; i++) {
            const star = this.label(layer, 80 + (i % 6) * 110, -40, '✦', {
                fontSize: '36px', color: '#ffe9a8'
            });
            this.scene.tweens.add({
                targets: star,
                y: 720 + (i % 3) * 80,
                x: 200 + (i % 5) * 90,
                alpha: 0,
                duration: 360,
                delay: i * 18,
                ease: 'Cubic.easeIn'
            });
        }
    }

    private gagUpgrade(layer: Phaser.GameObjects.Container, req: SkillSetpiece) {
        const caster = this.portraitOrFallback(layer, req, 360, 640, 200);
        this.scene.tweens.add({
            targets: caster,
            scale: 0.15,
            alpha: 0.2,
            duration: 360,
            ease: 'Cubic.easeIn'
        });
        this.label(layer, 360, 360, '↑ ↑ ↑', {
            fontFamily: 'Arial Black', fontSize: 48, color: '#7cff9a', stroke: '#003311', strokeThickness: 6
        });
    }

    private gagBomb(layer: Phaser.GameObjects.Container) {
        const flash = this.rect(layer, 360, 640, 720, 1280, 0xff7a1a, 0);
        this.scene.tweens.add({ targets: flash, alpha: { from: 0, to: 0.7 }, duration: 50, yoyo: true, repeat: 3 });
        this.label(layer, 360, 640, '💥', { fontSize: '120px' }).setScale(0.2);
        this.scene.tweens.add({
            targets: layer.list[layer.list.length - 1],
            scale: 1.4,
            duration: 220,
            ease: 'Back.easeOut'
        });
    }

    private gagSnipe(layer: Phaser.GameObjects.Container, req: SkillSetpiece) {
        const scope = this.rect(layer, 360, 640, 180, 180, 0x000000, 0.15);
        scope.setStrokeStyle(4, 0xff3b3b);
        this.rect(layer, 360, 640, 220, 4, 0xff3b3b, 0.9);
        this.rect(layer, 360, 640, 4, 220, 0xff3b3b, 0.9);
        const head = this.portraitOrFallback(layer, req, 140, 320, 140);
        this.scene.tweens.add({ targets: [scope, head], scale: { from: 1.3, to: 1 }, duration: 220 });
    }

    private gagFreeze(layer: Phaser.GameObjects.Container) {
        this.rect(layer, 360, 640, 720, 1280, 0x7ad7ff, 0.28);
        for (let i = 0; i < 8; i++) {
            const shard = this.label(layer, 80 + i * 80, 200, '❄', { fontSize: '40px' });
            this.scene.tweens.add({
                targets: shard,
                y: 900,
                angle: 180,
                alpha: 0.2,
                duration: 420,
                delay: i * 24
            });
        }
    }

    private gagSummon(layer: Phaser.GameObjects.Container, req: SkillSetpiece) {
        const a = this.portraitOrFallback(layer, req, 220, 900, 140);
        const b = this.portraitOrFallback(layer, req, 500, 900, 140);
        [a, b].forEach((obj, i) => {
            this.scene.tweens.add({
                targets: obj,
                y: 620,
                duration: 260,
                delay: i * 60,
                ease: 'Back.easeOut'
            });
        });
    }

    private gagEconomy(layer: Phaser.GameObjects.Container) {
        for (let i = 0; i < 10; i++) {
            const coin = this.label(layer, 80 + (i % 5) * 130, 200, '💰', { fontSize: '40px' });
            this.scene.tweens.add({
                targets: coin,
                y: 900,
                angle: 120,
                duration: 380,
                delay: i * 20
            });
        }
    }

    private gagClear(layer: Phaser.GameObjects.Container) {
        const broom = this.rect(layer, -80, 640, 160, 36, 0x88ff88, 0.9);
        this.scene.tweens.add({ targets: broom, x: 860, duration: 360, ease: 'Cubic.easeIn' });
        this.rect(layer, 360, 640, 720, 1280, 0x44ff88, 0.12);
    }

    private gagShuffle(layer: Phaser.GameObjects.Container) {
        const swirl = this.label(layer, 360, 640, '↻', {
            fontFamily: 'Arial Black', fontSize: 140, color: '#fff36a', stroke: '#000', strokeThickness: 8
        });
        this.scene.tweens.add({ targets: swirl, angle: 360, scale: { from: 0.4, to: 1.2 }, duration: 420 });
    }

    private gagHeal(layer: Phaser.GameObjects.Container) {
        this.rect(layer, 360, 640, 720, 1280, 0xd8fff0, 0.25);
        this.label(layer, 360, 640, '✚', {
            fontFamily: 'Arial Black', fontSize: 120, color: '#66ffcc', stroke: '#003322', strokeThickness: 8
        });
    }

    private gagTransform(layer: Phaser.GameObjects.Container, req: SkillSetpiece) {
        const face = this.portraitOrFallback(layer, req, 360, 640, 240);
        this.scene.tweens.add({
            targets: face,
            scaleX: 0.05,
            duration: 140,
            yoyo: true,
            hold: 40
        });
        this.label(layer, 360, 360, '？→！', {
            fontFamily: 'Arial Black', fontSize: 48, color: '#ffe082', stroke: '#000', strokeThickness: 6
        });
    }

    private stamp(layer: Phaser.GameObjects.Container, text: string) {
        const seal = this.label(layer, 360, 640, text, {
            fontFamily: 'Arial Black',
            fontSize: text.length > 4 ? 52 : 68,
            color: '#d41212',
            stroke: '#3a0000',
            strokeThickness: 10
        }).setAngle(-16).setScale(1.8).setAlpha(0);
        this.scene.tweens.add({
            targets: seal,
            scale: 1,
            alpha: 1,
            duration: 180,
            ease: 'Back.easeOut'
        });
    }

    private safeDelay(layer: Phaser.GameObjects.Container, ms: number, fn: () => void) {
        this.scene.time.delayedCall(ms, () => {
            if (!layer.active) return;
            fn();
        });
    }

    private disposeLayer(layer: Phaser.GameObjects.Container) {
        if (!layer.active) return;
        for (const child of layer.getAll()) {
            this.scene.tweens.killTweensOf(child);
        }
        this.scene.tweens.killTweensOf(layer);
        layer.destroy(true);
    }

    private rect(
        layer: Phaser.GameObjects.Container,
        x: number,
        y: number,
        w: number,
        h: number,
        color: number,
        alpha: number
    ) {
        const obj = this.scene.add.rectangle(x, y, w, h, color, alpha).setOrigin(0.5);
        layer.add(obj);
        return obj;
    }

    private label(
        layer: Phaser.GameObjects.Container,
        x: number,
        y: number,
        text: string,
        style: Phaser.Types.GameObjects.Text.TextStyle,
        centered = true
    ) {
        const obj = this.scene.add.text(x, y, text, style);
        if (centered) obj.setOrigin(0.5);
        layer.add(obj);
        return obj;
    }

    private portraitOrFallback(
        layer: Phaser.GameObjects.Container,
        req: SkillSetpiece,
        x: number,
        y: number,
        size: number
    ): Phaser.GameObjects.Image | Phaser.GameObjects.Text {
        const key = req.textureKey && this.scene.textures.exists(req.textureKey) ? req.textureKey : '';
        if (key) {
            const img = this.scene.add.image(x, y, key);
            const src = img.texture?.getSourceImage?.() as { width?: number; height?: number } | undefined;
            const w = Math.max(1, src?.width || img.width || size);
            const h = Math.max(1, src?.height || img.height || size);
            img.setScale(size / Math.max(w, h));
            layer.add(img);
            return img;
        }
        return this.label(layer, x, y, req.casterName.slice(0, 2), {
            fontFamily: 'Arial Black',
            fontSize: Math.floor(size * 0.42),
            color: '#ffe9a8',
            stroke: '#000',
            strokeThickness: 6
        });
    }
}
