// Pure snow simulation (SPEC §4.4): no DOM, so it can be unit-tested. Units are art px and seconds.
import { ASSETS, DOME, GROUND_Y } from '../assets/manifest.ts';

const FLAKE_PX = [1, 3, 5, 7]; // sheet cells 0..3
const GRAVITY = 12;
const DRAG = 1.5; // calm terminal speed = GRAVITY / DRAG = 8 px/s
const TURBULENCE = 800; // random accel at energy 1
const KICK = 120; // px/s per unit of shake amount
const DAMPEN = 0.5;
const REST_BEFORE_FADE = 3;
const FADE_TIME = 1.5;
const HALF_LIFE = 1.2;

export interface Flake {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  rest: number; // seconds resting on the ground; 0 = airborne
  alpha: number;
}
export interface Snow {
  flakes: Flake[];
  energy: number;
  calm: number; // strength multiplier for turbulence and kicks (0.5 under reduced motion)
  rand: () => number;
}

// Mostly 1px, some 3px, rare 5px; 7px is too big for a 96px globe.
const pickSize = (r: number) => (r < 0.7 ? 0 : r < 0.93 ? 1 : 2);

function spawn(s: Snow, f: Flake) {
  const { rand } = s;
  f.y = DOME.cy - DOME.ry * 0.9 + rand() * DOME.ry * 0.8;
  const half = DOME.rx * Math.sqrt(1 - ((f.y - DOME.cy) / DOME.ry) ** 2) * 0.9;
  f.x = DOME.cx + (rand() * 2 - 1) * half;
  f.vx = (rand() - 0.5) * 4;
  f.vy = 4 + rand() * 4;
  f.rest = 0;
  f.alpha = 1;
}

export function createSnow(count: number, rand = Math.random, calm = false): Snow {
  const s: Snow = { flakes: [], energy: 0, calm: calm ? 0.5 : 1, rand };
  for (let i = 0; i < count; i++) {
    const f = { x: 0, y: 0, vx: 0, vy: 0, size: pickSize(rand()), rest: 0, alpha: 1 };
    spawn(s, f);
    s.flakes.push(f);
  }
  return s;
}

export const addEnergy = (s: Snow, amount: number) => {
  s.energy = Math.min(1, s.energy + amount);
};

/** Adds energy and kicks every flake (resting ones lift off) randomly, plus a push along (dirX, dirY). */
export function shake(s: Snow, amount: number, dirX = 0, dirY = 0) {
  addEnergy(s, amount);
  const k = amount * KICK * s.calm;
  for (const f of s.flakes) {
    if (f.rest > 0) {
      f.rest = 0;
      f.alpha = 1;
      f.vy -= s.rand() * k;
    }
    f.vx += (s.rand() * 2 - 1) * k + dirX * k * 0.5;
    f.vy += (s.rand() * 2 - 1) * k + dirY * k * 0.5;
  }
}

export function stepSnow(s: Snow, dt: number) {
  s.energy *= 0.5 ** (dt / HALF_LIFE);
  const turb = TURBULENCE * s.energy * s.calm;
  const drag = Math.exp(-DRAG * dt);
  for (const f of s.flakes) {
    if (f.rest > 0) {
      f.rest += dt;
      if (f.rest > REST_BEFORE_FADE) f.alpha -= dt / FADE_TIME;
      if (f.alpha <= 0) spawn(s, f);
      continue;
    }
    f.vx = (f.vx + (s.rand() - 0.5) * turb * dt) * drag;
    f.vy = (f.vy + (GRAVITY + (s.rand() - 0.5) * turb) * dt) * drag;
    f.x += f.vx * dt;
    f.y += f.vy * dt;

    const nx = (f.x - DOME.cx) / DOME.rx;
    const ny = (f.y - DOME.cy) / DOME.ry;
    const d = Math.hypot(nx, ny);
    if (d > 0.97) {
      // reflect in unit-circle space so the ellipse behaves like a round wall
      const ux = nx / d;
      const uy = ny / d;
      const dot = (f.vx / DOME.rx) * ux + (f.vy / DOME.ry) * uy;
      if (dot > 0) {
        f.vx = (f.vx / DOME.rx - 2 * dot * ux) * DOME.rx * DAMPEN;
        f.vy = (f.vy / DOME.ry - 2 * dot * uy) * DOME.ry * DAMPEN;
      }
      f.x = DOME.cx + ux * 0.97 * DOME.rx;
      f.y = DOME.cy + uy * 0.97 * DOME.ry;
    }
    const floor = GROUND_Y - FLAKE_PX[f.size] / 2;
    if (f.y >= floor) {
      f.y = floor;
      f.vx = f.vy = 0;
      f.rest = dt + s.rand() * REST_BEFORE_FADE; // stagger respawns so calm drift is continuous, not in waves
    }
  }
}

export function drawSnow(ctx: CanvasRenderingContext2D, s: Snow, sheet: HTMLImageElement) {
  const c = ASSETS.snow.cell;
  ctx.imageSmoothingEnabled = false;
  for (const f of s.flakes) {
    ctx.globalAlpha = Math.round(f.alpha * 3) / 3;
    ctx.drawImage(sheet, f.size * c, 0, c, c, Math.round(f.x) - c / 2, Math.round(f.y) - c / 2, c, c);
  }
  ctx.globalAlpha = 1;
}
