// Code-drawn pixel art (SPEC §8.2, §8.3) -> public/assets/*.png. Run after normalise-assets.ts.
import { Img, type Px } from './png.ts';
import { PALETTE } from '../src/palette.ts';
import { ASSETS } from '../src/assets/manifest.ts';

const OUT = 'public/assets';

// ---------- snow-sheet 32x8: 1, 3, 5, 7 px flakes ----------
const snow = new Img(32, 8);
const W: Px = 'snowWhite', S: Px = 'snowShade';
snow.set(3, 3, W);
snow.bitmap(8 + 2, 2, ['.W.', 'WWW', '.W.'], { W });
snow.bitmap(16 + 1, 1, ['..W..', '.WWW.', 'WWSWW', '.WWW.', '..W..'], { W, S });
snow.bitmap(24, 0, ['W..W..W', '.W.W.W.', '..WWW..', 'WWWSWWW', '..WWW..', '.W.W.W.', 'W..W..W'], { W, S });
snow.save(`${OUT}/snow-sheet.png`);

// ---------- airmail stripes (shared by border, envelope, og) ----------
// Diagonal stripes with period 8 so 8px edge pieces tile seamlessly: red 2, cream 2, blue 2, cream 2.
const stripe = (x: number, y: number): Px => {
  const k = (((x + y) % 8) + 8) % 8;
  return k < 2 ? 'baseMid' : k < 4 ? 'cream' : k < 6 ? 'ornBlue' : 'cream';
};

// ---------- letter-border 24x24 9-slice (8px corners) ----------
const border = new Img(24, 24);
for (let y = 0; y < 24; y++)
  for (let x = 0; x < 24; x++) {
    const d = Math.min(x, y, 23 - x, 23 - y);
    border.set(x, y, d === 0 ? 'creamDeep' : d <= 5 ? stripe(x, y) : 'cream');
  }
border.save(`${OUT}/letter-border.png`);

// ---------- letter-paper 8x8 ----------
const paper = new Img(8, 8);
paper.rect(0, 0, 8, 8, 'cream');
paper.set(2, 1, 'creamShade');
paper.set(6, 5, 'creamShade');
paper.save(`${OUT}/letter-paper.png`);

// ---------- envelope-sheet 4 x 64x44 ----------
const env = new Img(64 * 4, 44);
const BODY_Y = 14, VY = 32;
const vLine = (x: number) => BODY_Y + Math.round((Math.min(x, 63 - x) / 32) * (VY - BODY_Y));
function envBody(o: number, pocketOnly: boolean) {
  for (let y = BODY_Y; y < 44; y++)
    for (let x = 0; x < 64; x++) {
      if (pocketOnly && y < vLine(x)) continue;
      const d = Math.min(x, y - BODY_Y, 63 - x, 43 - y);
      env.set(o + x, y, d === 0 ? 'creamDeep' : d <= 2 ? stripe(x, y) : y === vLine(x) ? 'creamDeep' : 'cream');
    }
}
function flap(o: number, apexY: number, fill: Px) {
  // triangle from (0,BODY_Y)-(63,BODY_Y) to apex (32, apexY); apexY < BODY_Y means open (pointing up)
  for (let x = 0; x < 64; x++) {
    const t = 1 - Math.abs(x - 31.5) / 32;
    const tip = Math.round(BODY_Y + (apexY - BODY_Y) * t);
    const [a, b] = tip < BODY_Y ? [tip, BODY_Y] : [BODY_Y, tip];
    for (let y = a; y <= b; y++) env.set(o + x, y, y === tip || x === 0 || x === 63 ? 'creamDeep' : fill);
  }
}
function letter(o: number, top: number) {
  env.rect(o + 6, top, 52, 30, 'cream');
  for (let x = 6; x < 58; x++) env.set(o + x, top, 'creamDeep');
  for (let y = top; y < top + 30; y++) (env.set(o + 6, y, 'creamDeep'), env.set(o + 57, y, 'creamDeep'));
  for (let k = 0; k < 3; k++) env.rect(o + 12, top + 6 + k * 5, k === 2 ? 20 : 34, 1, 'ornBlue');
}
envBody(0, false); flap(0, VY, 'creamShade'); // closed
envBody(64, false); flap(64, 6, 'creamShade'); // flap opening
flap(128, 0, 'creamShade'); env.rect(128 + 1, BODY_Y, 62, 30, 'creamDeep'); letter(128, 10); envBody(128, true); // open, letter peeks
flap(192, 0, 'creamShade'); env.rect(192 + 1, BODY_Y, 62, 30, 'creamDeep'); letter(192, 1); envBody(192, true); // letter rising
env.save(`${OUT}/envelope-sheet.png`);

