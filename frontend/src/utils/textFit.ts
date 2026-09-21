import Phaser from 'phaser';

const NO_LINE_START = '，。！？、；：…,.!?;:）】」』》%';
const ORPHAN_PUNCT = /^[，。！？、；：…,.!?;:）】」』》\s]+$/;

function fontCss(text: Phaser.GameObjects.Text): string {
    const style = text.style;
    const size = typeof style.fontSize === 'number' ? `${style.fontSize}px` : String(style.fontSize || '16px');
    const italic = style.fontStyle || 'normal';
    return `${italic} ${size} ${style.fontFamily || 'Arial'}`;
}

function measureWidth(text: Phaser.GameObjects.Text, sample: string): number {
    const ctx = text.context;
    ctx.font = fontCss(text);
    return ctx.measureText(sample).width;
}

/** Wrap CJK by pixel width; keep punctuation with the previous character. */
export function wrapCjk(source: string, text: Phaser.GameObjects.Text, maxW: number): string[] {
    const width = Math.max(24, maxW);
    const paragraphs = String(source || '').replace(/\r/g, '').split('\n');
    const lines: string[] = [];

    for (const para of paragraphs) {
        if (!para) {
            lines.push('');
            continue;
        }
        const chars = [...para];
        let line = '';
        for (const ch of chars) {
            const trial = line + ch;
            if (line && measureWidth(text, trial) > width) {
                if (NO_LINE_START.includes(ch)) {
                    line += ch;
                    lines.push(line);
                    line = '';
                } else {
                    lines.push(line);
                    line = ch;
                }
            } else {
                line = trial;
            }
        }
        if (line) lines.push(line);
    }

    const merged: string[] = [];
    for (const line of lines) {
        if (merged.length && ORPHAN_PUNCT.test(line)) {
            merged[merged.length - 1] += line.trimStart();
        } else {
            merged.push(line);
        }
    }
    return merged;
}

export function setCjkText(text: Phaser.GameObjects.Text, raw: string, maxW: number) {
    text.setWordWrapWidth(0);
    text.setText(wrapCjk(raw, text, maxW).join('\n'));
}

/** Shrink / wrap / ellipsis a Phaser text so it stays inside a box. */
export function fitWrappedText(
    text: Phaser.GameObjects.Text,
    raw: string,
    maxW: number,
    maxH: number,
    maxFont: number,
    minFont: number
) {
    const source = raw || '';
    for (let size = maxFont; size >= minFont; size--) {
        text.setFontSize(size);
        setCjkText(text, source, maxW);
        if (text.height <= maxH) return;
    }
    let clipped = source;
    while (clipped.length > 1 && text.height > maxH) {
        clipped = clipped.slice(0, -1);
        setCjkText(text, `${clipped}…`, maxW);
    }
}

export interface CopyBlock {
    text: Phaser.GameObjects.Text;
    raw: string;
    maxFont: number;
    minFont: number;
    gapAfter: number;
    /** Lower numbers are truncated first when space runs out. */
    keep: number;
}

/** Stack several wrapped texts into a vertical budget. */
export function layoutCopyStack(blocks: CopyBlock[], startY: number, maxBottom: number, maxW: number) {
    if (!blocks.length) return startY;
    const contents = blocks.map(block => block.raw || '');
    let scale = 1;

    const paint = () => {
        let y = startY;
        for (let i = 0; i < blocks.length; i++) {
            const block = blocks[i];
            const size = Math.max(block.minFont, Math.round(block.maxFont * scale));
            block.text.setFontSize(size);
            setCjkText(block.text, contents[i], maxW);
            block.text.setY(y);
            y += block.text.height + block.gapAfter;
        }
        return y - (blocks[blocks.length - 1]?.gapAfter || 0);
    };

    let end = paint();
    while (end > maxBottom && scale > 0.72) {
        scale -= 0.08;
        end = paint();
    }

    if (end > maxBottom) {
        const order = blocks
            .map((_, i) => i)
            .sort((a, b) => blocks[a].keep - blocks[b].keep);
        for (const i of order) {
            while (contents[i].length > 2 && end > maxBottom) {
                contents[i] = `${contents[i].slice(0, -2)}…`;
                end = paint();
            }
            if (end <= maxBottom) break;
        }
    }

    return end;
}
