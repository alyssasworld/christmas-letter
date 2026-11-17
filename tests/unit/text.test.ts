import { describe, expect, it } from 'vitest';
import { clampMessage, clampName, fitText, layoutLine, sanitize, wrapMessage } from '../../src/render/text.ts';

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
    const f = fitText(['Merry Christmas &', 'Love, Your Name'], measure, 1188, 1080);
    expect(Number.isInteger(f.n)).toBe(true);
    expect(f.fits).toBe(true);
    const widest = 17 * 12.5 + 12;
    expect(widest * f.n).toBeLessThanOrEqual(1188);
    expect(widest * (f.n + 1)).toBeGreaterThan(1188);
  });
  it('goes fractional rather than overflow', () => {
    const f = fitText(['a'.repeat(22)], measure, 100, 100);
    expect(f.n).toBeLessThan(1);
    expect(f.fits).toBe(true);
  });
  it('is limited by height too', () => expect(fitText(['hi'], measure, 10000, 300).n).toBe(1));
});
