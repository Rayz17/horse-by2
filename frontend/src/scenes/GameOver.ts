import { Scene } from 'phaser';
import { Character, EndingReport, EndingRouteStyle } from '../types';
import { SaveManager } from '../managers/SaveManager';
import { RunStateManager } from '../managers/RunStateManager';
import { addRaritySleeve, getTierColor } from '../utils/style';
import { attachPortrait } from '../utils/portrait';
import { CopyBlock, fitWrappedText, layoutCopyStack } from '../utils/textFit';

const ROUTE_TO_CARD_KEY: Record<EndingRouteStyle, string> = {
    cyberSciFi: 'great_harmony_cyber_sci_fi',
    ancientClassic: 'great_harmony_ancient_classic',
    animeMania: 'great_harmony_anime_mania',
    mythLegend: 'great_harmony_myth_legend',
};

function cleanLines(lines?: string[]): string[] {
    const seen = new Set<string>();
    const out: string[] = [];
    for (const raw of lines || []) {
        const line = String(raw || '').replace(/\s+/g, ' ').trim();
        if (line.length < 2 || seen.has(line)) continue;
        seen.add(line);
        out.push(line);
    }
    return out.slice(0, 3);
}

export class GameOver extends Scene {
    private bestChar: Character | null = null;
    private score: number = 0;
    private report: EndingReport | null = null;

    constructor() {
        super('GameOver');
    }

    init(data: { bestChar: Character, score: number, report?: EndingReport }) {
        this.bestChar = data.bestChar;
        this.score = data.score || 0;
        this.report = data.report || null;
    }

