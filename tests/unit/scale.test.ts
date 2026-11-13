import { describe, expect, it } from 'vitest';
import { layoutGlobe, pickVariant } from '../../src/render/scale.ts';

// SPEC §7 matrix, both orientations, at typical DPRs.
const SIZES: [number, number, number][] = [
  [320, 568, 2],
  [375, 667, 2],
  [390, 844, 3],
  [430, 932, 3],
  [768, 1024, 2],
  [1024, 768, 2],
  [1280, 800, 2],
  [1440, 900, 2],
  [1920, 1080, 1],
  [2560, 1440, 1],
];
// both orientations, de-duplicated (768x1024 and 1024x768 are both already listed)
const VIEWPORTS = [
  ...new Map(
    SIZES.flatMap(([w, h, dpr]) => [
      [w, h, dpr],
      [h, w, dpr],
    ]).map((v) => [v.join(), v]),
  ).values(),
].map(([w, h, dpr]) => ({ w, h, dpr }));

describe('pickVariant', () => {
  it('matches aspect ratio', () => {
    expect(pickVariant(390, 844)).toBe('mobile');
    expect(pickVariant(1920, 1080)).toBe('desktop');
    expect(pickVariant(1440, 900)).toBe('laptop');
  });
});

describe('layoutGlobe', () => {
  for (const vp of VIEWPORTS) {
    it(`${vp.w}x${vp.h}@${vp.dpr}`, () => {
      const L = layoutGlobe(vp);
      const W = vp.w * vp.dpr,
        H = vp.h * vp.dpr;
      for (const k of ['bgScale', 'globeScale', 'textPx', 'uiPx'] as const) expect(Number.isInteger(L[k]) && L[k] >= 1).toBe(true);
      // background covers the viewport
      expect(L.bgX).toBeLessThanOrEqual(0);
      expect(L.bgY).toBeLessThanOrEqual(0);
      // globe fully on screen horizontally, and its top (cat included) below the corner icons
      expect(L.globeX).toBeGreaterThanOrEqual(0);
      expect(L.globeX + 96 * L.globeScale).toBeLessThanOrEqual(W);
      expect(L.globeY).toBeGreaterThan(0);
      // room under the anchor line for the buttons and footer
      expect(H - L.anchorY - 8 * L.globeScale).toBeGreaterThanOrEqual(120 * vp.dpr - 1);
      // never bigger than the background's pixels
      expect(L.globeScale).toBeLessThanOrEqual(L.bgScale);
    });
  }
});
