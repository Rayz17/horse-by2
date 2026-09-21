import Phaser from 'phaser';
import { Character, BossData, Recipe } from '../types';
import { SaveManager } from '../managers/SaveManager';
import { addRaritySleeve, getRaritySleeveInset, punchRaritySleeveCenters } from '../utils/style';
import { attachPortrait } from '../utils/portrait';
import { CharacterAssetLoader } from '../managers/CharacterAssetLoader';
import { CopyBlock, fitWrappedText, layoutCopyStack, setCjkText } from '../utils/textFit';
import { buildCharacterCard } from '../ui/CharacterCard';

export class Gallery extends Phaser.Scene {
    private characters: Character[] = [];
    private bosses: BossData[] = [];
    private recipes: Recipe[] = [];
    private currentPage: number = 0;
    private maxPages: number = 0;
    private pageRenderPending: boolean = false;
    private saveManager!: SaveManager;
    
    private container!: Phaser.GameObjects.Container;
    private pageText!: Phaser.GameObjects.Text;
    private currentTab: 'character' | 'boss' | 'recipe' = 'character';

    private tabTextChar!: Phaser.GameObjects.Text;
    private tabTextBoss!: Phaser.GameObjects.Text;
    private tabTextRecipe!: Phaser.GameObjects.Text;
    private tabBgChar!: Phaser.GameObjects.Rectangle;
    private tabBgBoss!: Phaser.GameObjects.Rectangle;
    private tabBgRecipe!: Phaser.GameObjects.Rectangle;

    constructor() {
        super('Gallery');
    }

    create() {
        CharacterAssetLoader.startLoadIfNeeded(this, () => {
            if (this.container) this.showPage(this.currentPage);
        });

        punchRaritySleeveCenters(this);
        this.saveManager = new SaveManager();
        this.characters = this.cache.json.get('characters');
        this.bosses = this.cache.json.get('bosses') || [];
        this.recipes = this.cache.json.get('recipes') || [];

        // Background
        this.add.rectangle(360, 640, 720, 1280, 0x1a1a28).setOrigin(0.5);
        
        this.add.text(360, 44, '马年图鉴', {
            fontFamily: 'Arial Black', fontSize: 40, color: '#ffffff'
        }).setOrigin(0.5);

        const progressLine = this.buildProgressLine();
        const progressText = this.add.text(360, 88, progressLine.summary, {
            fontFamily: 'Arial', fontSize: 18, color: '#ffd700'
        }).setOrigin(0.5).setInteractive({ useHandCursor: true });
        progressText.on('pointerdown', () => this.showProgressGaps(progressLine));

        const closeBg = this.add.rectangle(650, 50, 88, 44, 0x333344, 0.95)
            .setStrokeStyle(2, 0xffffff, 0.4)
            .setInteractive({ useHandCursor: true });
        this.add.text(650, 50, '返回', {
            fontFamily: 'Arial Black', fontSize: 22, color: '#ffffff'
        }).setOrigin(0.5);
        closeBg.on('pointerdown', () => this.scene.start('MainMenu'));

        const mkTab = (x: number, label: string, onClick: () => void) => {
            const bg = this.add.rectangle(x, 148, 200, 44, 0x2a2a3c, 0.95)
                .setStrokeStyle(2, 0xffffff, 0.2)
                .setInteractive({ useHandCursor: true });
            const text = this.add.text(x, 148, label, {
                fontFamily: 'Arial Black', fontSize: 22, color: '#888888'
            }).setOrigin(0.5);
            bg.on('pointerdown', onClick);
            return { bg, text };
        };
        const tabChar = mkTab(140, '角色图鉴', () => this.switchTab('character'));
        const tabBoss = mkTab(360, '首领情报', () => this.switchTab('boss'));
        const tabRecipe = mkTab(580, '配方发现', () => this.switchTab('recipe'));
        this.tabTextChar = tabChar.text;
        this.tabTextBoss = tabBoss.text;
        this.tabTextRecipe = tabRecipe.text;
        this.tabBgChar = tabChar.bg;
        this.tabBgBoss = tabBoss.bg;
        this.tabBgRecipe = tabRecipe.bg;

        this.container = this.add.container(0, 196);
        
        const prevBg = this.add.rectangle(130, 1168, 160, 44, 0x333344, 0.95).setInteractive({ useHandCursor: true });
        this.add.text(130, 1168, '< 上一页', { fontFamily: 'Arial Black', fontSize: 22, color: '#ffffff' }).setOrigin(0.5);
        prevBg.on('pointerdown', () => this.changePage(-1));
        const nextBg = this.add.rectangle(590, 1168, 160, 44, 0x333344, 0.95).setInteractive({ useHandCursor: true });
        this.add.text(590, 1168, '下一页 >', { fontFamily: 'Arial Black', fontSize: 22, color: '#ffffff' }).setOrigin(0.5);
        nextBg.on('pointerdown', () => this.changePage(1));

        this.pageText = this.add.text(360, 1168, '1 / 1', { fontFamily: 'Arial Black', fontSize: 24, color: '#ffffff' }).setOrigin(0.5);

        this.switchTab('character');
    }

