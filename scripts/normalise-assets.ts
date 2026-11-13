// Owner sprites (design/source, all co-registered 96x120 frames) -> cropped, alpha-thresholded PNGs in public/assets.
// Offsets printed here are copied into src/assets/manifest.ts.
import { Img } from './png.ts';

const SRC = 'design/source', OUT = 'public/assets';

function threshold(img: Img) {
  for (let i = 3; i < img.data.length; i += 4) img.data[i] = img.data[i] >= 128 ? 255 : 0;
  return img;
}
function bbox(imgs: Img[]) {
  let x0 = Infinity, y0 = Infinity, x1 = -1, y1 = -1;
  for (const img of imgs)
    for (let y = 0; y < img.h; y++)
      for (let x = 0; x < img.w; x++)
        if (img.data[(y * img.w + x) * 4 + 3]) {
          x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y);
        }
  return { x: x0, y: y0, w: x1 - x0 + 1, h: y1 - y0 + 1 };
}
function crop(srcs: Img[], name: string) {
  const b = bbox(srcs);
  const out = new Img(b.w * srcs.length, b.h);
  srcs.forEach((s, i) => out.blit(s, i * b.w, 0, b.x, b.y, b.w, b.h));
  out.save(`${OUT}/${name}`);
  console.log(`${name}: ${out.w}x${out.h} (${srcs.length} frame(s) of ${b.w}x${b.h}) offset in 96x120 frame: x=${b.x} y=${b.y}`);
}

const load = (f: string) => {
  const img = Img.load(`${SRC}/${f}`);
  if (img.w !== 96 || img.h !== 120) console.warn(`! ${f} is ${img.w}x${img.h}, expected 96x120`);
  return threshold(img);
};
crop([load('christmas_tree.png')], 'tree.png');
crop([load('snowglobe_base.png')], 'globe-base.png');
crop(['cat_animate_1.png', 'cat_animate_2.png', 'cat_animate_3.png'].map(load), 'cat-sheet.png');

// Dome: back = the whole flat sprite; front = outline + shine, so snow drawn between them stays under the glass edge.
const dome = load('snow_globe.png');
dome.save(`${OUT}/globe-back.png`);
const front = new Img(96, 120);
const FRONT = new Set(['65838e', 'd2ebf2']);
for (let i = 0; i < dome.data.length; i += 4) {
  const hex = [...dome.data.subarray(i, i + 3)].map((v) => v.toString(16).padStart(2, '0')).join('');
  if (dome.data[i + 3] && FRONT.has(hex)) front.data.set(dome.data.subarray(i, i + 4), i);
}
front.save(`${OUT}/globe-front.png`);
const db = bbox([dome]);
// ground line: first snow-white pixel down the centre column
let ground = -1;
for (let y = db.y; y < db.y + db.h && ground < 0; y++) if (dome.data[(y * 96 + 48) * 4] === 0xf8) ground = y;
console.log(`globe-back/front.png: 96x120, dome bbox x=${db.x} y=${db.y} w=${db.w} h=${db.h}, ground line at centre y=${ground}`);

// Backgrounds: supplied as exact 5x upscales; sample every 5th pixel to get the native art (lossless).
import fs from 'node:fs';
const BG = `${SRC}/backgrounds`, K = 5;
for (const f of fs.readdirSync(BG).filter((f) => f.endsWith('.png'))) {
  const big = Img.load(`${BG}/${f}`);
  const out = new Img(big.w / K, big.h / K);
  for (let y = 0; y < out.h; y++)
    for (let x = 0; x < out.w; x++) {
      const si = (y * K * big.w + x * K) * 4, di = (y * out.w + x) * 4;
      // verify the whole 5x5 block is one colour, so we never silently resample
      for (let j = 0; j < K; j++) for (let i = 0; i < K; i++) {
        const bi = ((y * K + j) * big.w + x * K + i) * 4;
        if (big.data[bi] !== big.data[si] || big.data[bi + 1] !== big.data[si + 1] || big.data[bi + 2] !== big.data[si + 2]) throw new Error(`${f}: not a clean ${K}x upscale at ${x},${y}`);
      }
      out.data.set(big.data.subarray(si, si + 4), di);
    }
  out.save(`${OUT}/bg-${f}`);
}
console.log('backgrounds: downscaled', fs.readdirSync(BG).length, 'files by 5x');
