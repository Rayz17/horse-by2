import { Character, SkillBossAction, SkillProfile } from '../types';

const TYPE_DEFAULTS: Record<string, Omit<SkillProfile, 'type'>> = {
    arch_economy: { trigger: 'manual', tags: ['wealth'], priority: 'resource' },
    arch_clear_low: { trigger: 'manual', tags: ['purify'], priority: 'cleanup' },
    arch_snipe: { trigger: 'manual', tags: ['strike'], priority: 'boss' },
    arch_bomb: { trigger: 'manual', tags: ['strike', 'chaos'], priority: 'board' },
    arch_transform: { trigger: 'manual', tags: ['chaos'], priority: 'board' },
    arch_freeze: { trigger: 'manual', tags: ['purify', 'control'], priority: 'boss' },
    arch_shuffle: { trigger: 'manual', tags: ['chaos'], priority: 'board' },
    arch_heal: { trigger: 'manual', tags: ['purify'], priority: 'support' },
    arch_upgrade: { trigger: 'manual', tags: ['myth'], priority: 'growth' },
    arch_summon: { trigger: 'manual', tags: ['myth'], priority: 'summon' },
    sig_dacha: { trigger: 'manual', tags: ['purify', 'mystery'], priority: 'support' },
    sig_jiaban: { trigger: 'manual', tags: ['wealth', 'machine'], priority: 'resource' },
    sig_debug: { trigger: 'manual', tags: ['purify', 'machine'], priority: 'cleanup' },
    sig_huiwu: { trigger: 'manual', tags: ['chaos', 'myth'], priority: 'board' },
    sig_ecosystem: { trigger: 'manual', tags: ['wealth', 'chaos'], priority: 'board' },
    sig_tothemoon: { trigger: 'manual', tags: ['wealth', 'machine'], priority: 'boss' },
    sig_pollute: { trigger: 'manual', tags: ['chaos', 'mystery'], priority: 'board' },
    sig_censor: { trigger: 'manual', tags: ['chaos', 'mystery'], priority: 'board' },
    sig_derby: { trigger: 'manual', tags: ['strike', 'myth'], priority: 'board' },
    sig_cosmic: { trigger: 'manual', tags: ['myth', 'harmony'], priority: 'board' },
    sig_harmony: { trigger: 'on_endgame', tags: ['myth', 'machine', 'harmony'], priority: 'ending' },
    sig_cannon: { trigger: 'manual', tags: ['strike', 'machine'], priority: 'board' },
    sig_zankanto: { trigger: 'manual', tags: ['strike', 'machine'], priority: 'boss' },
    sig_sekiba: { trigger: 'manual', tags: ['strike', 'myth'], priority: 'boss' },
    sig_meteor: { trigger: 'manual', tags: ['strike', 'myth'], priority: 'board' }
};

function uniq(values: string[]): string[] {
    return Array.from(new Set(values));
}

export function resolveSkillProfile(char: Character | null | undefined): SkillProfile {
    const fallback: SkillProfile = {
        type: 'arch_snipe',
        trigger: 'manual',
        tags: ['strike'],
        priority: 'board'
    };

    if (!char) return fallback;

    const type = char.skill?.type || fallback.type;
    const defaults = TYPE_DEFAULTS[type] || fallback;
    const explicitTags = char.skill?.tags || [];
    const tags = [...defaults.tags, ...explicitTags];

    if (char.level >= 91) tags.push('myth');
    if (char.level >= 101) tags.push('harmony');
    if (char.rarity === 'Hidden') tags.push('mystery');
    if (/(mech|tech|android|cyber|debug|mars)/.test(char.id)) tags.push('machine');
    if (/(qilin|god|sun|sky|bifrost|spirit|sleipnir|cosmic)/.test(char.id)) tags.push('myth');

    return {
        type,
        trigger: char.skill?.trigger || defaults.trigger,
        tags: uniq(tags),
        priority: char.skill?.priority || defaults.priority
    };
}

const TAG_LABELS: Record<string, string> = {
    wealth: '财富',
    purify: '净化',
    chaos: '混沌',
    strike: '克制',
    machine: '机械',
    myth: '神话',
    harmony: '大和谐',
    mystery: '隐秘',
    control: '掌控'
};

export function getDominantTagLabel(tag: string): string {
    return TAG_LABELS[tag] || '命运';
}

const AIMED_SKILL_TYPES = new Set([
    'sig_pollute',
    'sig_censor'
]);

export function skillNeedsAim(type: string): boolean {
    return AIMED_SKILL_TYPES.has(type);
}

const BOSS_SKILL_COUNTERS: Record<string, SkillBossAction[]> = {
    fire_patch: [{ kind: 'clear_effect', effectType: 'fire' }],
    stone_wall: [{ kind: 'clear_effect', effectType: 'stone' }],
    magma_floor: [{ kind: 'clear_effect', effectType: 'magma' }],
    shadow_clone: [{ kind: 'clear_effect', effectType: 'shadow' }],
    blizzard_freeze: [{ kind: 'break_invincible' }, { kind: 'unfreeze_all' }],
    devour_grid: [{ kind: 'clear_effect', effectType: 'devour' }]
};

export function getBossWeaknessActions(bossSkillId: string | undefined): SkillBossAction[] {
    if (!bossSkillId) return [];
    return BOSS_SKILL_COUNTERS[bossSkillId] ? [...BOSS_SKILL_COUNTERS[bossSkillId]] : [];
}
