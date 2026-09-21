import Phaser from 'phaser';

export type OpaqueBounds = {
    x: number;
    y: number;
    w: number;
    h: number;
    frameW: number;
    frameH: number;
};

const ALPHA_THRESHOLD = 10;
const VISUAL_FILL = 0.9;

function cacheKey(textureKey: string, frameName: string | number) {
    const name = frameName === 0 || frameName === '0' ? '__BASE' : String(frameName);
    return `${textureKey}_opaque_${name}`;
}

function sourceImage(texture: Phaser.Textures.Texture): CanvasImageSource | null {
    const fromSource = texture.source?.[0]?.image as CanvasImageSource | undefined;
    if (fromSource) return fromSource;
    const fromGetter = texture.getSourceImage?.() as CanvasImageSource | undefined;
    return fromGetter || null;
}

function readFramePixels(
    texture: Phaser.Textures.Texture,
    frameName: string | number
): { data: Uint8ClampedArray; w: number; h: number } | null {
    const name = frameName === 0 || frameName === '0' ? '__BASE' : String(frameName);
    const frame = texture.has(name)
        ? texture.get(name)
        : (name === '__BASE' ? texture.get() : null);
    if (!frame) return null;

    const w = Math.max(1, Math.floor(frame.cutWidth || frame.width));
    const h = Math.max(1, Math.floor(frame.cutHeight || frame.height));
    const src = sourceImage(texture);
    if (!src) return null;

    const scratch = document.createElement('canvas');
    scratch.width = w;
    scratch.height = h;
    const ctx = scratch.getContext('2d', { willReadFrequently: true });
    if (!ctx) return null;
    ctx.clearRect(0, 0, w, h);
    ctx.drawImage(src, frame.cutX, frame.cutY, w, h, 0, 0, w, h);
    return { data: ctx.getImageData(0, 0, w, h).data, w, h };
}

export function measureOpaqueBounds(
    scene: Phaser.Scene,
    textureKey: string,
    frameName: string | number = '__BASE'
): OpaqueBounds | null {
    const key = cacheKey(textureKey, frameName);
    const cached = scene.registry.get(key) as OpaqueBounds | undefined;
    if (cached?.w && cached?.h) return cached;
    if (!scene.textures.exists(textureKey)) return null;

    const texture = scene.textures.get(textureKey);
    let measured: OpaqueBounds | null = null;
    try {
        const pixels = readFramePixels(texture, frameName);
        if (pixels) {
            const { data, w, h } = pixels;
            const step = w * h > 180000 ? 2 : 1;
            let minX = w;
            let minY = h;
            let maxX = -1;
            let maxY = -1;
            for (let y = 0; y < h; y += step) {
                for (let x = 0; x < w; x += step) {
                    if (data[(y * w + x) * 4 + 3] > ALPHA_THRESHOLD) {
                        if (x < minX) minX = x;
                        if (y < minY) minY = y;
                        if (x > maxX) maxX = x;
                        if (y > maxY) maxY = y;
                    }
                }
            }
            if (maxX >= minX && maxY >= minY) {
                measured = {
                    x: minX,
                    y: minY,
                    w: maxX - minX + 1,
                    h: maxY - minY + 1,
                    frameW: w,
                    frameH: h
                };
            }
        }
    } catch {
        measured = null;
    }

    if (!measured) {
        const frame = texture.has(String(frameName)) ? texture.get(String(frameName)) : texture.get();
        measured = {
            x: 0,
            y: 0,
            w: Math.max(1, frame.width),
            h: Math.max(1, frame.height),
            frameW: Math.max(1, frame.width),
            frameH: Math.max(1, frame.height)
        };
    }

    scene.registry.set(key, measured);
    return measured;
}

export function invalidateVisualSize(scene: Phaser.Scene, charId: string) {
    scene.registry.remove(`${charId}_visual_size`);
}

export function scaleToFitVisual(
    contentW: number,
    contentH: number,
    cellSize: number,
    fill = VISUAL_FILL
): number {
    const inner = Math.max(24, cellSize - 18);
    const target = inner * fill;
    const scale = Math.min(target / Math.max(1, contentW), target / Math.max(1, contentH));
    return Number.isFinite(scale) && scale > 0 ? scale : 0.4;
}

/**
 * Board tiles prefer the action strip. Those frames are a shared height (usually 256)
 * but very different widths, so contain-by-full-frame makes padded characters tiny.
 * Always fit the *displayed* texture: sheets by frame height, portraits by opaque box.
 */
export function fitSpriteVisual(
    scene: Phaser.Scene,
    sprite: Phaser.GameObjects.Sprite,
    cellSize: number,
    _charId?: string,
    fill = VISUAL_FILL
) {
    const inner = Math.max(24, cellSize - 18);
    const target = inner * fill;
    const key = sprite.texture.key;

    if (key.endsWith('_anim_sheet')) {
        const frameH = Math.max(1, sprite.frame.height);
        sprite.setScale(target / frameH);
        return;
    }

    const bounds = measureOpaqueBounds(scene, key, '__BASE');
    const w = bounds?.w || sprite.frame.width || sprite.width;
    const h = bounds?.h || sprite.frame.height || sprite.height;
    sprite.setScale(scaleToFitVisual(w, h, cellSize, fill));
}
