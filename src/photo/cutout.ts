// Photo -> full-colour cut-out sprite (SPEC §4.3, owner override: no pixelation or palette). The pixel-array helpers take ImageData-like objects so they run without a DOM.
import { PHOTO_SLOT } from '../assets/manifest.ts';
import { PALETTE } from '../palette.ts';
import { segment } from './segment.ts';

export interface Pixels {
  data: Uint8ClampedArray<ArrayBuffer>;
  width: number;
  height: number;
}
export interface Box {
  x: number;
  y: number;
  w: number;
  h: number;
}

/** Bounding box of pixels with alpha > 128, or null if there are none. */
export function alphaBBox({ data, width, height }: Pixels): Box | null {
  let x0 = width,
    y0 = height,
    x1 = -1,
    y1 = -1;
  for (let y = 0; y < height; y++)
    for (let x = 0; x < width; x++)
      if (data[(y * width + x) * 4 + 3] > 128) {
        x0 = Math.min(x0, x);
        x1 = Math.max(x1, x);
        y0 = Math.min(y0, y);
        y1 = Math.max(y1, y);
      }
  return x1 < 0 ? null : { x: x0, y: y0, w: x1 - x0 + 1, h: y1 - y0 + 1 };
}

/** Largest size within maxW x maxH that keeps the aspect ratio; never upscales. */
export function fitSize(w: number, h: number, maxW: number, maxH: number) {
  const k = Math.min(maxW / w, maxH / h, 1);
  return { w: Math.max(1, Math.round(w * k)), h: Math.max(1, Math.round(h * k)) };
}

/** In place: zero every pixel (alpha, thresholded at 128) in 8-connected components under 2% of the largest one's size, so a held cat or a loosely joined arm survives; kept pixels are untouched. */
export function dropSpecks({ data, width, height }: Pixels) {
  const label = new Int32Array(width * height); // 0 = unvisited/transparent
  const stack: number[] = [];
  const sizes = [0]; // sizes[label]
  let n = 0;
  for (let s = 0; s < label.length; s++) {
    if (label[s] || data[s * 4 + 3] <= 128) continue;
    n++;
    let size = 0;
    label[s] = n;
    stack.push(s);
    while (stack.length) {
      const i = stack.pop()!;
      size++;
      const x = i % width;
      const y = (i - x) / width;
      for (let dy = -1; dy <= 1; dy++)
        for (let dx = -1; dx <= 1; dx++) {
          const nx = x + dx;
          const ny = y + dy;
          if (nx < 0 || ny < 0 || nx >= width || ny >= height) continue;
          const j = ny * width + nx;
          if (label[j] || data[j * 4 + 3] <= 128) continue;
          label[j] = n;
          stack.push(j);
        }
    }
    sizes.push(size);
  }
  const min = Math.max(...sizes) * 0.02;
  for (let i = 0; i < label.length; i++) if (sizes[label[i]] < min) data.fill(0, i * 4, i * 4 + 4);
}

/** Area-average-ish downscale: halve repeatedly with smoothing on, then a final step (keeps faces from going noisy). */
function scale(
  src: CanvasImageSource & { width: number; height: number },
  sx: number,
  sy: number,
  sw: number,
  sh: number,
  w: number,
  h: number,
) {
  let cx = sx,
    cy = sy,
    cw = sw,
    ch = sh;
  let from: CanvasImageSource = src;
  while (cw / 2 > w && ch / 2 > h) {
    const c = document.createElement('canvas');
    c.width = Math.ceil(cw / 2);
    c.height = Math.ceil(ch / 2);
    c.getContext('2d')!.drawImage(from, cx, cy, cw, ch, 0, 0, c.width, c.height);
    [from, cx, cy, cw, ch] = [c, 0, 0, c.width, c.height];
  }
  const out = document.createElement('canvas');
  out.width = w;
  out.height = h;
  out.getContext('2d')!.drawImage(from, cx, cy, cw, ch, 0, 0, w, h);
  return out;
}

const pixels = (c: HTMLCanvasElement) => c.getContext('2d')!.getImageData(0, 0, c.width, c.height);

export const MAX_BYTES = 25 * 1024 * 1024;
export const MAX_SIDE = 1024;
// Enough for the biggest globe scale (12 device px per art px); smaller scales downsample it smoothly.
const FALLBACK_SIDE = 30 * 12; // framed-square fallback keeps its old 30 art px so it doesn't hide the tree
export const MAX_SPRITE = { w: PHOTO_SLOT.maxW * 12, h: PHOTO_SLOT.maxH * 12 };

/** Throws if the image can't be decoded. */
export async function decode(blob: Blob): Promise<ImageBitmap> {
  if (!blob.type.startsWith('image/')) throw new Error('not an image');
  if (blob.size > MAX_BYTES) throw new Error('too big');
  return createImageBitmap(blob);
}

/** Full-colour cut-out (soft alpha edges, no pixelation), or a thinly framed square photo if segmentation fails or finds (almost) nothing. */
export async function makeSprite(bmp: ImageBitmap): Promise<{ sprite: ImageBitmap; fallback: boolean }> {
  try {
    const k = Math.min(1, MAX_SIDE / Math.max(bmp.width, bmp.height));
    const small = scale(bmp, 0, 0, bmp.width, bmp.height, Math.max(1, Math.round(bmp.width * k)), Math.max(1, Math.round(bmp.height * k)));
    const cut = await segment(await createImageBitmap(small));
    const cutBmp = cut instanceof Blob ? await createImageBitmap(cut) : cut;
    const full = document.createElement('canvas');
    full.width = cutBmp.width;
    full.height = cutBmp.height;
    const g = full.getContext('2d')!;
    g.drawImage(cutBmp, 0, 0);
    const img = g.getImageData(0, 0, full.width, full.height);
    dropSpecks(img);
    g.putImageData(img, 0, 0);
    const box = alphaBBox(img);
    if (!box || box.w * box.h < cutBmp.width * cutBmp.height * 0.01) throw new Error('empty mask');
    const f = fitSize(box.w, box.h, MAX_SPRITE.w, MAX_SPRITE.h);
    return { sprite: await createImageBitmap(scale(full, box.x, box.y, box.w, box.h, f.w, f.h)), fallback: false };
  } catch {
    const s = Math.min(bmp.width, bmp.height);
    const side = FALLBACK_SIDE;
    const c = scale(bmp, (bmp.width - s) >> 1, (bmp.height - s) >> 1, s, s, side, side);
    const g = c.getContext('2d')!;
    g.strokeStyle = PALETTE.cream;
    g.lineWidth = 16; // ~1 art px at the top scale; half is clipped by the canvas edge
    g.strokeRect(0, 0, side, side);
    return { sprite: await createImageBitmap(c), fallback: true };
  }
}
