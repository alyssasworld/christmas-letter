import { describe, expect, it } from 'vitest';
import { DOME, GROUND_Y } from '../../src/assets/manifest.ts';
import { createSnow, shake, stepSnow } from '../../src/render/snow.ts';

const mulberry32 = (a: number) => () => {
  a = (a + 0x6d2b79f5) | 0;
  let t = Math.imul(a ^ (a >>> 15), 1 | a);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};
const run = (s: ReturnType<typeof createSnow>, steps: number) => {
  for (let i = 0; i < steps; i++) stepSnow(s, 1 / 60);
};

describe('snow', () => {
  it('keeps every flake inside the dome and above the ground after a full shake', () => {
    const s = createSnow(90, mulberry32(1));
    shake(s, 1);
    for (let i = 0; i < 600; i++) {
      stepSnow(s, 1 / 60);
      for (const f of s.flakes) {
        expect(((f.x - DOME.cx) / DOME.rx) ** 2 + ((f.y - DOME.cy) / DOME.ry) ** 2).toBeLessThanOrEqual(1);
        expect(f.y).toBeLessThanOrEqual(GROUND_Y);
      }
    }
  });

  it('halves energy every 1.2 s', () => {
    const s = createSnow(10, mulberry32(2));
    s.energy = 1;
    run(s, 72);
    expect(Math.abs(s.energy - 0.5)).toBeLessThan(0.005);
  });

  it('calm globe: every flake is falling or resting on the ground', () => {
    const s = createSnow(90, mulberry32(3));
    run(s, 600);
    for (const f of s.flakes) {
      if (f.rest > 0) expect(f.y).toBeGreaterThanOrEqual(GROUND_Y - 4);
      else expect(f.vy).toBeGreaterThan(0);
    }
  });
});
