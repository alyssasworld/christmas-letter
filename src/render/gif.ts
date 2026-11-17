// Save GIF (SPEC §3.2): renders the letter offline, deterministically, and encodes it with gifenc.
// This whole module is lazy-loaded on click, so gifenc never touches the first-load bundle.
import { applyPalette, GIFEncoder, quantize } from 'gifenc';
import { ASSETS } from '../assets/manifest.ts';
import { PALETTE } from '../palette.ts';
import { seeded } from '../ui/handwritten.ts';
import { drawGlobe, type GlobeImages } from './globeScene.ts';
import { LETTER, renderStatic, type LetterImages, type Orientation } from './letterScene.ts';
import { createSnow, shake, stepSnow } from './snow.ts';

export const GIF_FPS = 15;
export const GIF_FRAMES = 60; // 4 s
export const SIM_PER_FRAME = 60 / GIF_FPS; // the sim runs at 60 Hz
export const MAX_BYTES = 3_000_000;
const MAX_FRAME_PIXELS = 1_000_000; // keeps a 60 frame GIF near the size budget and the encode to seconds

/** Integer scales to try, largest first: capped by the letter's own scale, 3 on touch devices, and the pixel budget. */
export function exportScales(letterScale: number, coarse: boolean, o: Orientation) {
  const { w, h } = LETTER[o];
  const top = Math.max(1, Math.min(letterScale, coarse ? 3 : Infinity, Math.floor(Math.sqrt(MAX_FRAME_PIXELS / (w * h)))));
  return Array.from({ length: top }, (_, i) => top - i);
}

/** Frame f's cat frame: the cat animates at its own 4 fps. */
export const catFrameAt = (f: number) => Math.floor((f / GIF_FPS) * ASSETS.cat.fps);

const hex = (c: string) => [1, 3, 5].map((i) => parseInt(c.slice(i, i + 2), 16));
const RESERVED = [...new Set(Object.values(PALETTE))].map(hex); // pixel-art colours stay exact

interface Job {
  img: GlobeImages;
  letterImg: LetterImages;
  o: Orientation;
  message: string;
  name: string;
}

class OverBudget extends Error {}

/** Draws frames 0..GIF_FRAMES-1 in order; the sim, its RNG and the shake burst are the same on every call. */
function* frames({ img, letterImg, o, message, name }: Job, s: number) {
  const layer = document.createElement('canvas');
  renderStatic(layer, letterImg, o, s, message, name);
  const cv = document.createElement('canvas');
  cv.width = layer.width;
  cv.height = layer.height;
  const ctx = cv.getContext('2d', { willReadFrequently: true })!;
  const sim = createSnow(45, seeded(7));
  shake(sim, 0.8);
  const g = LETTER[o].globe;
  for (let f = 0; f < GIF_FRAMES; f++) {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = PALETTE.cream; // GIF has no soft alpha; the corners sit on paper colour
    ctx.fillRect(0, 0, cv.width, cv.height);
    ctx.drawImage(layer, 0, 0);
    drawGlobe(ctx, img, s, catFrameAt(f), sim, g.x * s, g.y * s);
    yield { f, w: cv.width, h: cv.height, data: ctx.getImageData(0, 0, cv.width, cv.height).data };
    for (let i = 0; i < SIM_PER_FRAME; i++) stepSnow(sim, 1 / 60);
  }
}

const tick = () => new Promise((r) => setTimeout(r, 0)); // let the page breathe between frames

async function encode(job: Job, s: number, onProgress: (done: number) => void) {
  // one global palette from the first, middle and last frames, so colours never flicker
  const samples: Uint8ClampedArray[] = [];
  for (const fr of frames(job, s)) if ([0, GIF_FRAMES / 2, GIF_FRAMES - 1].includes(fr.f)) samples.push(fr.data);
  const all = new Uint8ClampedArray(samples.reduce((n, d) => n + d.length, 0));
  let at = 0;
  for (const d of samples) (all.set(d, at), (at += d.length));
  const palette = [...RESERVED, ...quantize(all, 256 - RESERVED.length)];

  const gif = GIFEncoder();
  for (const { f, w, h, data } of frames(job, s)) {
    gif.writeFrame(applyPalette(data, palette), w, h, { palette: f === 0 ? palette : undefined, delay: 1000 / GIF_FPS, repeat: 0 });
    if (gif.bytesView().length > MAX_BYTES) throw new OverBudget();
    onProgress(f + 1);
    await tick();
  }
  gif.finish();
  return gif.bytes();
}

/** Encodes the letter; if a scale comes out over budget, tries the next lower integer scale. */
export async function encodeLetterGif(job: Job, letterScale: number, coarse: boolean, onProgress: (done: number, total: number) => void) {
  const scales = exportScales(letterScale, coarse, job.o);
  for (const s of scales) {
    try {
      const bytes = await encode(job, s, (n) => onProgress(n, GIF_FRAMES));
      return { blob: new Blob([bytes], { type: 'image/gif' }), scale: s };
    } catch (e) {
      if (!(e instanceof OverBudget) || s === 1) throw e;
    }
  }
  throw new Error('unreachable');
}
