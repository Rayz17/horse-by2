import Phaser from 'phaser';
import { Character, Item } from '../types';
import { colorToCss, contrastOn, getLevelAccent, getTierColor } from '../utils/style';
import { CharacterAssetLoader } from '../managers/CharacterAssetLoader';
import { fitSpriteVisual } from '../utils/spriteFit';
import { burstParticles, isUsablePortrait, portraitOrPlaceholder } from '../utils/vfx';

export class Tile extends Phaser.GameObjects.Container {
    public row: number;
    public col: number;
    public character: Character | null = null;
    public item: Item | null = null;
    public isMerging: boolean = false;
    public toBeDestroyed: boolean = false;
    public skillUsed: boolean = false;
    public isFrozen: boolean = false;
    public isShadowClone: boolean = false;

    private bg: Phaser.GameObjects.Rectangle;
    private sprite: Phaser.GameObjects.Sprite;
    private textName: Phaser.GameObjects.Text;
    private textLv: Phaser.GameObjects.Text;
    private routeTag: Phaser.GameObjects.Text;
    private freezeOverlay: Phaser.GameObjects.Rectangle;
    private readonly cellSize: number;

    constructor(scene: Phaser.Scene, row: number, col: number, size: number, data: Character | Item, type: 'character' | 'item') {
        super(scene, 0, 0);
        this.row = row;
        this.col = col;
        this.cellSize = size;
        
        if (type === 'character') this.character = data as Character;
        else this.item = data as Item;

        this.setSize(size, size);

        // Background
        const color = type === 'character' 
            ? getTierColor((data as Character).tier)
            : 0xcccccc; // Item color

        this.bg = scene.add.rectangle(0, 0, size - 6, size - 6, color, 1).setOrigin(0.5);
        this.bg.setStrokeStyle(1, 0xffffff, 0.35);
        this.add(this.bg);

        const texKey = portraitOrPlaceholder(scene, data.id);
        this.sprite = scene.add.sprite(0, 0, texKey).setOrigin(0.5);
        this.add(this.sprite);

        // Text (Name) - Optional: Hide if sprite is clear, or keep for clarity
        // Let's keep it smaller at bottom or top
        this.textName = scene.add.text(0, size / 2 - 16, data.name, {
            fontFamily: 'Arial',
            fontSize: '12px',
            color: '#ffffff',
            align: 'center',
            wordWrap: { width: size - 8 },
            stroke: '#000000',
            strokeThickness: 3
        }).setOrigin(0.5);
        this.textName.setVisible(!isUsablePortrait(scene, data.id));
        this.add(this.textName);
        this.updateSprite(data.id);

        // Text (Level or Item Icon)
        const label = type === 'character' ? `Lv.${(data as Character).level}` : '道';
        this.textLv = scene.add.text(-size / 2 + 6, -size / 2 + 6, label, {
            fontSize: '12px',
            color: '#111111',
            backgroundColor: '#ffd700',
            padding: { x: 3, y: 1 }
        }).setOrigin(0, 0);
        this.add(this.textLv);
        this.routeTag = scene.add.text(size / 2 - 6, -size / 2 + 6, '', {
            fontFamily: 'Arial Black',
            fontSize: '11px',
            color: '#111111',
            backgroundColor: '#ffd24a',
            padding: { x: 3, y: 1 }
        }).setOrigin(1, 0).setVisible(false);
        this.add(this.routeTag);
        this.refreshLevelChip();
        this.setMergeHint('none');

        // Freeze Overlay
        this.freezeOverlay = scene.add.rectangle(0, 0, size - 6, size - 6, 0x0088ff, 0.4).setOrigin(0.5);
        this.freezeOverlay.setStrokeStyle(4, 0x00aaff);
        this.freezeOverlay.setVisible(false);
        this.add(this.freezeOverlay);
        this.bringToTop(this.textLv);
        this.bringToTop(this.routeTag);

        scene.add.existing(this);
    }

    public refreshLevelChip() {
        if (this.isShadowClone) return;
        if (!this.character) {
            this.textLv.setText(this.item ? '道' : '');
            this.textLv.setColor('#111111');
            this.textLv.setBackgroundColor('#cccccc');
            return;
        }
        const accent = getLevelAccent(this.character.level);
        this.textLv.setText(`Lv.${this.character.level}`);
        this.textLv.setColor(contrastOn(accent));
        this.textLv.setBackgroundColor(colorToCss(accent));
    }

