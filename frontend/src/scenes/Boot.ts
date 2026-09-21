import { Scene } from 'phaser';

export class Boot extends Scene {
    constructor() {
        super('Boot');
    }

    preload() {
        // Load Game Data JSONs first
        this.load.json('characters', 'assets/data/characters.json');
        this.load.json('recipes', 'assets/data/recipes.json');
        this.load.json('items', 'assets/data/items.json');
        this.load.json('bosses', 'assets/data/bosses.json');
        this.load.json('balance', 'assets/data/balance.json');
        this.load.json('chapters', 'assets/data/chapters.json');
    }

    create() {
        this.scene.start('Preloader');
    }
}