    create() {
        if (this.textures.exists('bg_gallery')) {
            this.add.image(360, 640, 'bg_gallery').setOrigin(0.5).setDisplaySize(720, 1280);
        } else {
            this.add.rectangle(360, 640, 720, 1280, 0xaa0000).setOrigin(0.5);
        }

        const report = this.report;
        const displayChar = report?.endingChar || this.bestChar;
        const title = report?.storyTitle || '福气满满';
        const subtitle = report?.endingType === 'trueEnding'
            ? (report?.routeSubtitle || '真结局已达成')
            : report?.endingType === 'normalEnding'
                ? '终章封卷'
                : '命途暂歇';
        const isTrueEnding = report?.endingType === 'trueEnding';
        const portraitKey = displayChar?.id;
        const routeCardKey = report?.routeStyle ? ROUTE_TO_CARD_KEY[report.routeStyle] : undefined;
        const blessing = (report?.blessing || displayChar?.greeting || '').replace(/\s+/g, ' ').trim();

        const footerY = 1220;
        const shareY = 1136;
        const blessingBottom = shareY - 38;
        const blessingTop = blessingBottom - 52;

        const titleText = this.add.text(360, 36, '', {
            fontFamily: 'Arial Black', color: '#ffd700',
            stroke: '#000000', strokeThickness: 4, align: 'center'
        }).setOrigin(0.5, 0);
        fitWrappedText(titleText, title, 640, 56, isTrueEnding ? 34 : 36, 24);

        const subtitleText = this.add.text(360, titleText.y + titleText.height + 4, subtitle, {
            fontFamily: 'Arial Black', fontSize: 20, color: '#ffffff'
        }).setOrigin(0.5, 0);

        const saveManager = new SaveManager();
        const isNewRecord = saveManager.setHighscore(this.score);
        const highscore = saveManager.getHighscore();
        RunStateManager.clear();
        const metaBits = [
            `得分 ${this.score}`,
            `最佳 ${highscore}${isNewRecord ? ' · 新纪录' : ''}`,
            report?.chapterObjectivesTotal != null
                ? `目标 ${report.chapterObjectivesDone ?? 0}/${report.chapterObjectivesTotal}`
                : '',
            report?.routeLabel ? `路线 ${report.routeLabel}` : '',
            report?.dailySeed ? `挑战 ${report.dailySeed}` : ''
        ].filter(Boolean);

        const metaText = this.add.text(360, subtitleText.y + subtitleText.height + 8, '', {
            fontFamily: 'Arial', color: '#d7e7ff', align: 'center'
        }).setOrigin(0.5, 0);
        fitWrappedText(metaText, metaBits.join(' · '), 640, 40, 16, 13);

        let headerBottom = metaText.y + metaText.height + 10;
        if (report?.dailySeed) {
            const slips = (report.fortuneLines || []).join(' / ');
            const shareText = `我在《Horse成双》今日挑战（种子 ${report.dailySeed}）拿下 ${this.score} 分！${slips ? `签文：${slips} ` : ''}来比一比？`;
            const dailyShare = this.add.text(360, headerBottom, '复制分享文案', {
                fontFamily: 'Arial', fontSize: 16, color: '#ffffff',
                backgroundColor: '#335577', padding: { x: 10, y: 4 }
            }).setOrigin(0.5, 0).setInteractive({ useHandCursor: true });
            dailyShare.on('pointerdown', async () => {
                try {
                    await navigator.clipboard.writeText(shareText);
                    dailyShare.setText('已复制！');
                } catch {
                    dailyShare.setText('复制失败');
                }
            });
            headerBottom += 34;
        }

        const reportBudget = 250;
        const available = blessingTop - 12 - headerBottom;
        const cardH = Math.min(isTrueEnding ? 360 : 420, Math.max(260, available - reportBudget));
        const cardTop = headerBottom + 6;
        const reportTop = cardTop + cardH + 16;

        if (displayChar && !isTrueEnding) {
            this.buildIdentityCard(displayChar, report, portraitKey, cardTop + cardH / 2, cardH);
        }
        if (displayChar && isTrueEnding) {
            this.buildTrueEndingCard(displayChar, report, routeCardKey, cardTop + cardH / 2, cardH);
        }

        const bullets = cleanLines(report?.storyLines).map(line => `· ${line}`);
        if (!bullets.length) bullets.push('· 这一局的命运，还在等待你亲手书写。');
        if (isTrueEnding && report?.routeScoreSummary?.length) {
            bullets.push(`· 判定：${report.routeScoreSummary.slice(0, 3).join(' / ')}`);
        }

        const copy: CopyBlock[] = [];
        const textLeft = 100;
        const textWidth = 520;
        const textTop = reportTop + 48;
        const textBudget = blessingTop - 16;
        for (const line of bullets.slice(0, 4)) {
            const block = this.add.text(textLeft, textTop, '', {
                fontFamily: 'Arial', fontSize: 16, color: '#ffffff', align: 'left', lineSpacing: 3
            }).setOrigin(0, 0);
            copy.push({ text: block, raw: line, maxFont: 16, minFont: 13, gapAfter: 10, keep: 2 });
        }
        const copyBottom = layoutCopyStack(copy, textTop, textBudget, textWidth);
        const reportH = Math.max(160, copyBottom + 16 - reportTop);

        const panel = this.add.rectangle(360, reportTop + reportH / 2, 620, reportH, 0x111111, 0.88).setOrigin(0.5);
        panel.setStrokeStyle(2, 0xffd700);
        panel.setDepth(1);
        this.add.text(360, reportTop + 14, '命运报告', {
            fontFamily: 'Arial Black', fontSize: 22, color: '#ffd700'
        }).setOrigin(0.5, 0).setDepth(2);
        copy.forEach(block => block.text.setDepth(2));

        if (blessing) {
            const wishY = Math.min(blessingTop, reportTop + reportH + 12);
            const wish = this.add.text(360, wishY, '', {
                fontFamily: 'Arial', color: '#f4e6c4', fontStyle: 'italic', align: 'center'
            }).setOrigin(0.5, 0);
            fitWrappedText(wish, `祝语：${blessing}`, 600, blessingBottom - wishY, 16, 13);
        }

        const shareBtn = this.add.rectangle(360, shareY, 360, 52, 0x00aa66).setOrigin(0.5).setInteractive({ useHandCursor: true });
        this.add.text(360, shareY, '炫耀一下（生成运势）', { fontSize: '22px', color: '#ffffff' }).setOrigin(0.5);
        shareBtn.on('pointerdown', () => this.generateFortuneCard());

        const restartBtn = this.add.rectangle(250, footerY, 200, 52, 0x333333).setOrigin(0.5).setInteractive({ useHandCursor: true });
        this.add.text(250, footerY, '再来一局', { fontSize: '22px', color: '#ffffff' }).setOrigin(0.5);
        restartBtn.on('pointerdown', () => this.scene.start('MainMenu'));

        const menuBtn = this.add.rectangle(470, footerY, 200, 52, 0x555555).setOrigin(0.5).setInteractive({ useHandCursor: true });
        this.add.text(470, footerY, '返回菜单', { fontSize: '22px', color: '#ffffff' }).setOrigin(0.5);
        menuBtn.on('pointerdown', () => this.scene.start('MainMenu'));
    }