    public setMergeHint(kind: 'none' | 'focus' | 'next', extra?: { nextLevel?: number }) {
        if (!this.routeTag) return;
        if (!this.character || this.isFrozen) {
            this.bg.setStrokeStyle(1, 0xffffff, 0.35);
            this.routeTag.setVisible(false);
            return;
        }
        if (kind === 'next') {
            this.bg.setStrokeStyle(3, 0xffd24a, 0.95);
            this.routeTag.setText('下一');
            this.routeTag.setBackgroundColor('#ffd24a');
            this.routeTag.setColor('#111111');
            this.routeTag.setVisible(true);
            return;
        }
        if (kind === 'focus' && extra?.nextLevel) {
            this.bg.setStrokeStyle(2, 0xffffff, 0.45);
            this.routeTag.setText(`→${extra.nextLevel}`);
            this.routeTag.setBackgroundColor('#111111');
            this.routeTag.setColor('#ffd24a');
            this.routeTag.setVisible(true);
            return;
        }
        this.bg.setStrokeStyle(1, 0xffffff, 0.35);
        this.routeTag.setVisible(false);
    }

    public setFrozen(frozen: boolean) {
        this.isFrozen = frozen;
        this.freezeOverlay.setVisible(frozen);
    }

    public markShadowClone() {
        this.isShadowClone = true;
        this.setFrozen(true);
        this.setTint(0x3344aa);
        this.textLv.setText('影');
        this.textLv.setBackgroundColor('#6688ff');
    }

    public setTint(color: number) {
        this.sprite.setTint(color);
    }

    public markSkillUsed() {
        this.skillUsed = true;
        this.sprite.setTint(0x888888);
    }

    public updatePosition(x: number, y: number) {
        this.setPosition(x, y);
    }

    public upgrade(newData: Character | Item, type: 'character' | 'item', playActionEffect: boolean = true) {
        // Reset skill state on upgrade
        this.skillUsed = false;
        this.isShadowClone = false;
        this.sprite.clearTint();

        if (type === 'character') {
            const char = newData as Character;
            this.character = char;
            this.item = null;
            this.textName.setText(this.character.name);
            this.textName.setVisible(!isUsablePortrait(this.scene, char.id));
            this.bg.setFillStyle(getTierColor(this.character.tier));
            this.refreshLevelChip();
            
            this.updateSprite(char.id);
            CharacterAssetLoader.ensureCharacter(this.scene, char, () => {
                if (this.active) this.refreshSprite();
            });

            // Trigger Juice Effects
            this.playMergeEffect(char.tier);
            if (playActionEffect) {
                this.playAction();
            }
        } else {
            this.item = newData as Item;
            this.character = null;
            this.textName.setText(this.item.name);
            this.textLv.setText('ITEM');
            this.bg.setFillStyle(0xcccccc);
            
            // Update Sprite
            this.updateSprite(this.item.id);

            // Item spawn effect
            this.scene.tweens.add({
                targets: this,
                scaleX: 1.2,
                scaleY: 1.2,
                duration: 100,
                yoyo: true
            });
        }
    }

    public refreshSprite() {
        if (this.character) this.updateSprite(this.character.id);
        else if (this.item) this.updateSprite(this.item.id);
    }

    public repairPortrait() {
        if (!this.active || !this.sprite) return;
        const key = this.sprite.texture?.key;
        if (!isUsablePortrait(this.scene, key) || !this.sprite.visible) {
            this.refreshSprite();
        }
    }

    public ensureNormalScale() {
        if (!this.active || this.toBeDestroyed) return;
        this.setVisible(true);
        this.setAlpha(1);
        if (!this.scene.tweens.isTweening(this)) this.setScale(1);
        this.sprite.clearMask(true);
        this.refreshSprite();
    }

    private updateSprite(textureKey: string) {
        // Board rest pose always uses the processed portrait so the same
        // character cannot spawn on the bright cutout vs the darker action frame.
        if (isUsablePortrait(this.scene, textureKey)) {
            this.sprite.stop();
            this.sprite.setTexture(textureKey);
            this.applyRestTint();
            this.sprite.setVisible(true);
            this.fitSpriteToCell();
            if (this.textName) this.textName.setVisible(false);
            return;
        }

        this.sprite.setTexture(portraitOrPlaceholder(this.scene, textureKey));
        this.sprite.setVisible(false);
        if (this.textName) this.textName.setVisible(true);
    }