// ---------- stamp 16x20 with tiny snowglobe ----------
const stamp = new Img(16, 20);
for (let y = 0; y < 20; y++)
  for (let x = 0; x < 16; x++) {
    const edge = x === 0 || y === 0 || x === 15 || y === 19;
    stamp.set(x, y, edge ? ((x + y) % 2 ? 'snowWhite' : null) : x === 2 || y === 2 || x === 13 || y === 17 ? 'baseMid' : 'snowWhite');
  }
stamp.bitmap(4, 4, [
  '..GGGG..',
  '.GGGGGG.',
  'GGGTGGGG',
  'GGTTTGGG',
  'GTTTTTGG',
  'WWWTWWWW',
  '.WWWWWW.',
  '..WWWW..',
  'RRRRRRRR',
  'RRRRRRRR',
], { G: 'glass', T: 'treeGreen', W: 'snowWhite', R: 'baseDark' });
stamp.save(`${OUT}/stamp.png`);

// ---------- button-sheet 48x54 (normal, hover, pressed) ----------
const btn = new Img(48, 54);
(['cream', 'snowWhite', 'creamShade'] as const).forEach((face, s) => {
  const o = s * 18, pressed = s === 2;
  for (let y = 0; y < 18; y++)
    for (let x = 0; x < 48; x++) {
      const corner = (x === 0 || x === 47) && (y === 0 || y === 17);
      if (corner) continue;
      const outline = x === 0 || x === 47 || y === 0 || y === 17;
      const shade = pressed ? y === 1 : y >= 15;
      btn.set(x, o + y, outline ? 'ink' : shade ? 'creamDeep' : face);
    }
});
btn.save(`${OUT}/button-sheet.png`);
// CSS border-image can't pick a region of a sheet, so each state is also its own file
['normal', 'hover', 'pressed'].forEach((st, i) => {
  const one = new Img(48, 18);
  one.blit(btn, 0, 0, 0, i * 18, 48, 18);
  one.save(`${OUT}/button-${st}.png`);
});

// ---------- icons 8 x 8x8 ----------
const icons = new Img(64, 8);
const I: Px = 'ink';
[
  ['IIIIIIII', 'I......I', 'I.....II', 'I....I.I', 'I.I.I..I', 'II.I...I', 'I......I', 'IIIIIIII'], // picture
  ['...I....', '..II..I.', 'III.I..I', 'I...I.II', 'I...I.II', 'III.I..I', '..II..I.', '...I....'], // sound on
  ['...I....', '..II....', 'III.I.I.', 'I...I..I', 'I...I.I.', 'III.I..I', '..II....', '...I....'], // sound off (x)
  ['...I....', '..III...', '.I.I.I..', '...I....', '...I....', 'I..I..I.', 'I.....I.', 'IIIIIII.'], // upload
  ['..III...', 'IIIIIIII', 'I..II..I', 'I.I..I.I', 'I.I..I.I', 'I..II..I', 'IIIIIIII', '........'], // camera
  ['I......I', '.I.II.I.', '..I..I..', '.I....I.', '.I....I.', '..IIII..', '.I.II.I.', 'I......I'], // shake
  ['IIIIIII.', 'I.III.II', 'I.III..I', 'I......I', 'I.IIII.I', 'I.I..I.I', 'I.IIII.I', 'IIIIIIII'], // save
  ['........', 'IIIIIIII', 'II....II', 'I.I..I.I', 'I..II..I', 'I......I', 'IIIIIIII', '........'], // envelope
].forEach((rows, i) => icons.bitmap(i * 8, 0, rows, { I }));
icons.save(`${OUT}/icons.png`);

