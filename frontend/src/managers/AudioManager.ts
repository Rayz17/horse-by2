import balanceConfig from '../data/balance.json';

export type BgmPalette = 'standard' | 'finale' | 'nearDeath' | 'trueEnding';

const PALETTES: Record<BgmPalette, number[]> = {
    standard: [110, 164.81, 220],
    finale: [130.81, 196, 261.63],
    nearDeath: [98, 123.47, 146.83],
    trueEnding: [174.61, 220, 329.63]
};

export class AudioManager {
    private ctx: AudioContext | null = null;
    private muted = false;
    private volume = 0.7;
    private bgmNodes: { osc: OscillatorNode; gain: GainNode }[] = [];
    private bgmPlaying = false;
    private bgmPalette: BgmPalette = 'standard';
    private fileBgm: HTMLAudioElement | null = null;
    private static readonly MUTE_KEY = 'horse_merge_muted';
    private static readonly VOLUME_KEY = 'horse_merge_volume';

    constructor() {
        // localStorage 在隐私模式下可能抛异常；音量键从未写入时取 balance.json 的默认值
        // （此前 Number(null)=0 会让新玩家一开始就处于静音音量）。
        const fallback = Number(balanceConfig.audio?.defaultVolume ?? 0.7);
        try {
            this.muted = localStorage.getItem(AudioManager.MUTE_KEY) === '1';
            const storedRaw = localStorage.getItem(AudioManager.VOLUME_KEY);
            const storedVolume = storedRaw === null ? NaN : Number(storedRaw);
            this.volume = Number.isFinite(storedVolume)
                ? Math.min(1, Math.max(0, storedVolume))
                : fallback;
        } catch (err) {
            console.warn('AudioManager: localStorage unavailable, using defaults', err);
            this.muted = false;
            this.volume = fallback;
        }
    }

    isMuted() {
        return this.muted;
    }

    getVolume() {
        return this.volume;
    }

    setVolume(volume: number) {
        this.volume = Math.min(1, Math.max(0, volume));
        try {
            localStorage.setItem(AudioManager.VOLUME_KEY, String(this.volume));
        } catch { /* privacy mode */ }
        this.bgmNodes.forEach(({ gain }, i) => {
            gain.gain.value = this.effectiveGain(i === 0 ? 0.012 : 0.008);
        });
        if (this.fileBgm) this.fileBgm.volume = this.muted ? 0 : this.volume * 0.35;
    }

    setMuted(muted: boolean) {
        this.muted = muted;
        try {
            localStorage.setItem(AudioManager.MUTE_KEY, muted ? '1' : '0');
        } catch { /* privacy mode */ }
        if (muted) this.stopBgm();
        else if (this.ctx) void this.playBgm(this.bgmPalette);
    }

    toggleMuted() {
        this.setMuted(!this.muted);
        return this.muted;
    }

    async ensureContext() {
        if (!this.ctx) {
            this.ctx = new AudioContext();
        }
        if (this.ctx.state === 'suspended') {
            await this.ctx.resume();
        }
        return this.ctx;
    }

    private effectiveGain(base: number) {
        if (this.muted) return 0;
        return base * this.volume;
    }

    private tone(freq: number, durationMs: number, type: OscillatorType = 'sine', gain = 0.08, when = 0) {
        if (this.muted || !this.ctx) return;
        const osc = this.ctx.createOscillator();
        const g = this.ctx.createGain();
        osc.type = type;
        osc.frequency.value = freq;
        g.gain.value = gain * this.volume;
        osc.connect(g);
        g.connect(this.ctx.destination);
        const t = this.ctx.currentTime + when;
        osc.start(t);
        g.gain.exponentialRampToValueAtTime(0.001, t + durationMs / 1000);
        osc.stop(t + durationMs / 1000);
    }