    private applyRestTint() {
        if (this.skillUsed) this.sprite.setTint(0x888888);
        else if (this.isShadowClone) this.sprite.setTint(0x3344aa);
        else this.sprite.clearTint();
    }

    public playIdle() {
        if (!this.active || !this.character || !this.sprite) return;
        this.scene.tweens.killTweensOf(this.sprite);
        this.sprite.setAlpha(1);
        this.fitSpriteToCell();
        const base = this.sprite.scaleX;
        this.scene.tweens.add({
            targets: this.sprite,
            scaleX: base * 1.05,
            scaleY: base * 1.05,
            yoyo: true,
            repeat: -1,
            duration: 800,
            ease: 'Sine.easeInOut'
        });
    }

    public stopIdle() {
        if (!this.active || !this.character || !this.sprite?.anims) return;
        this.sprite.stop();
        this.scene.tweens.killTweensOf(this.sprite);
        this.sprite.setAlpha(1);
        this.updateSprite(this.character.id);
    }

    public playAction() {
        if (!this.character || !this.sprite.visible) return;
        const actionAnimKey = `${this.character.id}_action`;

        // Use Game scene's overlay method if animation exists
        if (this.scene.anims.exists(actionAnimKey)) {
            // We can assume scene is Game type, or cast it
            // @ts-ignore - Assuming scene has this method
            if (typeof this.scene.playActionAnimation === 'function') {
                 // @ts-ignore
                this.scene.playActionAnimation(this.x, this.y, this.character.id);
            }
            
            // Temporary hide local sprite to avoid overlap?
            // Actually, overlay is better if base sprite is still there? 
            // Or maybe hide it to show full action?
            // Let's hide it for duration of action (approx 1s)
            
            // Duration calculation: Animation + Hold + Fade
            // Animation ~300ms, Hold ~300ms, Fade ~300ms => ~900ms
            const duration = 900; 
            
            this.sprite.setVisible(false);
            this.scene.time.delayedCall(duration, () => {
                if (!this.active) return;
                this.sprite.setVisible(true);
                // Reset to base texture to avoid sticking to last frame of action
                if (this.character) {
                    this.updateSprite(this.character.id);
                }
                
                // Resume idle ONLY if selected
                const gameScene = this.scene as any;
                const isSelected = gameScene.grid && gameScene.grid.getSelectedTile && gameScene.grid.getSelectedTile() === this;

                if (isSelected && this.character && this.scene.anims.exists(`${this.character.id}_idle`)) {
                     this.playIdle();
                } else {
                     this.stopIdle();
                }
            });
            
        } else {
            // Fallback: Jump Tween
            const originalY = this.sprite.y;
            this.scene.tweens.add({
                targets: this.sprite,
                y: originalY - 10,
                duration: 100,
                yoyo: true,
                repeat: 1,
                onComplete: () => {
                    this.sprite.setY(originalY); // Ensure it resets exactly
                }
            });
        }
    }

    private fitSpriteToCell() {
        fitSpriteVisual(
            this.scene,
            this.sprite,
            this.cellSize,
            this.character?.id
        );
    }

    private playMergeEffect(tier: number) {
        this.setScale(1);
        this.scene.tweens.add({
            targets: this,
            scaleX: 1.18,
            scaleY: 0.88,
            duration: 70,
            yoyo: true,
            onComplete: () => {
                if (this.active) this.setScale(1);
            }
        });

        burstParticles(this.scene, this.x, this.y, 'flare', {
            speed: { min: 50, max: 150 },
            scale: { start: 0.5, end: 0 },
            lifespan: 500,
            blendMode: 'ADD',
            quantity: Math.min(12, tier * 4)
        });

        // 3. Screen Shake (High Tier only)
        if (tier >= 3) { // SR+
            this.scene.cameras.main.shake(100, tier === 3 ? 0.005 : 0.01);
        }

        // 4. Flash (SSR+)
        if (tier >= 4) {
            this.scene.cameras.main.flash(200);
        }
    }
}
