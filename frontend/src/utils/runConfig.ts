import { EndingRouteStyle, RunConfig, RunMode } from '../types';

export const SHORT_MODES: RunMode[] = ['sprint', 'bossRush', 'recipeHunt'];

export function isShortMode(mode: RunMode): boolean {
    return SHORT_MODES.includes(mode);
}

export function usesDailyWallet(mode: RunMode): boolean {
    return mode === 'daily' || isShortMode(mode);
}

export function persistSlotForMode(mode: RunMode): 'standard' | 'side' {
    return mode === 'standard' ? 'standard' : 'side';
}

export function normalizeRunConfig(data: Partial<RunConfig> & { bossId?: string; continueRun?: boolean; dailySeed?: string; startItems?: string[] } = {}): RunConfig {
    let mode: RunMode = data.mode || 'standard';
    if (!data.mode && data.dailySeed) mode = 'daily';
    return {
        mode,
        continueRun: !!data.continueRun,
        dailySeed: data.dailySeed,
        startItems: data.startItems || [],
        bossId: data.bossId,
        guestId: data.guestId,
        routeLock: data.routeLock
    };
}

export const ROUTE_BUTTONS: Array<{ style: EndingRouteStyle; label: string }> = [
    { style: 'cyberSciFi', label: '赛博' },
    { style: 'ancientClassic', label: '古风' },
    { style: 'animeMania', label: '动漫' },
    { style: 'mythLegend', label: '神话' }
];

export const MODE_LABELS: Record<RunMode, string> = {
    standard: '标准局',
    daily: '今日挑战',
    sprint: '三十步冲分',
    bossRush: 'Boss Rush',
    recipeHunt: '配方猎人'
};
