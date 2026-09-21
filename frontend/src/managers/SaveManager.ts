export class SaveManager {
    private static readonly STORAGE_KEY_UNLOCKED = 'horse_merge_unlocked_chars';
    private static readonly STORAGE_KEY_HIGHSCORE = 'horse_merge_highscore';
    private static readonly STORAGE_KEY_GOLD = 'horse_merge_gold';
    private static readonly STORAGE_KEY_LEGACY_GOLD = 'horse_merge_legacy_gold';
    private static readonly STORAGE_KEY_RECIPES = 'horse_merge_recipes_found';
    private static readonly STORAGE_KEY_DAILY_PREFIX = 'horse_merge_daily_';
    private static readonly STORAGE_KEY_DAILY_GOLD = 'horse_merge_daily_gold_';
    private static readonly STORAGE_KEY_SEEN_GUESTS = 'horse_merge_seen_guests';

    private unlockedChars: Set<string>;
    private highscore: number;
    private gold: number;
    private legacyGold: number;
    private recipesFound: Set<string>;
    private seenGuests: Set<string>;

    constructor() {
        this.unlockedChars = new Set(this.loadJSON<string[]>(SaveManager.STORAGE_KEY_UNLOCKED, []));
        this.highscore = this.loadNumber(SaveManager.STORAGE_KEY_HIGHSCORE, 0);
        this.legacyGold = this.loadNumber(SaveManager.STORAGE_KEY_LEGACY_GOLD, -1);
        this.gold = this.loadNumber(SaveManager.STORAGE_KEY_GOLD, 1000);
        this.recipesFound = new Set(this.loadJSON<string[]>(SaveManager.STORAGE_KEY_RECIPES, []));
        this.seenGuests = new Set(this.loadJSON<string[]>(SaveManager.STORAGE_KEY_SEEN_GUESTS, []));
        this.migrateLegacyGoldIfNeeded();
    }

    private migrateLegacyGoldIfNeeded() {
        if (this.legacyGold >= 0) return;
        this.legacyGold = Math.min(this.gold, 2000);
        this.gold = 1000;
        this.saveNumber(SaveManager.STORAGE_KEY_LEGACY_GOLD, this.legacyGold);
        this.saveNumber(SaveManager.STORAGE_KEY_GOLD, this.gold);
    }

    public isCharacterUnlocked(id: string): boolean {
        return this.unlockedChars.has(id);
    }

    public getUnlockedCharacters(): string[] {
        return Array.from(this.unlockedChars);
    }

    public unlockCharacter(id: string): boolean {
        if (!this.unlockedChars.has(id)) {
            this.unlockedChars.add(id);
            this.saveJSON(SaveManager.STORAGE_KEY_UNLOCKED, Array.from(this.unlockedChars));
            return true;
        }
        return false;
    }

    public getHighscore(): number {
        return this.highscore;
    }

    public setHighscore(score: number) {
        if (score > this.highscore) {
            this.highscore = score;
            this.saveNumber(SaveManager.STORAGE_KEY_HIGHSCORE, this.highscore);
            return true;
        }
        return false;
    }

    /** @deprecated use getLegacyGold for cross-run purchases */
    public getGold(): number {
        return this.legacyGold;
    }

    public getLegacyGold(): number {
        return this.legacyGold;
    }

    public setLegacyGold(amount: number) {
        this.legacyGold = Math.max(0, Math.min(amount, 2000));
        this.saveNumber(SaveManager.STORAGE_KEY_LEGACY_GOLD, this.legacyGold);
    }

    public addLegacyGold(amount: number) {
        this.setLegacyGold(this.legacyGold + amount);
    }

    public setGold(amount: number) {
        this.setLegacyGold(amount);
    }

    public addGold(amount: number) {
        this.addLegacyGold(amount);
    }

    public isRecipeFound(recipeKey: string): boolean {
        return this.recipesFound.has(recipeKey);
    }

    public markRecipeFound(recipeKey: string): boolean {
        if (this.recipesFound.has(recipeKey)) return false;
        this.recipesFound.add(recipeKey);
        this.saveJSON(SaveManager.STORAGE_KEY_RECIPES, Array.from(this.recipesFound));
        return true;
    }

    public getRecipesFound(): string[] {
        return Array.from(this.recipesFound);
    }

    public getDailyBest(dateKey: string): number {
        return this.loadNumber(`${SaveManager.STORAGE_KEY_DAILY_PREFIX}${dateKey}`, 0);
    }

    public setDailyBest(dateKey: string, score: number) {
        const current = this.getDailyBest(dateKey);
        if (score > current) {
            this.saveNumber(`${SaveManager.STORAGE_KEY_DAILY_PREFIX}${dateKey}`, score);
        }
    }

    public getDailyGold(dateKey: string, fallback = 1000): number {
        const storedDate = localStorage.getItem(`${SaveManager.STORAGE_KEY_DAILY_GOLD}date`);
        if (storedDate !== dateKey) {
            this.setDailyGold(dateKey, fallback);
            return fallback;
        }
        return this.loadNumber(`${SaveManager.STORAGE_KEY_DAILY_GOLD}${dateKey}`, fallback);
    }

    public setDailyGold(dateKey: string, amount: number) {
        localStorage.setItem(`${SaveManager.STORAGE_KEY_DAILY_GOLD}date`, dateKey);
        this.saveNumber(`${SaveManager.STORAGE_KEY_DAILY_GOLD}${dateKey}`, Math.max(0, amount));
    }

    public isGuestSeen(id: string): boolean {
        return this.seenGuests.has(id);
    }

    public markGuestSeen(id: string) {
        if (this.seenGuests.has(id)) return;
        this.seenGuests.add(id);
        this.saveJSON(SaveManager.STORAGE_KEY_SEEN_GUESTS, Array.from(this.seenGuests));
    }

    public getSeenGuests(): string[] {
        return Array.from(this.seenGuests);
    }

    private loadJSON<T>(key: string, defaultValue: T): T {
        const data = localStorage.getItem(key);
        return data ? JSON.parse(data) as T : defaultValue;
    }

    private saveJSON(key: string, value: unknown) {
        localStorage.setItem(key, JSON.stringify(value));
    }

    private loadNumber(key: string, defaultValue: number): number {
        const data = localStorage.getItem(key);
        return data ? parseInt(data, 10) : defaultValue;
    }

    private saveNumber(key: string, value: number) {
        localStorage.setItem(key, value.toString());
    }
}
