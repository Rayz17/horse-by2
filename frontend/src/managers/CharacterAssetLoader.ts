import Phaser from 'phaser';
import { Character } from '../types';
import { IMG_EXT } from '../scenes/Preloader';
import { invalidateVisualSize } from '../utils/spriteFit';

export class CharacterAssetLoader {
    static getDeferredCharacters(scene: Phaser.Scene): Character[] {
        const characters: Character[] = scene.cache.json.get('characters') || [];
        return characters.filter(c => c.level > 35 && !c.hiddenEnding);
    }

    static getMissingCharacters(scene: Phaser.Scene, characters: Character[]): Character[] {
        return characters.filter(c => !scene.textures.exists(c.id));
    }

    static queueCharacter(scene: Phaser.Scene, char: Character) {
        const assetId = char.assetId || char.id;
        if (!scene.textures.exists(char.id)) {
            scene.load.image(char.id, `sprites/characters/${assetId}${IMG_EXT}`);
        }
        if (!char.hiddenEnding) {
            const actionKey = `${char.id}_action_sheet`;
            if (!scene.textures.exists(actionKey)) {
                scene.load.image(actionKey, `sprites/characters/${assetId}_action${IMG_EXT}`);
            }
        }
    }

    /** Load one character immediately if missing (spawn-time safety net). */
    static ensureCharacter(scene: Phaser.Scene, char: Character, onReady?: () => void) {
        const roster: Character[] = scene.cache.json.get('characters') || [];
        const resolved = roster.find(c => c.id === char.id) || char;
        if (scene.textures.exists(resolved.id)) {
            this.ensureCharacterAnimations(scene, resolved);
            onReady?.();
            return false;
        }
        scene.load.setPath('assets');
        this.queueCharacter(scene, resolved);
        scene.load.once('complete', () => {
            this.ensureCharacterAnimations(scene, resolved);
            onReady?.();
        });
        if (!scene.load.isLoading()) scene.load.start();
        return true;
    }

    static startLoadIfNeeded(scene: Phaser.Scene, onComplete?: () => void): boolean {
        const deferred = this.getDeferredCharacters(scene);
        const missing = this.getMissingCharacters(scene, deferred);
        if (missing.length === 0) {
            this.ensureAnimations(scene, deferred);
            onComplete?.();
            return false;
        }

        scene.load.setPath('assets');
        missing.forEach(char => this.queueCharacter(scene, char));

        if (scene.load.isLoading()) {
            if (onComplete) scene.load.once('complete', () => {
                this.ensureAnimations(scene, missing);
                onComplete();
            });
            return true;
        }

        scene.load.once('complete', () => {
            this.ensureAnimations(scene, missing);
            onComplete?.();
        });
        scene.load.start();
        return true;
    }

    static ensureAnimations(scene: Phaser.Scene, characters: Character[]) {
        characters.forEach(char => {
            try {
                this.ensureCharacterAnimations(scene, char);
            } catch (err) {
                console.warn('ensureCharacterAnimations failed', char.id, err);
            }
        });
        const bosses: { id: string }[] = scene.cache.json.get('bosses') || [];
        bosses.forEach(boss => {
            try {
                this.ensureCharacterAnimations(scene, { id: boss.id } as Character);
            } catch (err) {
                console.warn('ensureCharacterAnimations failed', boss.id, err);
            }
        });
    }

    /** Action strips must be ~3 frames wide. Narrow/portrait sheets must not be sliced. */
    static isValidActionStrip(width: number, height: number): boolean {
        if (!width || !height) return false;
        return width / height >= 2.45;
    }

    static ensureCharacterAnimations(scene: Phaser.Scene, char: Character) {
        const actionKey = `${char.id}_action_sheet`;
        if (!scene.textures.exists(actionKey)) return;
        const texture = scene.textures.get(actionKey);
        const src = texture.source[0];
        if (!src?.width || !src.height) return;

        if (!this.isValidActionStrip(src.width, src.height)) {
            scene.registry.set(`${char.id}_action_size`, { w: src.width, h: src.height, invalidStrip: true });
            const sheetKey = `${char.id}_anim_sheet`;
            if (scene.textures.exists(sheetKey)) scene.textures.remove(sheetKey);
            if (scene.anims.exists(`${char.id}_idle`)) scene.anims.remove(`${char.id}_idle`);
            if (scene.anims.exists(`${char.id}_action`)) scene.anims.remove(`${char.id}_action`);
            invalidateVisualSize(scene, char.id);
            return;
        }

        const frameWidth = Math.floor(src.width / 3);
        const frameHeight = src.height;
        scene.registry.set(`${char.id}_action_size`, { w: frameWidth, h: frameHeight });
        const sheetKey = `${char.id}_anim_sheet`;
        if (!scene.textures.exists(sheetKey)) {
            scene.textures.addSpriteSheet(sheetKey, src.image as HTMLImageElement, {
                frameWidth,
                frameHeight
            });
        }
        if (!scene.anims.exists(`${char.id}_idle`)) {
            scene.anims.create({
                key: `${char.id}_idle`,
                frames: scene.anims.generateFrameNumbers(sheetKey, { frames: [0, 1] }),
                frameRate: 3,
                repeat: -1
            });
        }
        if (!scene.anims.exists(`${char.id}_action`)) {
            scene.anims.create({
                key: `${char.id}_action`,
                frames: scene.anims.generateFrameNumbers(sheetKey, { start: 0, end: 2 }),
                frameRate: 10,
                repeat: 0
            });
        }
        invalidateVisualSize(scene, char.id);
    }
}
