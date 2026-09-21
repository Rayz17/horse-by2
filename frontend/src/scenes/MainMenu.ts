import { Scene } from 'phaser';
import { SaveManager } from '../managers/SaveManager';
import { AudioManager } from '../managers/AudioManager';
import { RunStateManager } from '../managers/RunStateManager';
import { Item, RunConfig, RunMode } from '../types';
import { localDateKey } from '../utils/dateKey';
import { CharacterAssetLoader } from '../managers/CharacterAssetLoader';
import { MODE_LABELS } from '../utils/runConfig';

export class MainMenu extends Scene {
    private audioManager = new AudioManager();
    private supplyLayer: Phaser.GameObjects.Container | null = null;

    constructor() {
        super('MainMenu');
    }

    create() {
        // Kill any leftover high-depth blockers and ensure input works.
        this.supplyLayer = null;
        this.input.enabled = true;
        this.input.setTopOnly(false);
        CharacterAssetLoader.startLoadIfNeeded(this);

        if (this.textures.exists('bg_main_menu')) {
            const bg = this.add.image(360, 0, 'bg_main_menu').setOrigin(0.5, 0).setDepth(0);
            bg.displayWidth = 720;
            bg.scaleY = bg.scaleX;
        } else {
            this.add.rectangle(360, 640, 720, 1280, 0x1a1a2e).setOrigin(0.5).setDepth(0);
        }

        this.add.text(360, 160, 'Horse成双', {
            fontFamily: 'Arial Black', fontSize: 64, color: '#ffffff',
            stroke: '#000000', strokeThickness: 8, align: 'center'
        }).setOrigin(0.5).setDepth(1);

        const continueLabel = RunStateManager.getContinueLabel();
        let y = 280;
        this.add.rectangle(360, 560, 580, 640, 0x0b1020, 0.55).setDepth(1);

        if (continueLabel) {
            this.addMenuButton(360, y, 520, 64, continueLabel, '#ffd700', '#443300', () => {
                this.playClick();
                const snap = RunStateManager.getContinueSnapshot();
                this.scene.start('Game', {
                    mode: snap?.mode || (snap?.dailySeed || snap?.dailyChallenge ? 'daily' : 'standard'),
                    continueRun: true,
                    dailySeed: snap?.dailySeed,
                    guestId: snap?.guestId,
                    routeLock: snap?.routeLock
                } as RunConfig);
            });
            y += 80;
        }

        this.addMenuButton(280, y, 280, 72, continueLabel ? '重新开始' : '开始游戏', '#ffffff', '#335577', () => {
            this.playClick();
            if (RunStateManager.load('standard')) {
                this.showRestartConfirm(() => {
                    RunStateManager.clear('standard');
                    this.showSupplyOverlay();
                });
                return;
            }
            this.showSupplyOverlay();
        });
        this.addMenuButton(500, y, 160, 72, '短局', '#ffcc88', '#443322', () => {
            this.playClick();
            this.showShortModeOverlay();
        });
        y += 90;

        this.addMenuButton(360, y, 360, 56, '图鉴 (Gallery)', '#ffffff', '#444466', () => {
            this.playClick();
            this.scene.start('Gallery');
        });
        y += 80;

        const dateKey = localDateKey();
        const saveManager = new SaveManager();
        const dailyBest = saveManager.getDailyBest(dateKey);
        this.add.text(360, y + 8, dailyBest > 0
            ? `今日挑战 ${dateKey} · 最佳 ${dailyBest}`
            : `今日挑战 ${dateKey} · 尚未挑战`, {
            fontFamily: 'Arial', fontSize: 20, color: dailyBest > 0 ? '#ffd700' : '#d0d0d0'
        }).setOrigin(0.5).setDepth(2);

        this.addMenuButton(360, y + 56, 420, 56, '进入今日挑战', '#99ccff', '#222244', () => {
            this.playClick();
            const startDaily = () => {
                RunStateManager.clear('side');
                this.scene.start('Game', { mode: 'daily', dailySeed: dateKey } as RunConfig);
            };
            if (continueLabel) {
                this.showRestartConfirm(startDaily);
                return;
            }
            startDaily();
        });

        const mute = this.addMenuButton(660, 40, 80, 48, this.audioManager.isMuted() ? '静音' : '音效', '#ffffff', '#333333', () => {
            this.audioManager.toggleMuted();
            mute.text.setText(this.audioManager.isMuted() ? '静音' : '音效');
        });

        if (import.meta.env.DEV) {
            const bosses = [
                { id: 'fire_monkey', name: 'Lv.1-15 火猴' },
                { id: 'miasma_bat', name: 'Lv.16-30 毒蝠' },
                { id: 'stone_golem', name: 'Lv.31-45 岩像' },
                { id: 'lava_beast', name: 'Lv.46-60 熔岩驹' },
                { id: 'shadow_assassin', name: 'Lv.61-75 梦魇' },
                { id: 'frost_wyrm', name: 'Lv.76-90 极寒龙马' },
                { id: 'chaos_void', name: 'Lv.91+ 熵之黑洞马' }
            ];
            const listY = y + 130;
            let expanded = false;
            const entries: { bg: Phaser.GameObjects.Rectangle; text: Phaser.GameObjects.Text }[] = [];
            const toggle = this.addMenuButton(360, listY, 420, 48, '开发：Boss 测试 ▸', '#ffcc88', '#333333', () => {
                expanded = !expanded;
                toggle.text.setText(expanded ? '开发：Boss 测试 ▾' : '开发：Boss 测试 ▸');
                entries.forEach(entry => {
                    entry.bg.setVisible(expanded);
                    entry.text.setVisible(expanded);
                });
            });
            bosses.forEach((b, i) => {
                const entry = this.addMenuButton(360, listY + 56 + i * 46, 420, 40, `测试: ${b.name}`, '#ffcc88', '#333333', () => {
                    this.scene.start('Game', { mode: 'standard', bossId: b.id } as RunConfig);
                });
                entry.bg.setVisible(false);
                entry.text.setVisible(false);
                entries.push(entry);
            });
        }
    }

