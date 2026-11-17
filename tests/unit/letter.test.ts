import { describe, expect, it } from 'vitest';
import { layoutLetter, LETTER } from '../../src/render/letterScene.ts';
import { uiPixel } from '../../src/render/scale.ts';
import { VIEWPORTS } from '../e2e/viewports.ts';

describe('layoutLetter', () => {
  for (const vp of VIEWPORTS) {
    it(`${vp.w}x${vp.h}@${vp.dpr}`, () => {
      const L = layoutLetter(vp, uiPixel(vp.dpr));
      expect(L.orientation).toBe(vp.w >= vp.h ? 'landscape' : 'portrait');
      expect(Number.isInteger(L.scale) && L.scale >= 1).toBe(true);
      // fits the viewport (unless already at the 1x minimum)
      if (L.scale > 1) {
        expect(L.w * L.scale).toBeLessThanOrEqual(vp.w * vp.dpr);
        expect(L.h * L.scale).toBeLessThanOrEqual(vp.h * vp.dpr - 16 * uiPixel(vp.dpr) - 8 * vp.dpr);
      }
    });
  }
  it('sizes are multiples of 8 so the stripes tile', () => {
    for (const o of Object.values(LETTER)) expect([o.w % 8, o.h % 8]).toEqual([0, 0]);
  });
});
