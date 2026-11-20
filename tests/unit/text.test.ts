import { describe, expect, it } from 'vitest';
import {
  NOTE_COLS,
  NOTE_ROWS,
  NOTE_SCALE,
  noteGlyphScale,
  clampMessage,
  clampName,
  clampNote,
  fitText,
  layoutLine,
  sanitize,
  wrapMessage,
} from '../../src/render/text.ts';

describe('sanitize', () => {
  it('keeps ASCII, Latin-1 accents and curly punctuation', () => {
    expect(sanitize('Café “Noël” – ok…')).toBe('Café “Noël” – ok…');
  });
  it('strips accents Pixelta lacks, drops emoji and symbols, collapses newlines', () => {
    expect(sanitize('Āna ♥ 😀\nx')).toBe('Ana   x');
  });
});

describe('wrapMessage', () => {
  it('wraps the default message into 2 lines', () => {
    expect(wrapMessage('Merry Christmas & a Happy New Year!')).toEqual(['Merry Christmas &', 'a Happy New Year!']);
  });
  it('hard-breaks words longer than 18', () => {
    expect(wrapMessage('a'.repeat(40))).toEqual(['a'.repeat(18), 'a'.repeat(18), 'aaaa']);
  });
});

describe('limits', () => {
  it('clampMessage never exceeds 3 lines or 54 characters', () => {
    const t = clampMessage('word '.repeat(60));
    expect(t.length).toBeLessThanOrEqual(54);
    expect(wrapMessage(t).length).toBeLessThanOrEqual(3);
    expect(wrapMessage(clampMessage('x'.repeat(200))).length).toBe(3);
  });
  it('clampName caps at 16', () => expect(clampName('n'.repeat(30))).toHaveLength(16));
});

describe('note', () => {
  it('clampNote caps at 60 chars and 2 lines of 30', () => {
    const t = clampNote('word '.repeat(40));
    expect(t.length).toBeLessThanOrEqual(60);
    expect(wrapMessage(t, NOTE_COLS).length).toBeLessThanOrEqual(NOTE_ROWS);
  });
  it('keeps a short note as is', () => expect(clampNote('Hi!')).toBe('Hi!'));
  it('emoji-only note sanitises to empty', () => expect(clampNote('🎄🎅')).toBe(''));
});

describe('layoutLine', () => {
  const adv = () => 12;
  it('is identical for the same seed', () => expect(layoutLine('Hello', adv, 11)).toEqual(layoutLine('Hello', adv, 11)));
  it('wobbles in whole font px', () => {
    for (const g of layoutLine('Merry Christmas', adv, 11).glyphs) expect(Number.isInteger(g.dy)).toBe(true);
  });
});

describe('fitText', () => {
  const measure = (l: string) => l.length * 12.5;
  it('picks the largest integer size whose widest line fits', () => {
    const f = fitText(['Merry Christmas &', 'Love, Your Name'], measure, 1188, 1080, 2);
    expect(Number.isInteger(f.n)).toBe(true);
    expect(f.fits).toBe(true);
    const widest = 17 * 12.5 + 12;
    expect(widest * f.n).toBeLessThanOrEqual(1188);
    expect(widest * (f.n + 1)).toBeGreaterThan(1188);
  });
  it('goes fractional rather than overflow', () => {
    const f = fitText(['a'.repeat(22)], measure, 100, 100, 1);
    expect(f.n).toBeLessThan(1);
    expect(f.fits).toBe(true);
  });
  it('reserves the greeting rows used plus the sign-off: 2 rows need 116 for n = 1, 232 for n = 2', () => {
    expect(fitText(['hi'], measure, 10000, 115, 2).n).toBeLessThan(1);
    expect(fitText(['hi'], measure, 10000, 116, 2).n).toBe(1);
    expect(fitText(['hi'], measure, 10000, 231, 2).n).toBe(1);
    expect(fitText(['hi'], measure, 10000, 232, 2).n).toBe(2);
  });
  it('a shorter greeting gets a bigger size, and zero rows count as one', () => {
    expect(fitText(['hi'], measure, 10000, 300, 1).n).toBe(3);
    expect(fitText(['hi'], measure, 10000, 300, 3).n).toBe(1);
    expect(fitText(['hi'], measure, 10000, 300, 0)).toEqual(fitText(['hi'], measure, 10000, 300, 1));
  });
  it('reserves height for note rows', () => {
    expect(fitText(['hi'], measure, 10000, 168, 2).n).toBe(1);
    const f = fitText(['hi'], measure, 10000, 168, 2, 2);
    expect(f.n).toBeLessThan(1);
    expect(f.fits).toBe(true);
  });
  it('is limited by height too', () => expect(fitText(['hi'], measure, 10000, 300, 3).n).toBe(1));
});

describe('noteGlyphScale', () => {
  it.each([0.5, 1, 2, 3, 6, 8])('never exceeds the budgeted size at n = %s', (n) => {
    expect(noteGlyphScale(n)).toBeLessThanOrEqual(n * NOTE_SCALE);
  });
  it('is a whole number once it reaches 1', () => {
    expect(noteGlyphScale(3)).toBe(1);
    expect(noteGlyphScale(6)).toBe(3);
  });
});