    private showRestartConfirm(onConfirm: () => void) {
        const layer = this.add.container(0, 0).setDepth(6000);
        const dim = this.add.rectangle(360, 640, 720, 1280, 0x000000, 0.72).setInteractive();
        const panel = this.add.rectangle(360, 640, 560, 280, 0x111133, 0.98).setStrokeStyle(3, 0xffd700);
        const title = this.add.text(360, 560, '重新开始？', {
            fontFamily: 'Arial Black', fontSize: 32, color: '#ffd700'
        }).setOrigin(0.5);
        const body = this.add.text(360, 620, '当前进度会被清除，无法恢复。', {
            fontFamily: 'Arial', fontSize: 22, color: '#ffffff'
        }).setOrigin(0.5);
        layer.add([dim, panel, title, body]);

        const cancelBg = this.add.rectangle(230, 720, 180, 52, 0x333344).setStrokeStyle(2, 0xffffff).setInteractive({ useHandCursor: true });
        const cancelText = this.add.text(230, 720, '取消', {
            fontFamily: 'Arial Black', fontSize: 24, color: '#ffffff'
        }).setOrigin(0.5);
        cancelBg.on('pointerdown', () => layer.destroy(true));
        layer.add([cancelBg, cancelText]);

        const okBg = this.add.rectangle(490, 720, 180, 52, 0x773333).setStrokeStyle(2, 0xff8888).setInteractive({ useHandCursor: true });
        const okText = this.add.text(490, 720, '确定清除', {
            fontFamily: 'Arial Black', fontSize: 24, color: '#ffffff'
        }).setOrigin(0.5);
        okBg.on('pointerdown', () => {
            layer.destroy(true);
            onConfirm();
        });
        layer.add([okBg, okText]);
    }

