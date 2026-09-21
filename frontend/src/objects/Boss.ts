import Phaser from 'phaser';
import { BossData } from '../types';

export class Boss extends Phaser.GameObjects.Container {
    public bossData: BossData;
    private currentHp: number;
    
    private sprite: Phaser.GameObjects.Sprite; // Now using Sprite
    private bg: Phaser.GameObjects.Rectangle; // Optional BG for highlight
    private hpBar: Phaser.GameObjects.Rectangle;
    private hpBg: Phaser.GameObjects.Rectangle;
    private dialogueBox: Phaser.GameObjects.Container;
    private dialogueText: Phaser.GameObjects.Text;

    constructor(scene: Phaser.Scene, x: number, y: number, data: BossData) {
        super(scene, x, y);
        this.bossData = data;
        this.currentHp = data.hp;

        // Boss Visual (Sprite)
        // Background Highlight (Aura)
        this.bg = scene.add.rectangle(0, 0, this.getBoxSize(), this.getBoxSize(), 0x000000, 0).setOrigin(0.5);
        this.add(this.bg);

        const staticTextureKey = scene.textures.exists(`${data.id}_anim_sheet`) ? `${data.id}_anim_sheet` : data.id;
        this.sprite = scene.add.sprite(0, 0, staticTextureKey).setOrigin(0.5);

        const box = this.getBoxSize();
        const targetSize = box - 24;
        if (scene.textures.exists(staticTextureKey)) {
             const contentSize = scene.registry.get(`${data.id}_action_size`);
             const refH = contentSize ? contentSize.h : Math.max(this.sprite.width, this.sprite.height);
             this.sprite.setScale(targetSize / Math.max(1, refH));
        } else {
             this.sprite.setVisible(false);
             const fallback = scene.add.rectangle(0, 0, targetSize, targetSize, 0x880000).setOrigin(0.5);
             fallback.setStrokeStyle(4, 0xff0000);
             this.add(fallback);
        }
        this.add(this.sprite);

        // Interaction
        this.sprite.setInteractive({ useHandCursor: true });
        this.sprite.on('pointerdown', () => {
            const scene = this.scene as unknown as import('../types').GameSceneLike;
            scene.onBossSelected(this);
        });

        // Start Static (Frame 0) - Not Idle
        this.stopIdle();

        const nameY = box / 2 - 38;
        const hpY = box / 2 - 16;
        const nameText = scene.add.text(0, nameY, data.name, {
            fontFamily: 'Arial Black', fontSize: 18, color: '#ffffff', stroke: '#000000', strokeThickness: 4,
            wordWrap: { width: box - 12 }, align: 'center'
        }).setOrigin(0.5);
        this.add(nameText);

        this.hpBg = scene.add.rectangle(0, hpY, box - 36, 10, 0x000000).setOrigin(0.5);
        this.hpBar = scene.add.rectangle(0, hpY, box - 40, 8, 0x00ff00).setOrigin(0.5);
        this.add([this.hpBg, this.hpBar]);

        this.dialogueBox = scene.add.container(0, 8);
        const bubble = scene.add.rectangle(0, 0, box - 20, 56, 0xffffff, 0.92).setOrigin(0.5, 0.5);
        bubble.setStrokeStyle(2, 0x000000);
        this.dialogueText = scene.add.text(0, 0, "", {
            fontFamily: 'Arial', fontSize: 15, color: '#000000', wordWrap: { width: box - 36 }, align: 'center'
        }).setOrigin(0.5, 0.5);
        
        this.dialogueBox.add([bubble, this.dialogueText]);
        this.dialogueBox.setVisible(false);
        this.add(this.dialogueBox);

        scene.add.existing(this);
        this.setDepth(1200);
    }

    public isInvincible: boolean = false;