    private switchTab(tab: 'character' | 'boss' | 'recipe') {
        this.currentTab = tab;
        this.tabTextChar.setColor(tab === 'character' ? '#ffd700' : '#888888');
        this.tabTextBoss.setColor(tab === 'boss' ? '#ff4444' : '#888888');
        this.tabTextRecipe.setColor(tab === 'recipe' ? '#99ccff' : '#888888');
        this.tabBgChar.setFillStyle(tab === 'character' ? 0x4a3a12 : 0x2a2a3c, 0.95);
        this.tabBgBoss.setFillStyle(tab === 'boss' ? 0x4a1212 : 0x2a2a3c, 0.95);
        this.tabBgRecipe.setFillStyle(tab === 'recipe' ? 0x12304a : 0x2a2a3c, 0.95);

        const perPage = this.getPageConfig().perPage;
        if (tab === 'character') {
            this.maxPages = Math.ceil(this.getGalleryCharacters().length / perPage);
        } else if (tab === 'boss') {
            this.maxPages = Math.ceil(this.bosses.length / perPage);
        } else {
            this.maxPages = Math.ceil(this.recipes.length / perPage);
        }
        this.currentPage = 0;
        this.showPage(this.currentPage);
    }

    private changePage(delta: number) {
        const newPage = this.currentPage + delta;
        if (newPage >= 0 && newPage < this.maxPages) {
            this.currentPage = newPage;
            this.showPage(this.currentPage);
        }
    }

    private getPageConfig() {
        if (this.currentTab === 'recipe') {
            return {
                cols: 2,
                gapX: 348,
                gapY: 228,
                startX: 186,
                startY: 88,
                cardW: 316,
                cardH: 208,
                perPage: 8
            };
        }
        return {
            cols: 4,
            gapX: 168,
            gapY: 186,
            startX: 108,
            startY: 78,
            cardW: 148,
            cardH: 170,
            perPage: 20
        };
    }

    /** Regular roster first; four true-ending cards always sit at the end as collectible slots. */
    private getGalleryCharacters(): Character[] {
        const regular = this.characters.filter(char => !char.hiddenEnding);
        const endings = this.characters.filter(char => char.hiddenEnding);
        return [...regular, ...endings];
    }

    /**
     * 资产就绪回调统一走这里：把同一帧内的多次请求合并成下一帧的一次整页重建，
     * 避免逐卡回调各自 removeAll(true) 把正在构建的列表清成空白页。
     */
    private scheduleShowPage() {
        if (this.pageRenderPending) return;
        this.pageRenderPending = true;
        this.time.delayedCall(0, () => {
            this.pageRenderPending = false;
            if (this.sys.isActive() && this.container) this.showPage(this.currentPage);
        });
    }

