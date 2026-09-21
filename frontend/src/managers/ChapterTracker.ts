import { ChapterDefinition, ChapterObjective } from '../types';

export interface ChapterProgress {
    completed: Set<string>;
    rewarded: Set<string>;
}

export class ChapterTracker {
    private chapters: ChapterDefinition[];
    private progress: ChapterProgress;
    private counters: Record<string, number> = {
        skill_use: 0,
        boss_defeats: 0,
        combo_max: 0,
        recipe_mutation: 0,
        harmony: 0
    };

    constructor(chapters: ChapterDefinition[], savedDone: string[] = []) {
        this.chapters = chapters;
        this.progress = {
            completed: new Set(savedDone),
            rewarded: new Set(savedDone)
        };
    }

    getCurrentChapter(maxLevel: number): ChapterDefinition {
        if (maxLevel >= 91) return this.chapters.find(c => c.id === 'chapter_harmony') || this.chapters[0];
        if (maxLevel >= 76) return this.chapters.find(c => c.id === 'chapter_star') || this.chapters[0];
        if (maxLevel >= 46) return this.chapters.find(c => c.id === 'chapter_myth') || this.chapters[0];
        if (maxLevel >= 16) return this.chapters.find(c => c.id === 'chapter_mutation') || this.chapters[0];
        return this.chapters.find(c => c.id === 'chapter_start') || this.chapters[0];
    }

    getActiveObjective(chapter: ChapterDefinition): ChapterObjective | null {
        return chapter.objectives.find(o => !this.progress.completed.has(o.id)) || null;
    }

    getCompletedCount(): number {
        return this.progress.completed.size;
    }

    getTotalCount(): number {
        return this.chapters.reduce((sum, c) => sum + c.objectives.length, 0);
    }

    getDoneIds(): string[] {
        return Array.from(this.progress.completed);
    }

    onReachLevel(level: number): { objective: ChapterObjective; reward: number } | null {
        return this.completeByType('reach_level', level);
    }

    onBossDefeated(bossId: string): { objective: ChapterObjective; reward: number } | null {
        this.counters.boss_defeats++;
        const byBoss = this.completeObjective('defeat_boss', bossId);
        if (byBoss) return byBoss;
        return this.completeByType('boss_defeats', this.counters.boss_defeats);
    }

    onCombo(combo: number): { objective: ChapterObjective; reward: number } | null {
        this.counters.combo_max = Math.max(this.counters.combo_max, combo);
        return this.completeByType('combo', this.counters.combo_max);
    }

    onSkillUse(): { objective: ChapterObjective; reward: number } | null {
        this.counters.skill_use++;
        return this.completeByType('skill_use', this.counters.skill_use);
    }

    onRecipeMutation(): { objective: ChapterObjective; reward: number } | null {
        this.counters.recipe_mutation++;
        return this.completeByType('recipe_mutation', this.counters.recipe_mutation);
    }

    onHarmony(): { objective: ChapterObjective; reward: number } | null {
        this.counters.harmony = 1;
        return this.completeByType('harmony', 1);
    }

    private completeByType(type: string, value: number | string): { objective: ChapterObjective; reward: number } | null {
        for (const chapter of this.chapters) {
            for (const obj of chapter.objectives) {
                if (this.progress.completed.has(obj.id)) continue;
                if (obj.type !== type) continue;
                if (obj.type === 'defeat_boss') continue;
                if (typeof obj.target === 'number' && typeof value === 'number' && value >= obj.target) {
                    return this.markDone(obj);
                }
            }
        }
        return null;
    }

    private completeObjective(type: string, target: string | number): { objective: ChapterObjective; reward: number } | null {
        for (const chapter of this.chapters) {
            for (const obj of chapter.objectives) {
                if (this.progress.completed.has(obj.id)) continue;
                if (obj.type === type && obj.target === target) {
                    return this.markDone(obj);
                }
            }
        }
        return null;
    }

    private markDone(obj: ChapterObjective): { objective: ChapterObjective; reward: number } {
        this.progress.completed.add(obj.id);
        return { objective: obj, reward: obj.reward };
    }
}
