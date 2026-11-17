import { describe, expect, it } from 'vitest';
import { catFrameAt, exportScales, GIF_FPS, GIF_FRAMES, SIM_PER_FRAME } from '../../src/render/gif.ts';

describe('gif schedule', () => {
  it('is 4 s at 15 fps with a whole number of 60 Hz steps per frame', () => {
    expect(GIF_FRAMES / GIF_FPS).toBe(4);
    expect(Number.isInteger(SIM_PER_FRAME)).toBe(true);
  });
  it('cat advances at 4 fps', () => {
    expect([0, 3, 4, 7, 60].map(catFrameAt)).toEqual([0, 0, 1, 1, 16]);
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