    private showPage(page: number) {
        this.container.removeAll(true);
        this.pageText.setText(`${page + 1} / ${Math.max(1, this.maxPages)}`);

        const unlockedChars = this.saveManager.getUnlockedCharacters();
        const visibleCharacters = this.getGalleryCharacters();
        const foundKeys = new Set(this.saveManager.getRecipesFound());
        const layout = this.getPageConfig();
        const startIdx = page * layout.perPage;
        const pageItems = this.currentTab === 'character'
            ? visibleCharacters.slice(startIdx, startIdx + layout.perPage)
            : this.currentTab === 'boss'
                ? this.bosses.slice(startIdx, startIdx + layout.perPage)
                : this.recipes.slice(startIdx, startIdx + layout.perPage);

        pageItems.forEach((item: any, index: number) => {
            const row = Math.floor(index / layout.cols);
            const col = index % layout.cols;

            const x = layout.startX + col * layout.gapX;
            const y = layout.startY + row * layout.gapY;

            const card = this.add.container(x, y);

            if (this.currentTab === 'character') {
                this.buildCharacterThumb(card, item as Character, unlockedChars.includes(item.id), layout.cardW, layout.cardH);
            } else if (this.currentTab === 'boss') {
                // Boss Tab
                const boss = item as BossData;
                const color = 0x880000;
                const bg = this.add.rectangle(0, 0, 140, 160, color).setOrigin(0.5);
                bg.setStrokeStyle(4, 0xff4444);
                card.add(bg);

                const portraitPlate = this.add.rectangle(0, -10, 116, 126, 0xffffff).setOrigin(0.5);
                portraitPlate.setStrokeStyle(2, 0x000000, 0.2);
                card.add(portraitPlate);
                
                const name = this.add.text(0, 60, boss.name, {
                    fontFamily: 'Arial', fontSize: '16px', color: '#ffffff', align: 'center',
                    wordWrap: { width: 118, useAdvancedWrap: true }, backgroundColor: '#000000', padding: { x: 4, y: 2 }
                }).setOrigin(0.5);

                const icon = this.add.text(0, -10, "BOSS", { fontSize: '32px', color: '#ffaaaa', fontStyle: 'bold' }).setOrigin(0.5);
                card.add(icon);
                attachPortrait(this, card, boss.id, 0, -10, 96, 112, { fallback: icon });

                bg.setInteractive({ useHandCursor: true });
                bg.on('pointerdown', () => this.showBossDetails(boss));

                card.add([name]);
            } else {
                this.buildRecipeThumb(card, item as Recipe, foundKeys, layout.cardW, layout.cardH);
            }
            this.container.add(card);
        });
    }

    private buildCharacterThumb(
        card: Phaser.GameObjects.Container,
        char: Character,
        isUnlocked: boolean,
        cardW: number,
        cardH: number
    ) {
        const rarity = char.rarity || 'N';
        const inset = getRaritySleeveInset(rarity);
        const innerW = Math.round(cardW * (1 - inset * 2));
        const innerH = Math.round(cardH * (1 - inset * 2));
        addRaritySleeve(this, card, rarity, cardW + 10, cardH + 10);

        const plateColor = isUnlocked ? 0xf7f1e8 : 0x2a2a38;
        const plate = this.add.rectangle(0, 0, innerW, innerH, plateColor).setOrigin(0.5);
        card.add(plate);

        const hit = this.add.rectangle(0, 0, cardW, cardH, 0x000000, 0.001).setOrigin(0.5);
        card.add(hit);

        const portraitY = -8;
        const portraitBox = Math.min(innerW - 6, innerH - 34);
        if (isUnlocked) {
            CharacterAssetLoader.ensureCharacter(this, char, () => this.scheduleShowPage());
            const fallbackText = this.add.text(0, portraitY, '?', {
                fontSize: '40px', color: '#666666', fontStyle: 'bold'
            }).setOrigin(0.5);
            card.add(fallbackText);
            attachPortrait(this, card, char.id, 0, portraitY, portraitBox, portraitBox, {
                fallback: fallbackText,
                char
            });
        } else {
            const fallbackText = this.add.text(0, portraitY, '?', {
                fontSize: '40px', color: '#888888', fontStyle: 'bold'
            }).setOrigin(0.5);
            fallbackText.setAlpha(0.35);
            card.add(fallbackText);
        }

        const lockedLabel = char.hiddenEnding
            ? this.getEndingRouteLabel(char)
            : char.recipeOnly ? '配方隐藏' : '???';
        const name = this.add.text(0, innerH / 2 - 12, isUnlocked ? char.name : lockedLabel, {
            fontFamily: 'Arial', fontSize: '13px', color: '#ffffff', align: 'center',
            wordWrap: { width: innerW - 10, useAdvancedWrap: true },
            backgroundColor: '#000000', padding: { x: 3, y: 2 }
        }).setOrigin(0.5);
        fitWrappedText(name, isUnlocked ? char.name : lockedLabel, innerW - 10, 38, 13, 10);
        const lv = this.add.text(-innerW / 2 + 4, -innerH / 2 + 2, `Lv.${char.level}`, {
            fontSize: '11px', color: '#ffffff', backgroundColor: '#111111', padding: { x: 3, y: 1 }
        });
        card.add([name, lv]);

        if (isUnlocked) {
            hit.setInteractive({ useHandCursor: true });
            hit.on('pointerdown', () => this.showCharDetails(char));
        } else if (char.recipeOnly || char.hiddenEnding) {
            hit.setInteractive({ useHandCursor: true });
            hit.on('pointerdown', () => this.showLockedRecipeHint(char));
        }
    }

