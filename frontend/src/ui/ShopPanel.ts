import Phaser from 'phaser';
import { Item } from '../types';

export function createShopPanel(
    scene: Phaser.Scene,
    centerY: number,
    items: Item[],
    onBuy: (item: Item) => void,
    getPrice?: (item: Item) => number,
    panelW = 664,
    panelH = 136
): Phaser.GameObjects.Container {
    const shopContainer = scene.add.container(360, centerY);

    if (scene.textures.exists('ui_shop_bg')) {
        const bg = scene.add.image(0, 0, 'ui_shop_bg').setOrigin(0.5);
        bg.setDisplaySize(panelW, panelH);
        bg.setAlpha(0.72);
        shopContainer.add(bg);
    } else {
        shopContainer.add(scene.add.rectangle(0, 0, panelW, panelH, 0x16120c, 0.92).setStrokeStyle(2, 0xc9a227, 0.7));
    }

    shopContainer.add(scene.add.text(-panelW / 2 + 16, -panelH / 2 + 14, '商店', {
        fontFamily: 'Arial Black', fontSize: 14, color: '#e6c86a'
    }).setOrigin(0, 0.5));

    const buyableItems = items.filter(i => i.price > 0).slice(0, 6);
    const colW = panelW / Math.max(4, buyableItems.length);
    const slotSize = Math.min(72, panelH - 44, colW - 8);

    buyableItems.forEach((item, index) => {
        const x = -panelW / 2 + colW / 2 + index * colW;
        const y = 8;
        const itemContainer = scene.add.container(x, y);

        let btnBg: Phaser.GameObjects.GameObject;
        if (scene.textures.exists('ui_slot_frame')) {
            btnBg = scene.add.image(0, -6, 'ui_slot_frame').setDisplaySize(slotSize, slotSize).setAlpha(0.75);
        } else {
            btnBg = scene.add.rectangle(0, -6, slotSize, slotSize, 0x222233, 0.7).setStrokeStyle(2, 0x888866);
        }

        btnBg.setInteractive({ useHandCursor: true });
        const bgObj = btnBg as Phaser.GameObjects.Image & Phaser.GameObjects.Rectangle;
        btnBg.on('pointerover', () => bgObj.setTint ? bgObj.setTint(0xdddddd) : bgObj.setFillStyle(0x444444));
        btnBg.on('pointerout', () => bgObj.clearTint ? bgObj.clearTint() : bgObj.setFillStyle(0x222233));
        btnBg.on('pointerdown', () => onBuy(item));
        itemContainer.add(btnBg);

        if (scene.textures.exists(item.id)) {
            const iconSprite = scene.add.sprite(0, -8, item.id);
            const iconSize = slotSize - 18;
            iconSprite.setScale(iconSize / Math.max(iconSprite.width, iconSprite.height));
            itemContainer.add(iconSprite);
        } else {
            itemContainer.add(scene.add.text(0, -8, item.name.substring(0, 2), {
                fontSize: '18px', color: '#ffffff'
            }).setOrigin(0.5));
        }

        itemContainer.add(scene.add.text(0, slotSize / 2 + 4, `${getPrice ? getPrice(item) : item.price}G`, {
            fontFamily: 'Arial Black', fontSize: '18px', color: '#ffd700', stroke: '#000000', strokeThickness: 3
        }).setOrigin(0.5));

        shopContainer.add(itemContainer);
    });

    return shopContainer;
}