    private buildIdentityCard(
        displayChar: Character,
        report: EndingReport | null,
        portraitKey: string | undefined,
        centerY: number,
        cardHeight: number
    ) {
        const cardWidth = 560;
        const padding = 24;
        const innerWidth = cardWidth - padding * 2;
        const card = this.add.container(360, centerY);

        const cardBg = this.add.rectangle(0, 0, cardWidth, cardHeight, 0x1a140c, 0.96);
        cardBg.setStrokeStyle(5, 0xd4af37);
        card.add(cardBg);
        card.add(this.add.rectangle(0, 0, cardWidth - 12, cardHeight - 12, getTierColor(displayChar.tier), 0.22));

        const headerH = 72;
        card.add(this.add.rectangle(0, -cardHeight / 2 + headerH / 2 + 6, cardWidth - 12, headerH, 0x000000, 0.72));
        card.add(this.add.text(-cardWidth / 2 + padding, -cardHeight / 2 + 24, `Lv.${displayChar.level}  |  ${displayChar.rarity}`, {
            fontFamily: 'Arial', fontSize: '18px', color: '#ffd700', fontStyle: 'bold'
        }).setOrigin(0, 0.5));
        const name = this.add.text(-cardWidth / 2 + padding, -cardHeight / 2 + 50, '', {
            fontFamily: 'Arial Black', color: '#ffffff'
        }).setOrigin(0, 0.5);
        card.add(name);
        fitWrappedText(name, displayChar.name, innerWidth, 28, 26, 18);

        const statsH = 52;
        // 立绘白底大图：占满预算（上限 260），去底立绘在白底上最清晰
        const imageSize = Math.min(260, Math.round(cardHeight - headerH - statsH - 36));
        const imageY = -cardHeight / 2 + headerH + 16 + imageSize / 2;
        const imageWindowBg = this.add.rectangle(0, imageY, imageSize, imageSize, 0xffffff, 1);
        imageWindowBg.setStrokeStyle(3, 0xd4af37, 0.85);
        card.add(imageWindowBg);
        const fallback = this.add.text(0, imageY, '?', { fontSize: '64px', color: '#999999' }).setOrigin(0.5);
        card.add(fallback);
        if (portraitKey) {
            attachPortrait(this, card, portraitKey, 0, imageY, imageSize - 10, imageSize - 10, {
                fallback,
                char: displayChar,
                useOpaqueBounds: true
            });
        }

        const stats = [
            report?.dominantTagLabel ? `主调 ${report.dominantTagLabel}` : '',
            report?.routeLabel ? `风格 ${report.routeLabel}` : '',
            `合成 ${report?.moveCount || 0}`,
            `首领 ${report?.bossDefeated || 0}`
        ].filter(Boolean).join('  ·  ');
        const statsY = cardHeight / 2 - statsH / 2 - 10;
        const statsPanel = this.add.rectangle(0, statsY, cardWidth - 28, statsH, 0x111111, 0.82);
        statsPanel.setStrokeStyle(1, 0xffd700, 0.35);
        card.add(statsPanel);
        const statsText = this.add.text(0, statsY, '', {
            fontFamily: 'Arial', color: '#f4e6c4', align: 'center'
        }).setOrigin(0.5);
        card.add(statsText);
        fitWrappedText(statsText, stats, cardWidth - 48, statsH - 8, 16, 13);
    }

