import { describe, expect, it } from 'vitest';
import { catFrameAt, exportScales, GIF_FPS, GIF_FRAMES, SIM_PER_FRAME } from '../../src/render/gif.ts';

describe('gif schedule', () => {
  it('is 4 s at 15 fps with a whole number of 60 Hz steps per frame', () => {
    expect(GIF_FRAMES / GIF_FPS).toBe(4);
    expect(Number.isInteger(SIM_PER_FRAME)).toBe(true);
  });
  it('the cat cycle divides the loop, so it loops seamlessly', () => {
    expect([0, 4, 5, 10, 15, 59].map(catFrameAt)).toEqual([0, 0, 1, 2, 0, 2]);
    expect(catFrameAt(GIF_FRAMES)).toBe(catFrameAt(0)); // the frame after the last is the first again
  });
});

describe('exportScales', () => {
  it('lists integer scales from the largest down to 1', () => {
    const s = exportScales(3, false, 'landscape');
    expect(s).toEqual([3, 2, 1]);
  });
  it('caps at 3 on touch devices', () => expect(exportScales(8, true, 'portrait')[0]).toBe(3));
  it('caps big letters by the pixel budget, even on desktop', () => {
    expect(exportScales(9, false, 'landscape')[0]).toBe(4);
    expect(exportScales(9, false, 'portrait')[0]).toBe(5);
  });
  it('never returns less than 1', () => expect(exportScales(1, false, 'landscape')).toEqual([1]));
});