    private buildRecipeThumb(
        card: Phaser.GameObjects.Container,
        recipe: Recipe,
        foundKeys: Set<string>,
        cardW: number,
        cardH: number
    ) {
        const key = recipe.ingredients.slice().sort().join('+');
        const discovered = foundKeys.has(key);
        const resultChar = this.characters.find(c => c.id === recipe.result);
        const rarity = resultChar?.rarity || 'Hidden';
        const inset = getRaritySleeveInset(rarity);
        const innerW = Math.round(cardW * (1 - inset * 2)) - 8;
        const innerH = Math.round(cardH * (1 - inset * 2)) - 8;

        const plate = this.add.rectangle(0, 0, innerW + 8, innerH + 8, discovered ? 0x1a2740 : 0x2a2a30).setOrigin(0.5);
        card.add(plate);
        const hit = this.add.rectangle(0, 0, cardW, cardH, 0x000000, 0.001).setOrigin(0.5);
        card.add(hit);
        addRaritySleeve(this, card, rarity, cardW + 6, cardH + 6);

        const typeLabel = recipe.type === 'mutation' ? '变异' : '催化';
        const title = this.add.text(0, -innerH / 2 + 16, typeLabel, {
            fontFamily: 'Arial Black', fontSize: 18, color: discovered ? '#99ccff' : '#888888'
        }).setOrigin(0.5);
        const resultName = discovered
            ? (resultChar?.name || recipe.result)
            : '尚未发现';
        const resultText = this.add.text(0, -innerH / 2 + 42, resultName, {
            fontFamily: 'Arial Black', fontSize: 16, color: discovered ? '#ffe082' : '#777777',
            align: 'center', wordWrap: { width: innerW, useAdvancedWrap: true }
        }).setOrigin(0.5);
        fitWrappedText(resultText, resultName, innerW, 36, 16, 12);

        const bodyRaw = discovered ? recipe.desc : (recipe.hint ? `梗：${recipe.hint}\n？ + ？` : '？ + ？');
        const body = this.add.text(0, 12, bodyRaw, {
            fontFamily: 'Arial', fontSize: 13, color: '#ffffff', align: 'center',
            wordWrap: { width: innerW, useAdvancedWrap: true }, lineSpacing: 3
        }).setOrigin(0.5, 0);
        fitWrappedText(body, bodyRaw, innerW, innerH / 2 - 16, 13, 12);
        card.add([title, resultText, body]);

        hit.setInteractive({ useHandCursor: true });
        hit.on('pointerdown', () => this.showRecipeDetails(recipe, discovered));
    }

    private getEndingRouteLabel(char: Character): string {
        switch (char.unlockBy) {
            case 'true_ending_cyber': return '真结局·赛博科幻';
            case 'true_ending_ancient': return '真结局·古风经典';
            case 'true_ending_anime': return '真结局·动漫 Mania';
            case 'true_ending_myth': return '真结局·神话传说';
            case 'harmony': return '宇宙大和谐';
            default: return '未达成终局';
        }
    }

