import { Scene } from 'phaser';
import { Character, Item } from '../types';
import { CharacterAssetLoader } from '../managers/CharacterAssetLoader';
import { punchRaritySleeveCenters } from '../utils/style';

export const IMG_EXT = '.webp';

export class Preloader extends Scene {
    constructor() {
        super('Preloader');
    }

    preload() {
        this.load.setPath('assets');
        this.generateParticleTextures();

        const characters: Character[] = this.cache.json.get('characters');
        const items: Item[] = this.cache.json.get('items');
        const bosses: any[] = this.cache.json.get('bosses');

        // Raise initial load band so early mid-game portraits exist before Game deferred load.
        const initialChars = characters.filter(c =>
            c.level <= 35 || c.hiddenEnding || c.recipeOnly || c.id === 'cosmic_one'
        );

        initialChars.forEach(char => this.loadCharacterAssets(char));
        bosses?.forEach(boss => this.loadBossAssets(boss));
        items.forEach(item => {
            if (this.textureExistsOnDisk(`sprites/items/${item.id}${IMG_EXT}`)) {
                this.load.image(item.id, `sprites/items/${item.id}${IMG_EXT}`);
            }
        });

        this.loadUiAssets();

        const progressBar = this.add.graphics();
        const progressBox = this.add.graphics();
        progressBox.fillStyle(0x222222, 0.8);
        progressBox.fillRect(210, 600, 300, 50);
        const loadingText = this.make.text({ x: 360, y: 560, text: '正在备马', style: { font: '24px monospace', color: '#ffd700' } }).setOrigin(0.5);
        this.tryLoadBgm();
        const percentText = this.make.text({ x: 360, y: 625, text: '0%', style: { font: '18px monospace', color: '#ffffff' } }).setOrigin(0.5);

        this.load.on('loaderror', (file: { key?: string }) => {
            if (file?.key?.startsWith('bgm_') && this.cache.audio.exists(file.key)) {
                this.cache.audio.remove(file.key);
            }
        });

        this.load.on('progress', (value: number) => {
            percentText.setText(`${Math.floor(value * 100)}%`);
            progressBar.clear();
            progressBar.fillStyle(0xffffff, 1);
            progressBar.fillRect(220, 610, 280 * value, 30);
        });

        this.load.on('complete', () => {
            CharacterAssetLoader.ensureAnimations(this, characters.filter(c =>
                c.level <= 35 || c.hiddenEnding || c.recipeOnly || c.id === 'cosmic_one'
            ));
            progressBar.destroy();
            progressBox.destroy();
            loadingText.destroy();
            percentText.destroy();
        });
    }

    create() {
        punchRaritySleeveCenters(this);
        this.scene.start('MainMenu');
    }

    /** @deprecated Use CharacterAssetLoader.startLoadIfNeeded on an active scene (MainMenu/Game). */
    public startBackgroundCharacterLoads() {
        // Preloader is stopped after create(); loader calls here are no-ops.
    }

    private textureExistsOnDisk(_path: string) {
        return true;
    }

    private loadCharacterAssets(char: Character) {
        const assetId = char.assetId || char.id;
        this.load.image(char.id, `sprites/characters/${assetId}${IMG_EXT}`);
        if (!char.hiddenEnding) {
            this.load.image(`${char.id}_action_sheet`, `sprites/characters/${assetId}_action${IMG_EXT}`);
        }
    }

    private loadBossAssets(boss: { id: string }) {
        this.load.image(boss.id, `sprites/characters/${boss.id}${IMG_EXT}`);
        this.load.image(`${boss.id}_action_sheet`, `sprites/characters/${boss.id}_action${IMG_EXT}`);
    }

    private tryLoadBgm() {
        ['standard', 'finale', 'nearDeath', 'trueEnding'].forEach(palette => {
            this.load.audio(`bgm_${palette}`, `audio/bgm_${palette}.ogg`);
        });
    }

    private loadUiAssets() {
        const uiKeys = [
            'bg_main_menu', 'bg_game_grid', 'bg_gallery', 'ui_panel_9slice', 'top_bar_bg',
            'icon_coin', 'icon_score', 'icon_shop', 'icon_freeze', 'icon_fire', 'icon_stone',
            'icon_magma', 'icon_shadow', 'icon_devour', 'icon_poison', 'ui_inventory_bg',
            'ui_shop_bg', 'ui_slot_frame', 'ui_info_panel', 'chapter_banner_tier',
            'boss_briefing_panel', 'harmony_progress_panel', 'ending_choice_card',
            'unlock_harmony_badge', 'border_n', 'border_r', 'border_sr', 'border_ssr', 'border_hidden'
        ];
        uiKeys.forEach(key => this.load.image(key, `ui/${key}${IMG_EXT}`));
        this.load.image('flare', 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAgAAAAICAYAAADED76LAAAAGXRFWHRTb2Z0d2FyZQBBZG9iZSBJbWFnZVJlYWR5ccllPAAAAD1JREFUeNpiYGBg+M+AAxYs42QA0TAxB4aGI4QMQ4YgA+j84QgwMDIy4lOOUR+MgzgFUItA/gcl/iMEDAAAFvYQ0u1L00QAAAAASUVORK5CYII=');
    }

    private generateParticleTextures() {
        if (this.textures.exists('particle_star')) return;
        const g = this.add.graphics();
        g.fillStyle(0xffffff, 1);
        g.fillCircle(16, 16, 10);
        g.generateTexture('particle_star', 32, 32);
        g.destroy();

        const smoke = this.add.graphics();
        smoke.fillStyle(0x888888, 0.7);
        smoke.fillCircle(16, 16, 12);
        smoke.generateTexture('particle_smoke', 32, 32);
        smoke.destroy();
    }
}
