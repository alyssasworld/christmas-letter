import { describe, expect, it } from 'vitest';
import { DOME, PHOTO_SLOT } from '../../src/assets/manifest.ts';
import { photoSize } from '../../src/render/globeScene.ts';

const inGlass = (x: number, y: number) => ((x - DOME.cx) / DOME.rx) ** 2 + ((y - DOME.cy) / DOME.ry) ** 2 <= 1;
const corners = ({ w, h }: { w: number; h: number }) => {
  const { x, bottom } = PHOTO_SLOT;
  return [
    [x - w / 2, bottom - h],
    [x + w / 2, bottom - h],
    [x - w / 2, bottom],
    [x + w / 2, bottom],
  ];
};

describe('photoSize', () => {
  it('caps a tall photo at maxH', () => expect(photoSize(397, 528).h).toBeCloseTo(PHOTO_SLOT.maxH));
  it('lets a wide pose grow past the tree width, limited by the glass', () => {
    const s = photoSize(576, 299); // arms out, both peace signs up
    expect(s.w).toBeGreaterThan(48);
    expect(s.h).toBeGreaterThan(30);
  });
  it.each([
    [397, 528],
    [576, 299],
    [1000, 100],
    [100, 1000],
    [1, 1],
  ])('keeps every corner of a %sx%s photo inside the glass and within the sprite width', (w, h) => {
    const s = photoSize(w, h);
    for (const [cx, cy] of corners(s)) expect(inGlass(cx, cy)).toBe(true);
    expect(s.w).toBeLessThanOrEqual(PHOTO_SLOT.maxW);
    expect(s.h).toBeLessThanOrEqual(PHOTO_SLOT.maxH + 1e-9);
  });
});
