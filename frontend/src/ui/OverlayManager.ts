import Phaser from 'phaser';

export const UI_FONT = {
    bannerTitle: 28,
    bannerBody: 18,
    toast: 24,
    modalTitle: 40,
    modalSubtitle: 22,
    sectionTitle: 22,
    body: 20,
    caption: 16,
    button: 28
} as const;

export const UI_CROP = {
    chapterBanner: { x: 0.12, y: 0.04, w: 0.76, h: 0.9 },
    bossToast: { x: 0.14, y: 0.04, w: 0.72, h: 0.9 },
    endingChoiceInner: { x: 0.13, y: 0.1, w: 0.74, h: 0.76 }
} as const;

export type TrimmedImageFactory = (
    key: string, x: number, y: number, maxWidth: number,
    crop: { x: number; y: number; w: number; h: number }
) => Phaser.GameObjects.Image | null;

export class OverlayManager {
    activeTopNotice: Phaser.GameObjects.Container | null = null;
    activeToast: Phaser.GameObjects.Container | null = null;

    constructor(
        private scene: Phaser.Scene,
        private addTrimmedUiImage: TrimmedImageFactory
    ) {}

    showPhaseBanner(title: string, subtitle: string) {
        this.activeTopNotice?.destroy();
        const overlay = this.scene.add.container(360, 360);
        overlay.setDepth(3200);
        this.activeTopNotice = overlay;

        let bg: Phaser.GameObjects.Image | Phaser.GameObjects.Rectangle | null;
        const bannerImage = this.addTrimmedUiImage('chapter_banner_tier', 0, 0, 660, UI_CROP.chapterBanner);
        if (bannerImage) {
            bg = bannerImage;
        } else {
            bg = this.scene.add.rectangle(0, 0, 660, 180, 0x1a1035, 0.96).setOrigin(0.5);
            bg.setStrokeStyle(3, 0xffd700);
        }
        const titleText = this.scene.add.text(0, -32, title, {
            fontFamily: 'Arial Black', fontSize: UI_FONT.bannerTitle, color: '#ffd700'
        }).setOrigin(0.5);
        const subtitleText = this.scene.add.text(0, 34, subtitle, {
            fontFamily: 'Arial', fontSize: UI_FONT.bannerBody, color: '#ffffff',
            wordWrap: { width: 580, useAdvancedWrap: true }, align: 'center'
        }).setOrigin(0.5);

        overlay.add([bg, titleText, subtitleText]);
        overlay.setAlpha(0);
        this.scene.tweens.add({
            targets: overlay,
            alpha: 1,
            y: 360,
            duration: 220,
            yoyo: true,
            hold: 2000,
            onComplete: () => {
                if (this.activeTopNotice === overlay) this.activeTopNotice = null;
                overlay.destroy();
            }
        });
    }

    showChapterToast(msg: string) {
        this.showToast(msg, { startY: 200, endY: 176, duration: 2800, fontSize: 18 });
    }

    showToast(msg: string, options?: { startY?: number; endY?: number; duration?: number; fontSize?: number }) {
        const startY = options?.startY ?? 168;
        const endY = options?.endY ?? 148;
        const duration = options?.duration ?? 1600;
        const fontSize = options?.fontSize ?? 18;
        this.activeToast?.destroy();
        const toast = this.scene.add.container(360, startY).setDepth(3200);
        this.activeToast = toast;

        const text = this.scene.add.text(0, 0, msg, {
            fontFamily: 'Arial Black', fontSize, color: '#ffffff', stroke: '#000000', strokeThickness: 4,
            wordWrap: { width: 560, useAdvancedWrap: true }, align: 'center'
        }).setOrigin(0.5);
        const bg = this.scene.add.rectangle(0, 0, Math.min(640, text.width + 36), Math.min(72, text.height + 18), 0x000000, 0.82).setOrigin(0.5);
        bg.setStrokeStyle(2, 0xffd700, 0.45);
        toast.add([bg, text]);

        this.scene.tweens.add({
            targets: toast,
            y: endY,
            alpha: 0,
            duration,
            delay: 700,
            onComplete: () => {
                if (this.activeToast === toast) this.activeToast = null;
                toast.destroy();
            }
        });
    }
}
