import Phaser from 'phaser';
import { Character } from '../types';
import { addRaritySleeve, getDetailCardInset, getTierColor } from '../utils/style';
import { attachPortrait } from '../utils/portrait';
import { CopyBlock, fitWrappedText, layoutCopyStack } from '../utils/textFit';

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
    const inset = getDetailCardInset(rarity);
    const padX = Math.round(cardWidth * inset) + 10;
    const padY = Math.round(cardHeight * inset) + 18;
    const innerW = cardWidth - padX * 2;
    const innerTop = -cardHeight / 2 + padY;
    const innerBottom = cardHeight / 2 - padY;
    const container = scene.add.container(opts.x ?? 360, opts.y ?? 640);

    addRaritySleeve(scene, container, rarity, cardWidth + 28, cardHeight + 28);
    const plateH = innerBottom - innerTop;
    const plate = scene.add.rectangle(0, (innerTop + innerBottom) / 2, innerW, plateH, getTierColor(char.tier));
    container.add(plate);

    const headerH = 70;
    const headerY = innerTop + headerH / 2;
    container.add(scene.add.rectangle(0, headerY, innerW, headerH, 0x000000, 0.72));

    const topInfo = scene.add.text(-innerW / 2 + 8, innerTop + 16, `Lv.${char.level}  |  ${char.rarity}`, {
        fontFamily: 'Arial', fontSize: '18px', color: '#ffd700', fontStyle: 'bold'
    }).setOrigin(0, 0.5);
    container.add(topInfo);

    const name = scene.add.text(-innerW / 2 + 8, innerTop + 42, '', {
        fontFamily: 'Arial Black', color: '#ffffff'
    }).setOrigin(0, 0.5);
    container.add(name);
    fitWrappedText(name, char.name, innerW - 16, 28, 26, 16);

    const minText = 150;
    const portraitBudget = innerBottom - (innerTop + headerH) - minText - 20;
        const imageSize = Math.max(128, Math.min(188, Math.round(portraitBudget)));
    const imageY = innerTop + headerH + 12 + imageSize / 2;
    const windowBg = scene.add.rectangle(0, imageY, imageSize, imageSize, 0x141018, 1);
    windowBg.setStrokeStyle(3, 0xd4af37, 0.85);
    container.add(windowBg);
    const fallback = scene.add.text(0, imageY, '?', { fontSize: '64px', color: '#ffd700' }).setOrigin(0.5);
    container.add(fallback);
    attachPortrait(scene, container, char.id, 0, imageY, imageSize - 16, imageSize - 16, {
        fallback,
        char,
        useOpaqueBounds: true
    });

    const textTop = imageY + imageSize / 2 + 12;
    const textBottom = innerBottom - 6;
    const copy: CopyBlock[] = [];

    if (char.skill?.name) {
        const skillTitle = scene.add.text(-innerW / 2, textTop, '', {
            fontFamily: 'Arial', fontSize: '18px', color: '#111111', fontStyle: 'bold'
        }).setOrigin(0, 0);
        container.add(skillTitle);
        copy.push({ text: skillTitle, raw: `[${char.skill.name}]`, maxFont: 18, minFont: 14, gapAfter: 4, keep: 3 });

        const skillDesc = scene.add.text(-innerW / 2, textTop, '', {
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

    const lore = scene.add.text(-innerW / 2, textTop, '', {
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
        const greeting = scene.add.text(-innerW / 2, textTop, '', {
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
        const line = scene.add.text(-innerW / 2, textTop, '', {
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
