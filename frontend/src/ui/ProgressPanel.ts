import Phaser from 'phaser';

export class ProgressPanel {
    container: Phaser.GameObjects.Container;
    titleText: Phaser.GameObjects.Text;
    bodyText: Phaser.GameObjects.Text;
    footerText: Phaser.GameObjects.Text;

    constructor(scene: Phaser.Scene, centerY = 100, width = 664, height = 40) {
        this.container = scene.add.container(360, centerY);
        this.container.setDepth(1500);

        const bg = scene.add.rectangle(0, 0, width, height, 0x07101c, 0.94).setOrigin(0.5);
        bg.setStrokeStyle(2, 0xcaa85a, 0.8);
        this.container.add(bg);

        this.titleText = scene.add.text(-width / 2 + 14, 0, '章节', {
            fontFamily: 'Arial Black', fontSize: '16px', color: '#ffd700'
        }).setOrigin(0, 0.5);

        this.bodyText = scene.add.text(-width / 2 + 118, 0, '', {
            fontFamily: 'Arial', fontSize: '15px', color: '#ffffff',
            wordWrap: { width: width - 200, useAdvancedWrap: true }
        }).setOrigin(0, 0.5);

        this.footerText = scene.add.text(width / 2 - 14, 0, '', {
            fontFamily: 'Arial', fontSize: '14px', color: '#9fd3ff',
            align: 'right'
        }).setOrigin(1, 0.5);

        this.container.add([this.titleText, this.bodyText, this.footerText]);
    }

    setHarmony(title: string, body: string, footer: string) {
        this.titleText.setText(title);
        this.bodyText.setText(body);
        this.footerText.setText(footer);
    }

    setBoss(title: string, body: string, footer: string) {
        this.titleText.setText(title);
        this.bodyText.setText(body);
        this.footerText.setText(footer);
    }

    setChapter(title: string, body: string, footer: string) {
        this.titleText.setText(title);
        this.bodyText.setText(body);
        this.footerText.setText(footer);
    }
}
