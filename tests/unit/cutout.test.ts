import { describe, expect, it } from 'vitest';
import { alphaBBox, fitSize, dropSpecks, type Pixels } from '../../src/photo/cutout.ts';

const px = (w: number, h: number, f: (x: number, y: number) => number[]): Pixels => {
  const data = new Uint8ClampedArray(w * h * 4);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) data.set(f(x, y), (y * w + x) * 4);
  return { data, width: w, height: h };
};
const alphaAt = (p: Pixels, x: number, y: number) => p.data[(y * p.width + x) * 4 + 3];

describe('alphaBBox', () => {
  it('finds the opaque region and ignores faint alpha', () => {
    const p = px(10, 8, (x, y) => (x >= 2 && x <= 4 && y >= 3 && y <= 6 ? [9, 9, 9, 255] : [9, 9, 9, 100]));
    expect(alphaBBox(p)).toEqual({ x: 2, y: 3, w: 3, h: 4 });
  });
  it('returns null for an empty mask', () => {
    expect(alphaBBox(px(4, 4, () => [0, 0, 0, 0]))).toBeNull();
  });
});

describe('fitSize', () => {
  it('keeps aspect ratio inside the slot and never upscales', () => {
    expect(fitSize(200, 400, 28, 42)).toEqual({ w: 21, h: 42 });
    expect(fitSize(400, 100, 28, 42)).toEqual({ w: 28, h: 7 });
    expect(fitSize(10, 10, 28, 42)).toEqual({ w: 10, h: 10 });
  });
});

describe('dropSpecks', () => {
  it('drops specks, treating diagonal neighbours as connected, and keeps soft alpha', () => {
    const rows = ['#.#....', '.#.....', '..#.###', '...#.##'];
    const p = px(7, 4, (x, y) => (rows[y][x] === '#' ? [5, 6, 7, x === 0 ? 200 : 255] : [0, 0, 0, 0]));
    dropSpecks(p); // 4-pixel diagonal chain vs a 5-pixel blob: both over 2%
    expect(alphaAt(p, 0, 0)).toBe(200);
    expect(alphaAt(p, 5, 2)).toBe(255);
  });
  it('keeps two big blobs across a gap and removes a tiny speck', () => {
    // 12x12 blobs (144 px each) 3 columns apart; a 1 px speck is under 2% of 144
    const p = px(30, 12, (x, y) => (x < 12 || (x >= 15 && x < 27) || (x === 29 && y === 0) ? [5, 6, 7, 255] : [0, 0, 0, 0]));
    dropSpecks(p);
    expect(alphaAt(p, 5, 5)).toBe(255);
    expect(alphaAt(p, 20, 5)).toBe(255);
    expect(alphaAt(p, 29, 0)).toBe(0);
  });
});