// ---------- shadow 64x8: dithered ellipse (no partial alpha, GIF-safe) ----------
const shadow = new Img(64, 8);
for (let y = 0; y < 8; y++)
  for (let x = 0; x < 64; x++) {
    const e = ((x + 0.5 - 32) / 32) ** 2 + ((y + 0.5 - 4) / 4) ** 2;
    if (e <= 1 && (e < 0.45 || (x + y) % 2 === 0)) shadow.set(x, y, 'creamDeep');
  }
shadow.save(`${OUT}/shadow.png`);

// ---------- globe composite helper (owner sprites + dome) ----------
function globe(frame = 0) {
  const g = new Img(96, 120);
  const sh = Img.load(`${OUT}/shadow.png`);
  g.blit(sh, 16, 112);
  g.blit(Img.load(`${OUT}/globe-back.png`), 0, 0);
  const a = ASSETS;
  g.blit(Img.load(`${OUT}/tree.png`), a.tree.x, a.tree.y);
  g.blit(Img.load(`${OUT}/globe-front.png`), 0, 0);
  g.blit(Img.load(`${OUT}/globe-base.png`), a.globeBase.x, a.globeBase.y);
  g.blit(Img.load(`${OUT}/cat-sheet.png`), a.cat.x, a.cat.y, frame * a.cat.w, 0, a.cat.w, a.cat.h);
  // a few resting flakes so previews read as a snowglobe
  for (const [x, y, f] of [[30, 40, 1], [60, 30, 0], [70, 55, 1], [22, 62, 0], [52, 48, 2], [40, 70, 0]])
    g.blit(snow, x - 4, y - 4, f * 8, 0, 8, 8);
  return g;
}
globe().save('design/globe-composite.png');

// ---------- og-image: drawn at 240x126, scaled 5x = 1200x630 ----------
// (spec suggested 200x105 at 6x, but the 120px-tall globe doesn't fit in 105)
const og = new Img(240, 126);
for (let y = 0; y < 126; y++)
  for (let x = 0; x < 240; x++) {
    const d = Math.min(x, y, 239 - x, 125 - y);
    og.set(x, y, d === 0 ? 'creamDeep' : d <= 5 ? stripe(x, y) : 'cream');
  }
og.blit(globe(), 72, 3);
og.blit(stamp, 214, 10);
og.scaled(5).save(`${OUT}/og-image.png`);

// ---------- favicons: tiny globe drawn per size ----------
function favicon(n: number) {
  const f = new Img(n, n);
  const rr = n * 0.38, fx = n / 2, fy = n * 0.42, baseH = Math.max(2, Math.round(n / 6));
  for (let y = 0; y < n; y++)
    for (let x = 0; x < n; x++) {
      if ((x + 0.5 - fx) ** 2 + (y + 0.5 - fy) ** 2 <= rr * rr) f.set(x, y, y > fy + rr * 0.45 ? 'snowWhite' : 'glass');
    }
  const tH = Math.round(rr * 0.9);
  for (let j = 0; j < tH; j++) for (let i = -((j / 2) | 0); i <= (j / 2) | 0; i++) f.set(Math.floor(fx) + i, Math.round(fy - rr * 0.5) + j, 'treeGreen');
  f.rect(Math.round(n * 0.15), n - baseH - 1, n - 2 * Math.round(n * 0.15), baseH, 'baseMid');
  f.save(`${OUT}/favicon-${n}.png`);
}
favicon(16);
favicon(32);

// ---------- palette swatch ----------
const keys = Object.keys(PALETTE) as (keyof typeof PALETTE)[];
const sw = new Img(keys.length * 8, 8);
keys.forEach((k, i) => sw.rect(i * 8, 0, 8, 8, k));
sw.scaled(4).save('design/palette.png');

console.log('drew', ['snow-sheet', 'letter-border', 'letter-paper', 'envelope-sheet', 'stamp', 'button-sheet', 'icons', 'shadow', 'og-image', 'favicons', 'palette'].join(', '));