    async play(name: string, pitch = 1) {
        await this.ensureContext();
        if (this.muted || !this.ctx) return;
        switch (name) {
            case 'merge':
                this.tone(440 * pitch, 60);
                this.tone(660 * pitch, 60, 'sine', 0.06, 0.04);
                break;
            case 'spawn':
                this.tone(220 * pitch, 40, 'triangle', 0.05);
                break;
            case 'critical':
                this.tone(440 * pitch, 50);
                this.tone(554 * pitch, 50, 'sine', 0.06, 0.05);
                this.tone(660 * pitch, 80, 'sine', 0.07, 0.1);
                break;
            case 'combo':
                this.tone(523 * pitch, 50, 'square', 0.05);
                break;
            case 'skill':
                this.tone(300, 100, 'sawtooth', 0.04);
                this.tone(900, 120, 'sawtooth', 0.03, 0.08);
                break;
            case 'boss_hit':
                this.tone(110, 100, 'square', 0.07);
                break;
            case 'boss_defeat':
                this.tone(440, 80);
                this.tone(330, 100, 'sine', 0.06, 0.08);
                this.tone(220, 140, 'sine', 0.05, 0.16);
                break;
            case 'unlock':
                [261, 294, 330, 392, 440].forEach((f, i) => this.tone(f, 70, 'sine', 0.05, i * 0.07));
                break;
            case 'click':
                this.tone(1000, 20, 'square', 0.03);
                break;
            case 'gameover':
                this.tone(330, 120);
                this.tone(220, 180, 'sine', 0.06, 0.12);
                break;
            case 'true_ending':
                [261, 329, 392].forEach((f, i) => this.tone(f, 220, 'sine', 0.06, i * 0.12));
                break;
            case 'milestone':
                this.tone(392, 120, 'triangle', 0.06);
                this.tone(523, 180, 'triangle', 0.05, 0.1);
                break;
        }
    }

    attachFileBgm(el: HTMLAudioElement | null) {
        this.stopFileBgm();
        this.fileBgm = el;
        if (el) {
            el.loop = true;
            el.volume = this.muted ? 0 : this.volume * 0.35;
        }
    }

    private stopFileBgm() {
        if (this.fileBgm) {
            this.fileBgm.pause();
            this.fileBgm = null;
        }
    }

    async playBgm(palette: BgmPalette = 'standard') {
        await this.ensureContext();
        if (this.muted || !this.ctx) return;
        if (this.fileBgm) {
            this.bgmPalette = palette;
            this.stopOscillatorBgm();
            void this.fileBgm.play().catch(() => {
                this.fileBgm = null;
                void this.playOscillatorBgm(palette);
            });
            return;
        }
        if (this.bgmPlaying && this.bgmPalette === palette) return;
        this.stopOscillatorBgm();
        await this.playOscillatorBgm(palette);
    }

    private async playOscillatorBgm(palette: BgmPalette) {
        if (!this.ctx || this.muted) return;
        this.bgmPlaying = true;
        this.bgmPalette = palette;
        const freqs = PALETTES[palette] || PALETTES.standard;
        this.bgmNodes = freqs.map((freq, i) => {
            const osc = this.ctx!.createOscillator();
            const gain = this.ctx!.createGain();
            osc.type = palette === 'nearDeath' ? 'sawtooth' : i === 0 ? 'triangle' : 'sine';
            osc.frequency.value = freq;
            gain.gain.value = this.effectiveGain(i === 0 ? 0.012 : 0.008);
            osc.connect(gain);
            gain.connect(this.ctx!.destination);
            osc.start();
            return { osc, gain };
        });
    }

    private stopOscillatorBgm() {
        this.bgmNodes.forEach(({ osc, gain }) => {
            try {
                gain.gain.exponentialRampToValueAtTime(0.001, (this.ctx?.currentTime || 0) + 0.2);
                osc.stop((this.ctx?.currentTime || 0) + 0.25);
            } catch {
                // already stopped
            }
        });
        this.bgmNodes = [];
        this.bgmPlaying = false;
    }

    stopBgm() {
        this.stopFileBgm();
        this.stopOscillatorBgm();
    }
}