    private getUnlockHintText(char: Character): string {
        if (char.recipeOnly) return '解锁条件：合成对应配方';
        switch (char.unlockBy) {
            case 'true_ending_cyber':
                return '解锁条件：达成真结局·赛博科幻';
            case 'true_ending_ancient':
                return '解锁条件：达成真结局·古风经典';
            case 'true_ending_anime':
                return '解锁条件：达成真结局·动漫 Mania';
            case 'true_ending_myth':
                return '解锁条件：达成真结局·神话传说';
            case 'harmony':
                return '解锁条件：达成宇宙大和谐';
            default:
                return '解锁条件：达成对应终局';
        }
    }

    private showCharDetails(char: Character) {
        const overlay = this.add.rectangle(360, 640, 720, 1280, 0x000000, 0.9).setOrigin(0.5).setInteractive();
        const extras = (char.hiddenEnding || char.recipeOnly) ? [this.getUnlockHintText(char)] : [];
        const detailsContainer = buildCharacterCard(this, char, {
            x: 360,
            y: 620,
            width: 540,
            height: 780,
            extraLines: extras
        });
        const closeText = this.add.text(360, 1088, '点击任意处关闭', {
            fontFamily: 'Arial', fontSize: '22px', color: '#aaaaaa'
        }).setOrigin(0.5);
        overlay.on('pointerdown', () => {
            overlay.destroy();
            detailsContainer.destroy();
            closeText.destroy();
        });
    }

    private showLockedRecipeHint(char: Character) {
        const overlay = this.add.rectangle(360, 640, 720, 1280, 0x000000, 0.86).setOrigin(0.5).setInteractive();
        const card = this.add.container(360, 640);
        const bg = this.add.rectangle(0, 0, 480, 280, 0x1a1a28).setStrokeStyle(4, 0xffd700);
        const title = this.add.text(0, -70, char.hiddenEnding ? '真结局收藏' : '隐藏角色', {
            fontFamily: 'Arial Black', fontSize: 32, color: '#ffd700'
        }).setOrigin(0.5);
        const body = this.add.text(0, 20, '', {
            fontFamily: 'Arial', fontSize: 22, color: '#ffffff', align: 'center'
        }).setOrigin(0.5);
        fitWrappedText(body, `Lv.${char.level} 的真名尚未解锁。\n${this.getUnlockHintText(char)}`, 400, 160, 22, 16);
        card.add([bg, title, body]);
        overlay.on('pointerdown', () => {
            overlay.destroy();
            card.destroy();
        });
    }