    private playClick() {
        void this.audioManager.ensureContext().then(() => this.audioManager.play('click'));
    }

    /** Reliable hit target: rectangle receives clicks, text is visual only. */
    private addMenuButton(
        x: number,
        y: number,
        w: number,
        h: number,
        label: string,
        textColor: string,
        bgColor: string,
        onClick: () => void
    ) {
        const bg = this.add.rectangle(x, y, w, h, Phaser.Display.Color.HexStringToColor(bgColor).color, 0.92)
            .setStrokeStyle(2, 0xffffff, 0.35)
            .setDepth(20)
            .setInteractive({ useHandCursor: true });
        const text = this.add.text(x, y, label, {
            fontFamily: 'Arial Black',
            fontSize: Math.min(28, Math.floor(h * 0.45)),
            color: textColor,
            align: 'center'
        }).setOrigin(0.5).setDepth(21);

        bg.on('pointerover', () => bg.setAlpha(1));
        bg.on('pointerout', () => bg.setAlpha(0.92));
        bg.on('pointerdown', () => onClick());

        return { bg, text };
    }

    private showSupplyOverlay() {
        if (this.supplyLayer) {
            this.supplyLayer.destroy(true);
            this.supplyLayer = null;
        }

        const saveManager = new SaveManager();
        const items: Item[] = ((this.cache.json.get('items') as Item[]) || []).filter(i => i.price > 0).slice(0, 6);
        const selected = new Set<string>();
        let legacyGold = saveManager.getLegacyGold();

        const layer = this.add.container(0, 0).setDepth(5000);
        this.supplyLayer = layer;

        // Blocker behind panel — stops menu clicks bleeding through
        const dim = this.add.rectangle(360, 640, 720, 1280, 0x000000, 0.72)
            .setInteractive();
        layer.add(dim);

        const panel = this.add.rectangle(360, 640, 640, 760, 0x111133, 0.98).setStrokeStyle(3, 0xffd700);
        const title = this.add.text(360, 320, '开局补给', {
            fontFamily: 'Arial Black', fontSize: 36, color: '#ffd700'
        }).setOrigin(0.5);
        const goldText = this.add.text(360, 370, `传承金币：${legacyGold}`, {
            fontFamily: 'Arial', fontSize: 24, color: '#ffffff'
        }).setOrigin(0.5);
        const hint = this.add.text(360, 410, '可选 0–2 件（商店价 8 折），也可直接跳过', {
            fontFamily: 'Arial', fontSize: 18, color: '#cccccc'
        }).setOrigin(0.5);
        layer.add([panel, title, goldText, hint]);

        const refreshGold = () => goldText.setText(`传承金币：${legacyGold}`);

        items.forEach((item, index) => {
            const x = 180 + (index % 3) * 180;
            const y = 500 + Math.floor(index / 3) * 150;
            const supplyPrice = Math.floor(item.price * 0.8);
            const slotBg = this.add.rectangle(x, y, 140, 130, 0x222244)
                .setStrokeStyle(2, 0x666699)
                .setInteractive({ useHandCursor: true });
            const label = this.add.text(x, y + 40, `${item.name}\n${supplyPrice}G`, {
                fontFamily: 'Arial', fontSize: 16, color: '#ffffff', align: 'center'
            }).setOrigin(0.5);
            layer.add(slotBg);
            if (this.textures.exists(item.id)) {
                layer.add(this.add.image(x, y - 16, item.id).setDisplaySize(56, 56));
            }
            layer.add(label);
            slotBg.on('pointerdown', () => {
                if (selected.has(item.id)) {
                    selected.delete(item.id);
                    legacyGold += supplyPrice;
                    slotBg.setStrokeStyle(2, 0x666699);
                } else if (selected.size >= 2 || legacyGold < supplyPrice) {
                    return;
                } else {
                    selected.add(item.id);
                    legacyGold -= supplyPrice;
                    slotBg.setStrokeStyle(3, 0xffd700);
                }
                refreshGold();
            });
        });

        const startGame = (startItems: string[]) => {
            saveManager.setLegacyGold(legacyGold);
            layer.destroy(true);
            this.supplyLayer = null;
            this.scene.start('Game', { mode: 'standard', startItems } as RunConfig);
        };

        const skipBg = this.add.rectangle(360, 820, 360, 56, 0x222244)
            .setStrokeStyle(2, 0x99ccff)
            .setInteractive({ useHandCursor: true });
        const skipText = this.add.text(360, 820, '跳过，直接开局', {
            fontFamily: 'Arial Black', fontSize: 24, color: '#99ccff'
        }).setOrigin(0.5);
        skipBg.on('pointerdown', () => startGame([]));
        layer.add([skipBg, skipText]);

        const confirmBg = this.add.rectangle(360, 900, 360, 56, 0x335577)
            .setStrokeStyle(2, 0xffffff)
            .setInteractive({ useHandCursor: true });
        const confirmText = this.add.text(360, 900, '确认带入', {
            fontFamily: 'Arial Black', fontSize: 26, color: '#ffffff'
        }).setOrigin(0.5);
        confirmBg.on('pointerdown', () => startGame(Array.from(selected)));
        layer.add([confirmBg, confirmText]);
    }