    public setInvincible(value: boolean) {
        this.isInvincible = value;
        if (value) {
            this.bg.setFillStyle(0x00ffff, 0.3);
            this.bg.setStrokeStyle(4, 0x00ffff);
        } else {
            this.bg.setFillStyle(0x000000, 0);
            this.bg.setStrokeStyle(0);
        }
    }

    public get hp(): number {
        return this.currentHp;
    }

    public set hp(value: number) {
        this.currentHp = value;
        this.updateHpBar();
    }

    public takeDamage(amount: number): boolean {
        if (this.isInvincible) {
            this.say("无敌状态，不受伤害！");
            return false;
        }

        this.currentHp = Math.max(0, this.currentHp - amount);
        this.updateHpBar();
        
        // Visual Feedback
        this.scene.tweens.add({
            targets: this.sprite,
            x: { from: -5, to: 5 },
            duration: 50,
            yoyo: true,
            repeat: 3
        });

        if (this.currentHp <= 0) {
            this.say(this.bossData.dialogue.defeat);
            return true;
        } else {
            this.say(this.bossData.dialogue.hit);
            return false;
        }
    }

    private updateHpBar() {
        const percent = this.currentHp / this.bossData.maxHp;
        this.hpBar.width = Math.max(8, (this.getBoxSize() - 40) * percent);
        this.hpBar.setFillStyle(percent > 0.5 ? 0x00ff00 : (percent > 0.2 ? 0xffff00 : 0xff0000));
    }

    public playIdle() {
        // Only play idle if selected (or force it if needed)
        // For Boss, we assume 'selected' means active focus.
        const idleAnim = `${this.bossData.id}_idle`;
        if (this.scene.anims.exists(idleAnim)) {
            this.sprite.play(idleAnim);
        }
    }

    public stopIdle() {
        this.sprite.stop();
        const staticTextureKey = this.scene.textures.exists(`${this.bossData.id}_anim_sheet`)
            ? `${this.bossData.id}_anim_sheet`
            : this.bossData.id;
        this.sprite.setTexture(staticTextureKey);
        if (staticTextureKey.endsWith('_anim_sheet')) {
            this.sprite.setFrame(0);
        }

        const contentSize = this.scene.registry.get(`${this.bossData.id}_action_size`);
        const refH = contentSize ? contentSize.h : Math.max(this.sprite.width, this.sprite.height);
        this.sprite.setScale((this.getBoxSize() - 24) / Math.max(1, refH));
    }

    public playAttack() {
        const attackAnim = `${this.bossData.id}_action`; // Using _action as standard from V5/V6
        if (this.scene.anims.exists(attackAnim)) {
            this.sprite.play(attackAnim);
            this.sprite.once('animationcomplete', () => {
                this.playIdle();
            });
        } else {
            // Fallback Jump
            this.scene.tweens.add({
                targets: this.sprite,
                y: '-=18',
                duration: 200,
                yoyo: true,
                ease: 'Power2'
            });
        }
    }
    public say(text: string) {
        this.dialogueText.setText(text);
        
        // Dynamic resize
        const box = this.getBoxSize();
        const bounds = this.dialogueText.getBounds();
        const padding = 12;
        const width = Math.min(box - 16, Math.max(140, bounds.width + padding * 2));
        const height = Math.min(72, Math.max(40, bounds.height + padding * 2));
        
        // Update bubble background
        const bubble = this.dialogueBox.getAt(0) as Phaser.GameObjects.Rectangle;
        bubble.setSize(width, height);
        
        this.dialogueBox.setVisible(true);
        this.dialogueBox.setAlpha(1);
        
        // Auto hide after 3s
        this.scene.tweens.add({
            targets: this.dialogueBox,
            alpha: 0,
            delay: 2000,
            duration: 1000,
            onComplete: () => {
                this.dialogueBox.setVisible(false);
            }
        });
    }

    private getBoxSize(): number {
        const layout = (this.scene as Phaser.Scene & { layout?: { gridWidth: number } }).layout;
        return ((layout?.gridWidth ?? 664) / 6) * 2;
    }
}