    private showBossDetails(boss: BossData) {
        const overlay = this.add.rectangle(360, 640, 720, 1280, 0x000000, 0.9).setOrigin(0.5).setInteractive();
        const detailsContainer = this.add.container(360, 640);
        
        const cardWidth = 560;
        const cardHeight = 840;
        const innerWidth = Math.round(cardWidth * 0.82);

        const bg = this.add.rectangle(0, 0, cardWidth, cardHeight, 0x880000);
        bg.setStrokeStyle(6, 0xff0000);
        detailsContainer.add(bg);

        const headerBg = this.add.rectangle(0, -cardHeight / 2 + 40, cardWidth, 80, 0x000000, 0.8);
        detailsContainer.add(headerBg);

        const topInfo = this.add.text(-innerWidth / 2, -cardHeight / 2 + 24, `BOSS | HP: ${boss.maxHp}`, {
            fontFamily: 'Arial', fontSize: '22px', color: '#ff4444', fontStyle: 'bold'
        }).setOrigin(0, 0.5);
        detailsContainer.add(topInfo);

        const nameText = this.add.text(-innerWidth / 2, -cardHeight / 2 + 56, '', {
            fontFamily: 'Arial Black', fontSize: '28px', color: '#ffffff'
        }).setOrigin(0, 0.5);
        setCjkText(nameText, boss.name, innerWidth);
        detailsContainer.add(nameText);

        const imageSize = 280;
        const imageY = -90;
        const imageWindowBg = this.add.rectangle(0, imageY, imageSize, imageSize, 0x141018);
        imageWindowBg.setStrokeStyle(3, 0xd4af37, 0.85);
        detailsContainer.add(imageWindowBg);

        const fallback = this.add.text(0, imageY, 'BOSS', { fontSize: '72px', color: '#880000', fontStyle: 'bold' }).setOrigin(0.5);
        detailsContainer.add(fallback);
        attachPortrait(this, detailsContainer, boss.id, 0, imageY, imageSize - 20, imageSize - 20, { fallback });

        const closeText = this.add.text(0, cardHeight / 2 + 36, '点击任意处关闭', {
            fontFamily: 'Arial', fontSize: '24px', color: '#aaaaaa'
        }).setOrigin(0.5);
        detailsContainer.add(closeText);

        const textTop = imageY + imageSize / 2 + 16;
        const textBottom = cardHeight / 2 - 36;
        const copy: CopyBlock[] = [];

        if (boss.skill && boss.skill.name) {
            const skillTitle = this.add.text(-innerWidth / 2, textTop, '', {
                fontFamily: 'Arial', fontSize: '18px', color: '#ffffff', fontStyle: 'bold'
            }).setOrigin(0, 0);
            detailsContainer.add(skillTitle);
            copy.push({ text: skillTitle, raw: `[专属技能: ${boss.skill.name}]`, maxFont: 18, minFont: 14, gapAfter: 6, keep: 3 });

            const skillDesc = this.add.text(-innerWidth / 2, textTop, '', {
                fontFamily: 'Arial', fontSize: '16px', color: '#ffcccc'
            }).setOrigin(0, 0);
            detailsContainer.add(skillDesc);
            copy.push({ text: skillDesc, raw: boss.skill.desc, maxFont: 16, minFont: 13, gapAfter: 10, keep: 2 });
        }

        if (boss.weakness && boss.weakness.length > 0) {
            const weaknessNames = boss.weakness.map(id => {
                const char = this.characters.find(c => c.id === id);
                return char ? char.name : id;
            }).join(' / ');
            const weakness = this.add.text(-innerWidth / 2, textTop, '', {
                fontFamily: 'Arial', fontSize: '16px', color: '#ffdd00'
            }).setOrigin(0, 0);
            detailsContainer.add(weakness);
            copy.push({ text: weakness, raw: `核心弱点：${weaknessNames}`, maxFont: 16, minFont: 13, gapAfter: 10, keep: 3 });
        }

        const lore = this.add.text(-innerWidth / 2, textTop, '', {
            fontFamily: 'Arial', fontSize: '16px', color: '#ffffff'
        }).setOrigin(0, 0);
        detailsContainer.add(lore);
        copy.push({
            text: lore,
            raw: boss.description || '一个未知的强大敌人。',
            maxFont: 16,
            minFont: 13,
            gapAfter: 0,
            keep: 1
        });

        layoutCopyStack(copy, textTop, textBottom, innerWidth);

        overlay.on('pointerdown', () => {
            overlay.destroy();
            detailsContainer.destroy();
        });
    }

