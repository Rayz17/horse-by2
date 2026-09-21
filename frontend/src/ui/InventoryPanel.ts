import Phaser from 'phaser';
import { Item } from '../types';
import { Grid } from '../objects/Grid';

export function renderInventoryPanel(
    scene: Phaser.Scene,
    container: Phaser.GameObjects.Container,
    inventory: Item[],
    grid: Grid,
    onChanged: () => void,
    onActivate?: (item: Item) => boolean,
    panelW = 664,
    panelH = 78
) {
    if (!container) return;
    container.removeAll(true);

    container.add(scene.add.rectangle(0, 0, panelW, panelH, 0x14141f, 0.88).setStrokeStyle(2, 0x5a5a78, 0.7));

    const label = hasClickableItem(inventory) ? '点元宝兑现' : '背包';
    container.add(scene.add.text(-panelW / 2 + 16, 0, label, {
        fontFamily: 'Arial Black', fontSize: 16, color: '#d8d8ee'
    }).setOrigin(0, 0.5));

    const slotSize = Math.min(58, panelH - 16);
    const gap = 14;
    const slotsW = slotSize * 3 + gap * 2;
    const startX = 36 - slotsW / 2;

    for (let i = 0; i < 3; i++) {
        const x = startX + i * (slotSize + gap);
        let slotBg: Phaser.GameObjects.GameObject;
        if (scene.textures.exists('ui_slot_frame')) {
            slotBg = scene.add.image(x, 0, 'ui_slot_frame').setDisplaySize(slotSize, slotSize).setAlpha(0.7);
        } else {
            slotBg = scene.add.rectangle(x, 0, slotSize, slotSize, 0x000000, 0.45).setStrokeStyle(2, 0x8888aa);
        }
        container.add(slotBg);

        if (!inventory[i]) {
            container.add(scene.add.text(x, 0, '空', {
                fontFamily: 'Arial', fontSize: 14, color: '#666677'
            }).setOrigin(0.5));
            continue;
        }

        const item = inventory[i];
        const index = i;
        let sprite: Phaser.GameObjects.Sprite | Phaser.GameObjects.Text;
        if (scene.textures.exists(item.id)) {
            sprite = scene.add.sprite(x, 0, item.id).setDisplaySize(slotSize - 8, slotSize - 8);
        } else {
            sprite = scene.add.text(x, 0, item.name.substring(0, 1) || '?', { fontSize: '28px' }).setOrigin(0.5);
        }
        container.add(sprite);

        sprite.setInteractive({ draggable: true, useHandCursor: true });
        let ghost: Phaser.GameObjects.Sprite | Phaser.GameObjects.Text | null = null;
        let dragged = false;

        sprite.on('dragstart', (pointer: Phaser.Input.Pointer) => {
            dragged = false;
            if (scene.textures.exists(item.id)) {
                ghost = scene.add.sprite(pointer.x, pointer.y, item.id).setDisplaySize(72, 72).setDepth(3000).setAlpha(0.85);
            } else {
                ghost = scene.add.text(pointer.x, pointer.y, item.name.substring(0, 1) || '?', { fontSize: '48px' }).setOrigin(0.5).setDepth(3000).setAlpha(0.85);
            }
            sprite.setAlpha(0.5);
        });

        sprite.on('drag', (pointer: Phaser.Input.Pointer) => {
            dragged = true;
            if (ghost) ghost.setPosition(pointer.x, pointer.y);
        });

        sprite.on('dragend', () => {
            sprite.setAlpha(1);
            if (ghost) {
                const gStartX = grid.getStartX();
                const gStartY = grid.getStartY();
                const tileSize = grid.getTileSize();
                const col = Math.floor((ghost.x - gStartX) / tileSize);
                const row = Math.floor((ghost.y - gStartY) / tileSize);
                if (dragged && grid.applyItem(row, col, item)) {
                    inventory.splice(index, 1);
                    onChanged();
                }
                ghost.destroy();
                ghost = null;
            }
        });

        sprite.on('pointerup', () => {
            if (dragged) return;
            if (onActivate?.(item)) {
                inventory.splice(index, 1);
                onChanged();
            }
        });
    }
}

function hasClickableItem(inventory: Item[]) {
    return inventory.some(i =>
        i.id === 'item_gold_ingot' || i.id === 'item_whisk' || i.id === 'item_plum' || i.id === 'item_tiger'
    );
}
