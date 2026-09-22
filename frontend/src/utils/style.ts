import Phaser from 'phaser';

export function getTierColor(tier: number): number {
    switch (tier) {
        case 1: return 0xd0d0d0;
        case 2: return 0x44aa44;
        case 3: return 0x4488ff;
        case 4: return 0xaa44ff;
        case 5: return 0xffaa00;
        default: return 0xff4444;
    }
}

/** Same level always shares a hue so merge partners read like 2048 numbers. */
const LEVEL_ACCENTS = [
    0xe74c3c, 0xe67e22, 0xf1c40f, 0x2ecc71, 0x1abc9c, 0x3498db,
    0x9b59b6, 0xe84393, 0x00cec9, 0xfd79a8, 0x6c5ce7, 0x00b894
];

export function getLevelAccent(level: number): number {
    return LEVEL_ACCENTS[(Math.max(1, level) - 1) % LEVEL_ACCENTS.length];
}

export function colorToCss(color: number): string {
    return `#${color.toString(16).padStart(6, '0')}`;
}

export function contrastOn(color: number): string {
    const r = (color >> 16) & 255;
    const g = (color >> 8) & 255;
    const b = color & 255;
    return 0.299 * r + 0.587 * g + 0.114 * b > 168 ? '#111111' : '#ffffff';
}

export function getRarityBorderKey(rarity: string): string {
    switch (rarity) {
        case 'N': return 'border_n';
        case 'R': return 'border_r';
        case 'SR': return 'border_sr';
        case 'SSR': return 'border_ssr';
        case 'Hidden': return 'border_hidden';
        default: return 'border_n';
    }
}

/** Transparent-center sleeves eat more of the card on Hidden / SSR. */
export function getRaritySleeveInset(rarity: string): number {
    switch (rarity) {
        case 'Hidden': return 0.22;
        case 'SSR': return 0.16;
        case 'SR': return 0.14;
        default: return 0.11;
    }
}

/** Generated sleeves filled the hole with light grey; punch that fill so portraits show through. */
export function punchRaritySleeveCenters(scene: Phaser.Scene) {
    if (scene.registry.get('sleevesPunched')) return;
    ['border_n', 'border_r', 'border_sr', 'border_hidden'].forEach(key => punchLightCenter(scene, key));
    scene.registry.set('sleevesPunched', true);
}

/** Measured normalized inner-hole rects (SSR ships transparent, measured offline). */
const FALLBACK_HOLE: Record<string, { x: number; y: number; w: number; h: number }> = {
    border_n: { x: 0.125, y: 0.125, w: 0.75, h: 0.75 },
    border_r: { x: 0.221, y: 0.221, w: 0.559, h: 0.559 },
    border_sr: { x: 0.17, y: 0.17, w: 0.66, h: 0.66 },
    border_ssr: { x: 0.137, y: 0.137, w: 0.707, h: 0.725 },
    border_hidden: { x: 0.211, y: 0.211, w: 0.578, h: 0.578 }
};

/**
 * 卡套的透明内洞（归一化到卡套贴图空间）。底板必须精确盖住这个洞，
 * 否则详情卡四周会透出背景（「镂空位置不正确」的来源）。
 */
export function getRarityHoleRect(scene: Phaser.Scene, rarity: string): { x: number; y: number; w: number; h: number } {
    const key = getRarityBorderKey(rarity);
    const measured = scene.registry.get(`${key}_hole`) as { x: number; y: number; w: number; h: number } | undefined;
    if (measured?.w && measured?.h) return measured;
    return FALLBACK_HOLE[key] || { x: 0.15, y: 0.15, w: 0.7, h: 0.7 };
}

function punchLightCenter(scene: Phaser.Scene, key: string) {
    if (!scene.textures.exists(key)) return;
    const src = scene.textures.get(key).getSourceImage() as CanvasImageSource;
    const w = (src as HTMLImageElement).width || (src as HTMLCanvasElement).width;
    const h = (src as HTMLImageElement).height || (src as HTMLCanvasElement).height;
    if (!w || !h) return;
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(src, 0, 0);
    const image = ctx.getImageData(0, 0, w, h);
    const px = image.data;
    const at = (x: number, y: number) => (y * w + x) * 4;
    const isFill = (x: number, y: number) => {
        const i = at(x, y);
        const r = px[i];
        const g = px[i + 1];
        const b = px[i + 2];
        const a = px[i + 3];
        if (a < 16) return false;
        const max = Math.max(r, g, b);
        const min = Math.min(r, g, b);
        const lum = 0.3 * r + 0.59 * g + 0.11 * b;
        return lum >= 175 && max - min <= 48;
    };
    const seen = new Uint8Array(w * h);
    const stack = [w >> 1, h >> 1];
    let x0 = w, y0 = h, x1 = -1, y1 = -1;
    while (stack.length) {
        const y = stack.pop()!;
        const x = stack.pop()!;
        if (x < 0 || y < 0 || x >= w || y >= h) continue;
        const p = y * w + x;
        if (seen[p]) continue;
        seen[p] = 1;
        if (!isFill(x, y)) continue;
        px[at(x, y) + 3] = 0;
        if (x < x0) x0 = x;
        if (y < y0) y0 = y;
        if (x > x1) x1 = x;
        if (y > y1) y1 = y;
        stack.push(x + 1, y, x - 1, y, x, y + 1, x, y - 1);
    }
    ctx.putImageData(image, 0, 0);
    if (x1 >= 0) {
        scene.registry.set(`${key}_hole`, { x: x0 / w, y: y0 / h, w: (x1 - x0 + 1) / w, h: (y1 - y0 + 1) / h });
    }
    scene.textures.remove(key);
    scene.textures.addCanvas(key, canvas);
}

export function addRaritySleeve(
    scene: Phaser.Scene,
    container: Phaser.GameObjects.Container,
    rarity: string,
    width: number,
    height: number,
    x = 0,
    y = 0
): Phaser.GameObjects.Image | Phaser.GameObjects.Rectangle {
    const key = getRarityBorderKey(rarity);
    if (scene.textures.exists(key)) {
        const sleeve = scene.add.image(x, y, key).setOrigin(0.5);
        sleeve.setDisplaySize(width, height);
        container.add(sleeve);
        return sleeve;
    }
    const stroke = rarity === 'Hidden' ? 0x6a4cff : rarity === 'SSR' ? 0xffd700 : 0xffffff;
    const fallback = scene.add.rectangle(x, y, width, height, 0x000000, 0);
    fallback.setStrokeStyle(4, stroke, 0.95);
    container.add(fallback);
    return fallback;
}
