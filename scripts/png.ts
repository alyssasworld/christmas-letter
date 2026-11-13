// Tiny RGBA canvas for code-drawn pixel art (no smoothing, no semi-transparency).
import fs from 'node:fs';
import { PNG } from 'pngjs';
import { PALETTE, type PaletteKey } from '../src/palette.ts';

export type Px = PaletteKey | null;

export class Img {
  w: number;
  h: number;
  data: Uint8Array;
  constructor(w: number, h: number) {
    this.w = w;
    this.h = h;
    this.data = new Uint8Array(w * h * 4);
  }
  set(x: number, y: number, c: Px) {
    x = Math.round(x);
    y = Math.round(y);
    if (x < 0 || y < 0 || x >= this.w || y >= this.h) return;
    const i = (y * this.w + x) * 4;
    if (c === null) return this.data.fill(0, i, i + 4);
    const hex = PALETTE[c];
    this.data.set([parseInt(hex.slice(1, 3), 16), parseInt(hex.slice(3, 5), 16), parseInt(hex.slice(5, 7), 16), 255], i);
  }
  rect(x: number, y: number, w: number, h: number, c: Px) {
    for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) this.set(i, j, c);
  }
  /** Draw a string bitmap; each char maps to a palette key via `key`, '.' = skip. */
  bitmap(x: number, y: number, rows: string[], key: Record<string, Px>) {
    rows.forEach((r, j) => [...r].forEach((ch, i) => ch !== '.' && this.set(x + i, y + j, key[ch])));
  }
  /** Copy another image (opaque pixels only) at an integer offset. */
  blit(src: Img, dx: number, dy: number, sx = 0, sy = 0, sw = src.w, sh = src.h) {
    for (let y = 0; y < sh; y++)
      for (let x = 0; x < sw; x++) {
        const si = ((sy + y) * src.w + sx + x) * 4;
        if (!src.data[si + 3]) continue;
        const tx = dx + x, ty = dy + y;
        if (tx < 0 || ty < 0 || tx >= this.w || ty >= this.h) continue;
        this.data.set(src.data.subarray(si, si + 4), (ty * this.w + tx) * 4);
      }
  }
  /** Nearest-neighbour upscale by an integer factor. */
  scaled(k: number) {
    if (!Number.isInteger(k)) throw new Error('non-integer scale');
    const o = new Img(this.w * k, this.h * k);
    for (let y = 0; y < o.h; y++)
      for (let x = 0; x < o.w; x++) {
        const si = (((y / k) | 0) * this.w + ((x / k) | 0)) * 4;
        o.data.set(this.data.subarray(si, si + 4), (y * o.w + x) * 4);
      }
    return o;
  }
  save(path: string) {
    const p = new PNG({ width: this.w, height: this.h });
    p.data = Buffer.from(this.data);
    fs.writeFileSync(path, PNG.sync.write(p));
  }
  static load(path: string) {
    const p = PNG.sync.read(fs.readFileSync(path));
    const img = new Img(p.width, p.height);
    img.data.set(p.data);
    return img;
  }
}