    private showShortModeOverlay() {
        const layer = this.add.container(0, 0).setDepth(5000);
        const dim = this.add.rectangle(360, 640, 720, 1280, 0x000000, 0.72).setInteractive();
        const panel = this.add.rectangle(360, 640, 600, 560, 0x111133, 0.98).setStrokeStyle(3, 0xffcc88);
        const title = this.add.text(360, 400, '短局三选一', {
            fontFamily: 'Arial Black', fontSize: 34, color: '#ffcc88'
        }).setOrigin(0.5);
        const hint = this.add.text(360, 450, '不进大和谐，不覆盖标准续玩档', {
            fontFamily: 'Arial', fontSize: 18, color: '#cccccc'
        }).setOrigin(0.5);
        layer.add([dim, panel, title, hint]);

        const modes: Array<{ mode: RunMode; desc: string }> = [
            { mode: 'sprint', desc: '30 次有效滑动 · 无悔棋' },
            { mode: 'bossRush', desc: '章节带开局 · 击败 3 个 Boss' },
            { mode: 'recipeHunt', desc: '提高配方生成 · 发现 3 条新配方' }
        ];
        modes.forEach((entry, i) => {
            const y = 530 + i * 90;
            const bg = this.add.rectangle(360, y, 480, 72, 0x335577).setStrokeStyle(2, 0xffffff).setInteractive({ useHandCursor: true });
            const text = this.add.text(360, y - 12, MODE_LABELS[entry.mode], {
                fontFamily: 'Arial Black', fontSize: 26, color: '#ffffff'
            }).setOrigin(0.5);
            const desc = this.add.text(360, y + 18, entry.desc, {
                fontFamily: 'Arial', fontSize: 16, color: '#d0d0d0'
            }).setOrigin(0.5);
            bg.on('pointerdown', () => {
                layer.destroy(true);
                const start = () => {
                    RunStateManager.clear('side');
                    this.scene.start('Game', { mode: entry.mode } as RunConfig);
                };
                if (RunStateManager.load('side')) this.showRestartConfirm(start);
                else start();
            });
            layer.add([bg, text, desc]);
        });

        const cancel = this.add.rectangle(360, 840, 200, 48, 0x333344).setStrokeStyle(2, 0xffffff).setInteractive({ useHandCursor: true });
        const cancelText = this.add.text(360, 840, '返回', {
            fontFamily: 'Arial Black', fontSize: 22, color: '#ffffff'
        }).setOrigin(0.5);
        cancel.on('pointerdown', () => layer.destroy(true));
        layer.add([cancel, cancelText]);
    }
}
