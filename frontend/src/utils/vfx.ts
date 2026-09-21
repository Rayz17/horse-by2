import Phaser from 'phaser';
import { Tile } from '../objects/Tile';

const PLACEHOLDER_KEY = 'tile_placeholder';
const FORBIDDEN_PORTRAIT_KEYS = new Set(['particle_star', 'particle_smoke', 'flare', PLACEHOLDER_KEY, '__MISSING']);

export function ensurePlaceholderTexture(scene: Phaser.Scene) {
    if (scene.textures.exists(PLACEHOLDER_KEY)) return;
    const g = scene.add.graphics();
    g.fillStyle(0x000000, 0);
    g.fillRect(0, 0, 2, 2);
    g.generateTexture(PLACEHOLDER_KEY, 2, 2);
    g.destroy();
}

export function isUsablePortrait(scene: Phaser.Scene, key?: string | null): boolean {
    if (!key || FORBIDDEN_PORTRAIT_KEYS.has(key) || key.startsWith('particle_')) return false;
    if (!scene.textures.exists(key)) return false;
    const texture = scene.textures.get(key);
    if (texture.key === '__MISSING') return false;
    const src = texture.source?.[0];
    return !!(src && src.width >= 16 && src.height >= 16);
}

export function portraitOrPlaceholder(scene: Phaser.Scene, key: string): string {
    ensurePlaceholderTexture(scene);
    return isUsablePortrait(scene, key) ? key : PLACEHOLDER_KEY;
}

export function markTransientVfx(obj: Phaser.GameObjects.GameObject, scene: Phaser.Scene) {
    obj.setData('vfx', true);
    obj.setData('vfxAt', scene.time.now);
}

export function burstParticles(
    scene: Phaser.Scene,
    x: number,
    y: number,
    textureKey: string,
    config: Phaser.Types.GameObjects.Particles.ParticleEmitterConfig & { quantity?: number; lifespan?: number }
): Phaser.GameObjects.Particles.ParticleEmitter | null {
    if (!scene.textures.exists(textureKey)) return null;
    const quantity = Number(config.quantity ?? 6);
    const lifespan = Number(config.lifespan ?? 600);
    const emitter = scene.add.particles(x, y, textureKey, {
        ...config,
        emitting: false,
        quantity,
        lifespan
    });
    emitter.setDepth(1500);
    markTransientVfx(emitter, scene);
    emitter.explode(quantity);
    scene.time.delayedCall(lifespan + 120, () => {
        if (emitter.active) emitter.destroy();
    });
    return emitter;
}

function isParticleObject(obj: Phaser.GameObjects.GameObject): boolean {
    const type = obj.type;
    return type === 'ParticleEmitter'
        || type === 'ParticleEmitterManager'
        || type === 'Particles'
        || obj instanceof Phaser.GameObjects.Particles.ParticleEmitter;
}

function sweepOne(obj: Phaser.GameObjects.GameObject, now: number, maxAgeMs: number) {
    if (!obj?.active) return;
    if (obj instanceof Tile) return;

    if (isParticleObject(obj)) {
        const stamped = obj.getData('vfxAt') as number | undefined;
        if (!stamped || now - stamped > maxAgeMs) obj.destroy();
        return;
    }

    if (!(obj instanceof Phaser.GameObjects.Sprite)) return;
    const parent = obj.parentContainer;
    if (parent instanceof Tile) return;

    if (obj.getData('vfx') && now - (Number(obj.getData('vfxAt')) || 0) > 2000) {
        obj.destroy();
        return;
    }

    const key = obj.texture?.key;
    // flare is also used by unlock overlay rays — only sweep particle textures.
    if (key && (key === 'particle_star' || key === 'particle_smoke' || key.startsWith('particle_'))) {
        obj.destroy();
    }
}

export function sweepLooseVfx(scene: Phaser.Scene, maxAgeMs = 1200) {
    const now = scene.time.now;
    for (const obj of scene.children.getAll()) {
        sweepOne(obj as Phaser.GameObjects.GameObject, now, maxAgeMs);
        if (obj instanceof Phaser.GameObjects.Container) {
            for (const child of obj.getAll()) {
                sweepOne(child as Phaser.GameObjects.GameObject, now, maxAgeMs);
            }
        }
    }
}
