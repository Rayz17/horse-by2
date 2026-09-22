import Phaser from 'phaser';
import { Character } from '../types';
import { addRaritySleeve, getRarityHoleRect, getTierColor } from '../utils/style';
import { attachPortrait } from '../utils/portrait';
import { CopyBlock, fitWrappedText, layoutCopyStack } from '../utils/textFit';

/** 立绘窗固定尺寸：所有稀有度一致，厚边框卡套不再挤压立绘。 */
const PORTRAIT_SIZE = 264;
const CAPTION_H = 52;

export function buildCharacterCard(
    scene: Phaser.Scene,
    char: Character,
    opts: {
        x?: number;
        y?: number;
        width?: number;
        height?: number;
        extraLines?: string[];
    } = {}
): Phaser.GameObjects.Container {
    const cardWidth = opts.width ?? 540;
    const cardHeight = opts.height ?? 720;
    const rarity = char.rarity || 'N';
    const container = scene.add.container(opts.x ?? 360, opts.y ?? 640);

    // 底板精确盖住卡套的透明内洞（按内洞矩形反推位置与尺寸），
    // 立绘窗则固定尺寸，两者解耦：换边框不改立绘大小。
    const sleeveW = cardWidth + 28;
    const sleeveH = cardHeight + 28;
    addRaritySleeve(scene, container, rarity, sleeveW, sleeveH);
    const hole = getRarityHoleRect(scene, rarity);
    const plateW = Math.max(240, Math.round(sleeveW * hole.w) - 12);
    const plateH = Math.max(340, Math.round(sleeveH * hole.h) - 12);
    const plateCx = Math.round((hole.x + hole.w / 2 - 0.5) * sleeveW);
    const plateCy = Math.round((hole.y + hole.h / 2 - 0.5) * sleeveH);
    const plate = scene.add.rectangle(plateCx, plateCy, plateW, plateH, getTierColor(char.tier));
    container.add(plate);

    const padX = 14;
    const innerW = plateW - padX * 2;
    const innerLeft = plateCx - innerW / 2;

    const windowTop = plateCy - plateH / 2 + 10;
    const imageY = windowTop + PORTRAIT_SIZE / 2;
    const windowBg = scene.add.rectangle(plateCx, imageY, PORTRAIT_SIZE, PORTRAIT_SIZE, 0xffffff, 1);
    windowBg.setStrokeStyle(3, 0xd4af37, 0.85);
    container.add(windowBg);
    const fallback = scene.add.text(plateCx, imageY, '?', { fontSize: '64px', color: '#999999' }).setOrigin(0.5);
    container.add(fallback);
    attachPortrait(scene, container, char.id, plateCx, imageY, PORTRAIT_SIZE - 10, PORTRAIT_SIZE - 10, {
        fallback,
        char,
        useOpaqueBounds: true
    });

    // 名字/等级字幕条压在立绘窗底部（白底立绘上以半透明黑条保证可读），
    // 不再占用立绘上方的独立栏位
    const captionTop = windowTop + PORTRAIT_SIZE - CAPTION_H;
    container.add(scene.add.rectangle(plateCx, captionTop, PORTRAIT_SIZE, CAPTION_H, 0x000000, 0.72).setOrigin(0.5, 0));
    container.add(scene.add.text(plateCx - PORTRAIT_SIZE / 2 + 10, captionTop + 11, `Lv.${char.level}  |  ${char.rarity}`, {
        fontFamily: 'Arial', fontSize: '17px', color: '#ffd700', fontStyle: 'bold'
    }).setOrigin(0, 0.5));
    const name = scene.add.text(plateCx - PORTRAIT_SIZE / 2 + 10, captionTop + 36, '', {
        fontFamily: 'Arial Black', color: '#ffffff'
    }).setOrigin(0, 0.5);
    container.add(name);
    fitWrappedText(name, char.name, PORTRAIT_SIZE - 20, 26, 24, 15);

    const textTop = windowTop + PORTRAIT_SIZE + 8;
    const textBottom = plateCy + plateH / 2 - 8;
    const copy: CopyBlock[] = [];

    if (char.skill?.name) {
        const skillTitle = scene.add.text(innerLeft, textTop, '', {
            fontFamily: 'Arial', fontSize: '18px', color: '#111111', fontStyle: 'bold'
        }).setOrigin(0, 0);
        container.add(skillTitle);
        copy.push({ text: skillTitle, raw: `[${char.skill.name}]`, maxFont: 18, minFont: 14, gapAfter: 4, keep: 3 });

        const skillDesc = scene.add.text(innerLeft, textTop, '', {
            fontFamily: 'Arial', fontSize: '15px', color: '#222222'
        }).setOrigin(0, 0);
        container.add(skillDesc);
        copy.push({
            text: skillDesc,
            raw: String(char.skill.description || '').replace(/\s+/g, ' ').trim(),
            maxFont: 15,
            minFont: 12,
            gapAfter: 8,
            keep: 2
        });
    }

    const lore = scene.add.text(innerLeft, textTop, '', {
        fontFamily: 'Arial', fontSize: '15px', color: '#111111'
    }).setOrigin(0, 0);
    container.add(lore);
    copy.push({
        text: lore,
        raw: (char.description || char.background || '暂无描述').replace(/\s+/g, ' ').trim(),
        maxFont: 15,
        minFont: 12,
        gapAfter: 8,
        keep: 1
    });

    if (char.greeting) {
        const greeting = scene.add.text(innerLeft, textTop, '', {
            fontFamily: 'Arial', fontSize: '14px', color: '#333333', fontStyle: 'italic'
        }).setOrigin(0, 0);
        container.add(greeting);
        copy.push({
            text: greeting,
            raw: `祝语：${String(char.greeting).replace(/\s+/g, ' ').trim()}`,
            maxFont: 14,
            minFont: 12,
            gapAfter: 6,
            keep: 3
        });
    }

    for (const extra of opts.extraLines || []) {
        const line = scene.add.text(innerLeft, textTop, '', {
            fontFamily: 'Arial', fontSize: '14px', color: '#3a2a00'
        }).setOrigin(0, 0);
        container.add(line);
        copy.push({
            text: line,
            raw: String(extra).replace(/\s+/g, ' ').trim(),
            maxFont: 14,
            minFont: 12,
            gapAfter: 4,
            keep: 2
        });
    }

    layoutCopyStack(copy, textTop, textBottom, innerW);
    return container;
}
