import Phaser from 'phaser';
import { Character } from '../types';
import { CharacterAssetLoader } from '../managers/CharacterAssetLoader';
import { measureOpaqueBounds } from './spriteFit';

export function getPortraitScale(
    scene: Phaser.Scene,
    textureKey: string,
    maxWidth: number,
    maxHeight: number,
    preferProcessedSize: boolean,
    useOpaqueBounds = false
): number {
    if (!scene.textures.exists(textureKey)) return 1;
    const texture = scene.textures.get(textureKey);
    const frame = texture.get();
    let w = frame.width;
    let h = frame.height;
    if (preferProcessedSize) {
        const processed = scene.registry.get(`${textureKey}_content_size`);
        if (processed?.w && processed?.h) {
            w = processed.w;
            h = processed.h;
        }
    } else if (useOpaqueBounds) {
        const bounds = measureOpaqueBounds(scene, textureKey);
        if (bounds?.w && bounds?.h) {
            w = bounds.w;
            h = bounds.h;
        }
    }
    return Math.min(maxWidth / Math.max(1, w), maxHeight / Math.max(1, h));
}

export function addPortrait(
    scene: Phaser.Scene,
    container: Phaser.GameObjects.Container,
    textureKey: string,
    x: number,
    y: number,
    maxWidth: number,
    maxHeight: number,
    preferProcessedSize = false,
    useOpaqueBounds = false
): Phaser.GameObjects.Image | null {
    if (!scene.textures.exists(textureKey)) return null;
    const portrait = scene.add.image(x, y, textureKey).setOrigin(0.5);
    portrait.setScale(getPortraitScale(scene, textureKey, maxWidth, maxHeight, preferProcessedSize, useOpaqueBounds));
    container.add(portrait);
    return portrait;
}

/** Place a portrait now, or swap in the real art when a deferred character texture finishes. */
export function attachPortrait(
    scene: Phaser.Scene,
    container: Phaser.GameObjects.Container,
    textureKey: string,
    x: number,
    y: number,
    maxWidth: number,
    maxHeight: number,
    options?: {
        preferProcessedSize?: boolean;
        useOpaqueBounds?: boolean;
        fallback?: Phaser.GameObjects.GameObject;
        char?: Character;
    }
) {
    const place = () => {
        if (!container.active || !scene.textures.exists(textureKey)) return;
        options?.fallback?.destroy();
        addPortrait(
            scene,
            container,
            textureKey,
            x,
            y,
            maxWidth,
            maxHeight,
            options?.preferProcessedSize ?? false,
            options?.useOpaqueBounds ?? false
        );
    };
    if (scene.textures.exists(textureKey)) {
        place();
        return;
    }
    const char = options?.char || ({ id: textureKey } as Character);
    CharacterAssetLoader.ensureCharacter(scene, char, place);
}