    private buildTrueEndingCard(
        displayChar: Character,
        report: EndingReport | null,
        routeCardKey: string | undefined,
        centerY: number,
        cardHeight: number
    ) {
        const card = this.add.container(360, centerY);
        const plateW = 468;
        const plateH = Math.min(300, cardHeight - 48);
        card.add(this.add.rectangle(0, -10, plateW, plateH, 0x1a1028, 1));

        if (routeCardKey && this.textures.exists(routeCardKey)) {
            const endingCard = this.add.image(0, -10, routeCardKey).setOrigin(0.5);
            const scale = Math.min((plateW - 24) / endingCard.width, (plateH - 24) / endingCard.height);
            endingCard.setScale(scale);
            card.add(endingCard);
        } else if (displayChar.id) {
            attachPortrait(this, card, displayChar.id, 0, -10, plateH - 24, plateH - 24, {
                char: displayChar,
                useOpaqueBounds: true
            });
        }

        addRaritySleeve(this, card, displayChar.rarity || 'Hidden', 500, Math.min(380, cardHeight));
        const name = this.add.text(0, cardHeight / 2 - 18, '', {
            fontFamily: 'Arial Black', color: '#ffe082',
            stroke: '#000000', strokeThickness: 3, align: 'center'
        }).setOrigin(0.5);
        card.add(name);
        fitWrappedText(name, displayChar.name || report?.routeLabel || '真结局', 600, 28, 22, 16);
    }

    private generateFortuneCard() {
        const char = this.report?.endingChar || this.bestChar;
        if (!char) return;
        const layer = this.add.container(0, 0).setDepth(9000);
        layer.add(this.add.rectangle(360, 640, 720, 1280, 0x140c18, 1));
        layer.add(this.add.rectangle(360, 640, 680, 1220, 0x1a140c, 1).setStrokeStyle(6, 0xd4af37));

        const title = this.add.text(360, 56, '', {
            fontFamily: 'Arial Black', color: '#ffd700', align: 'center'
        }).setOrigin(0.5, 0);
        layer.add(title);
        fitWrappedText(title, this.report?.storyTitle || '本局签文', 600, 56, 32, 22);

        const route = this.add.text(360, title.y + title.height + 8, this.report?.routeLabel || '命运未定', {
            fontFamily: 'Arial Black', fontSize: 20, color: '#ffffff'
        }).setOrigin(0.5, 0);
        layer.add(route);

        const artY = 340;
        layer.add(this.add.rectangle(360, artY, 260, 260, 0xffffff).setStrokeStyle(3, 0xd4af37));
        if (this.textures.exists(char.id)) {
            attachPortrait(this, layer, char.id, 360, artY, 220, 220, { char, useOpaqueBounds: true });
        } else {
            layer.add(this.add.text(360, artY, char.name.slice(0, 2), {
                fontFamily: 'Arial Black', fontSize: 56, color: '#ffe082'
            }).setOrigin(0.5));
        }

        const name = this.add.text(360, 500, '', {
            fontFamily: 'Arial Black', color: '#ffe082', align: 'center'
        }).setOrigin(0.5, 0);
        layer.add(name);
        fitWrappedText(name, char.name, 600, 36, 26, 18);

        layer.add(this.add.text(360, name.y + name.height + 8, `分数 ${this.score}`, {
            fontFamily: 'Arial Black', fontSize: 22, color: '#ffffff'
        }).setOrigin(0.5, 0));

        const slips = this.report?.fortuneLines || [this.report?.blessing || '马年大吉'];
        let slipY = 640;
        slips.forEach(line => {
            const slip = this.add.text(360, slipY, '', {
                fontFamily: 'Arial', color: '#f4e6c4', align: 'center'
            }).setOrigin(0.5, 0);
            layer.add(slip);
            fitWrappedText(slip, String(line).replace(/\s+/g, ' ').trim(), 560, 72, 20, 15);
            slipY += slip.height + 16;
        });

        this.game.renderer.snapshot((image: HTMLImageElement | Phaser.Display.Color) => {
            layer.destroy(true);
            if (image instanceof HTMLImageElement) {
                const link = document.createElement('a');
                link.download = `fortune_card_${char.id}.png`;
                link.href = image.src;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
            }
        });
    }
}