    private showRecipeDetails(recipe: Recipe, discovered: boolean) {
        const overlay = this.add.rectangle(360, 640, 720, 1280, 0x000000, 0.88).setOrigin(0.5).setInteractive();
        const box = this.add.container(360, 640);
        const bg = this.add.rectangle(0, 0, 560, 420, 0x1a2233, 0.98).setStrokeStyle(3, discovered ? 0x99ccff : 0x666666);
        const title = this.add.text(0, -160, discovered ? (recipe.type === 'mutation' ? '变异配方' : '催化配方') : '未发现配方', {
            fontFamily: 'Arial Black', fontSize: 32, color: discovered ? '#99ccff' : '#888888'
        }).setOrigin(0.5);
        const items = (this.cache.json.get('items') as Array<{ id: string; name?: string }>) || [];
        const aliases: Record<string, string> = { any_horse: '任意马' };
        const nameOf = (id: string) => aliases[id] || this.characters.find(c => c.id === id)?.name || items.find(i => i.id === id)?.name || id;
        const body = discovered
            ? `${recipe.desc}\n\n材料：${recipe.ingredients.map(nameOf).join(' + ')}\n结果：${nameOf(recipe.result)}`
            : `${recipe.hint ? `梗：${recipe.hint}\n` : ''}材料：？ + ？\n结果尚未现身。`;
        const text = this.add.text(0, 10, body, {
            fontFamily: 'Arial', fontSize: 22, color: '#ffffff', align: 'center',
            wordWrap: { width: 480, useAdvancedWrap: true }, lineSpacing: 6
        }).setOrigin(0.5);
        fitWrappedText(text, body, 480, 240, 22, 16);
        const hint = this.add.text(0, 170, '点击任意处关闭', {
            fontFamily: 'Arial', fontSize: 18, color: '#aaaaaa'
        }).setOrigin(0.5);
        box.add([bg, title, text, hint]);
        overlay.on('pointerdown', () => {
            overlay.destroy();
            box.destroy();
        });
    }

    private buildProgressLine() {
        const publicChars = this.characters.filter(c => !c.hiddenEnding);
        const endings = this.characters.filter(c => c.hiddenEnding && (c.unlockBy || '').startsWith('true_ending'));
        const foundKeys = new Set(this.saveManager.getRecipesFound());
        const unlockedChars = publicChars.filter(c => this.saveManager.isCharacterUnlocked(c.id)).length;
        const foundRecipes = this.recipes.filter(r => foundKeys.has(r.ingredients.slice().sort().join('+'))).length;
        const unlockedEndings = endings.filter(c => this.saveManager.isCharacterUnlocked(c.id)).length;
        return {
            summary: `角色 ${unlockedChars}/${publicChars.length} · 配方 ${foundRecipes}/${this.recipes.length} · 真结局 ${unlockedEndings}/${Math.max(4, endings.length)}`,
            missingChars: publicChars.filter(c => !this.saveManager.isCharacterUnlocked(c.id)).slice(0, 8).map(c => c.recipeOnly ? '配方隐藏' : `Lv.${c.level}`),
            missingRecipes: this.recipes
                .filter(r => !foundKeys.has(r.ingredients.slice().sort().join('+')))
                .map(r => r.hint || '半遮的梗'),
            missingEndings: endings.filter(c => !this.saveManager.isCharacterUnlocked(c.id)).map(c => this.getEndingRouteLabel(c))
        };
    }

    private showProgressGaps(info: ReturnType<Gallery['buildProgressLine']>) {
        const overlay = this.add.rectangle(360, 640, 720, 1280, 0x000000, 0.86).setOrigin(0.5).setInteractive();
        const box = this.add.container(360, 640);
        const bg = this.add.rectangle(0, 0, 600, 640, 0x1a1a28).setStrokeStyle(3, 0xffd700);
        const title = this.add.text(0, -270, '还差什么', {
            fontFamily: 'Arial Black', fontSize: 32, color: '#ffd700'
        }).setOrigin(0.5);
        const body = [
            info.missingChars.length ? `未解锁角色：${info.missingChars.join('、')}` : '公开角色已齐。',
            info.missingRecipes.length ? `未发现配方梗：${info.missingRecipes.join('、')}` : '配方已齐。',
            info.missingEndings.length ? `未达成终局：${info.missingEndings.join('、')}` : '四条真结局已齐。'
        ].join('\n\n');
        const text = this.add.text(0, 10, body, {
            fontFamily: 'Arial', fontSize: 20, color: '#ffffff', align: 'center',
            wordWrap: { width: 520, useAdvancedWrap: true }, lineSpacing: 6
        }).setOrigin(0.5);
        const hint = this.add.text(0, 270, '未发现配方只给梗，不露真名', {
            fontFamily: 'Arial', fontSize: 16, color: '#aaaaaa'
        }).setOrigin(0.5);
        box.add([bg, title, text, hint]);
        overlay.on('pointerdown', () => {
            overlay.destroy();
            box.destroy();
        });
    }
}
