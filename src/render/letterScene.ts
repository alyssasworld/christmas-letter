// Letter scene (SPEC §4.1): paper, 9-slice airmail border, stamp and handwritten text, all in art px at `s` device px each.
// The mini globe is drawn on top by the caller with the same drawGlobe() as the globe screen.
import { ASSETS, FONT } from '../assets/manifest.ts';
import { load } from './globeScene.ts';
import { fitScale, type Viewport } from './scale.ts';
import { fitText, layoutLine, LINE_H, NOTE_COLS, NOTE_SCALE, noteGlyphScale, PAD_X, wrapMessage } from './text.ts';

// All sizes are multiples of 8 so the border stripes (period 8) tile cleanly.
export const LETTER = {
  landscape: { w: 288, h: 160, globe: { x: 16, y: 16 }, text: { x: 124, y: 16, w: 132, h: 120 }, stamp: { x: 260, y: 12 } },
  portrait: { w: 136, h: 248, globe: { x: 20, y: 16 }, text: { x: 16, y: 140, w: 104, h: 84 }, stamp: { x: 108, y: 12 } },
} as const;
export type Orientation = keyof typeof LETTER;

export const BELOW_LETTER = 124; // CSS px under the letter: buttons row, note and gaps

/** CSS px the "Tap the message…" hint line takes above the letter (same size as .hint, 1 or 2 lines, plus its gap). */
export function hintHeight(vpW: number, dpr: number) {
  const fontPx = Math.max(1, Math.round(dpr * 0.6)) / dpr; // CSS px per font px, as --btn-font
  const textW = 46 * 12.5 * fontPx; // ~46 chars at the average advance, pencil included
  const lines = textW > vpW - 16 ? 2 : 1;
  return Math.ceil(lines * fontPx * (100 / 3) * 1.2) + 12;
}

/** Landscape when the viewport is, else portrait; largest integer scale that fits under the corner buttons and above the button row. */
export function layoutLetter(vp: Viewport, uiPx: number) {
  const orientation: Orientation = vp.w >= vp.h ? 'landscape' : 'portrait';
  const { w, h } = LETTER[orientation];
  const cornerRow = 16 * uiPx + 8 * vp.dpr;
  const above = hintHeight(vp.w, vp.dpr) * vp.dpr;
  const scale = fitScale(w, h, vp.w * vp.dpr - 16 * vp.dpr, vp.h * vp.dpr - cornerRow - above - BELOW_LETTER * vp.dpr);
  return { orientation, scale, w, h };
}

export interface LetterImages {
  border: HTMLImageElement;
  paper: HTMLImageElement;
  stamp: HTMLImageElement;
}
export async function loadLetterImages(): Promise<LetterImages> {
  const [border, paper, stamp] = await Promise.all([ASSETS.letterBorder.src, ASSETS.letterPaper.src, ASSETS.stamp.src].map(load));
  return { border, paper, stamp };
}

export function drawFrame(ctx: CanvasRenderingContext2D, img: LetterImages, o: Orientation, s: number) {
  const { w, h, stamp } = LETTER[o];
  ctx.imageSmoothingEnabled = false;
  const tile = (im: HTMLImageElement, sx: number, sy: number, x: number, y: number) =>
    ctx.drawImage(im, sx, sy, 8, 8, x * s, y * s, 8 * s, 8 * s);
  for (let y = 0; y < h; y += 8) for (let x = 0; x < w; x += 8) tile(img.paper, 0, 0, x, y);
  // 9-slice: corners once, edges repeated (never stretched)
  for (let x = 8; x < w - 8; x += 8) {
    tile(img.border, 8, 0, x, 0);
    tile(img.border, 8, 16, x, h - 8);
  }
  for (let y = 8; y < h - 8; y += 8) {
    tile(img.border, 0, 8, 0, y);
    tile(img.border, 16, 8, w - 8, y);
  }
  tile(img.border, 0, 0, 0, 0);
  tile(img.border, 16, 0, w - 8, 0);
  tile(img.border, 0, 16, 0, h - 8);
  tile(img.border, 16, 16, w - 8, h - 8);
  ctx.drawImage(img.stamp, stamp.x * s, stamp.y * s, ASSETS.stamp.w * s, ASSETS.stamp.h * s);
}

const FAMILY = "'Pixelta Rounded', Pixelta, 'Pixelify Sans', monospace";
const SKEW = -Math.tan((12 * Math.PI) / 180); // same lean as .greet in style.css
const ASC = 28; // font px from the top of a line's glyphs to its baseline
const DESC = 7;
const PAD_TOP = 4;
const GREETING = 'Love, ';
const PROMPT = 'Add a little note';
export const PLACEHOLDER = 'Your Name';
const INK = '#2b2b2b';
const FAINT = '#6b6152'; // placeholder name: lighter than the ink so it reads as editable, still 5:1 on the paper
const RED = '#c44935';
const CREAM = '#f4efe6';

interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}
/** Everything in device px relative to the canvas. */
export interface TextInfo {
  n: number; // device px per font px
  size: number;
  fits: boolean;
  lines: number;
  message: Rect; // snug around the drawn message lines
  messageEdit: Rect; // room for all 3 lines, for the editor
  note: Rect; // snug around the drawn note or prompt; zero height where the note would start when there is neither
  noteEdit: Rect; // room for 2 note lines at full text width, for the editor
  sign: Rect; // snug around the drawn sign-off
  nameX: number;
}

/** Draws the message, note and sign-off. `skip` leaves one out while it is being edited; `prompt` shows the faint empty-note hint (never in the GIF). */
export function drawText(
  ctx: CanvasRenderingContext2D,
  o: Orientation,
  s: number,
  message: string,
  name: string,
  note: string,
  skip?: 'message' | 'note' | 'name',
  prompt = false,
): TextInfo {
  const T = LETTER[o].text;
  const [ax, ay, aw, ah] = [T.x * s, T.y * s, T.w * s, T.h * s];
  const lines = wrapMessage(message);
  const sign = GREETING + (name || PLACEHOLDER);
  ctx.font = `${FONT.nativeSize}px ${FAMILY}`;
  const advance = (ch: string) => ctx.measureText(ch).width; // device px at the native size = font px
  const laid = [...lines.map((l, i) => layoutLine(l, advance, 11 + i)), layoutLine(sign, advance, 31)];
  const noteLines = wrapMessage(note, NOTE_COLS);
  const noteLaid = noteLines.map((l, i) => layoutLine(l, advance, 21 + i));
  const fit = fitText(
    [...lines, ...noteLines, sign],
    (_, i) =>
      i < lines.length
        ? laid[i].width
        : i < lines.length + noteLines.length
          ? noteLaid[i - lines.length].width * NOTE_SCALE
          : laid[lines.length].width,
    aw,
    ah,
    lines.length,
    noteLines.length,
  );
  const { n } = fit;
  const gs = noteGlyphScale(n);
  const noteLineH = gs * LINE_H;
  const signTop = ay + ah - (PAD_TOP + DESC + ASC + 2) * n;
  const msgH = (PAD_TOP + Math.max(lines.length, 1) * LINE_H) * n;
  // the prompt has no reserved room, so it only shows when the block still ends above the sign-off
  const showPrompt = prompt && !noteLines.length && msgH + 0.25 * LINE_H * n + noteLineH <= signTop - ay;
  const drawn = showPrompt ? [layoutLine(PROMPT, advance, 21)] : noteLaid;
  const blockH = msgH + (drawn.length ? 0.25 * LINE_H * n + drawn.length * noteLineH : 0);
  const top = ay + Math.max(0, Math.round((signTop - ay - blockH) / 2)); // greeting + note centred above the sign-off
  const noteTop = top + msgH + 0.25 * LINE_H * n;
  const cx = ax + aw / 2;

  ctx.font = `${fit.size}px ${FAMILY}`;
  ctx.textBaseline = 'alphabetic';
  const paint = (g: (typeof laid)[0]['glyphs'][0], x0: number, y0: number, fill: string | null, u = n) => {
    ctx.save();
    ctx.translate(Math.round(x0 + g.x * u), Math.round(y0 + g.dy * u));
    ctx.transform(1, 0, SKEW, 1, 0, 0);
    ctx.rotate((g.rot * Math.PI) / 180);
    ctx.scale(g.scale, g.scale);
    if (fill) {
      ctx.fillStyle = fill;
      ctx.fillText(g.ch, 0, 0);
    } else {
      ctx.fillStyle = CREAM; // outline, 2 font px thick
      for (let dx = -2; dx <= 2; dx++) for (let dy = -2; dy <= 2; dy++) if (dx || dy) ctx.fillText(g.ch, dx * n, dy * n);
    }
    ctx.restore();
  };

  if (skip !== 'message') {
    // all outlines first, so a neighbour's outline never cuts into a letter's red
    for (const fill of [null, RED]) {
      laid
        .slice(0, -1)
        .forEach((l, i) => l.glyphs.forEach((g) => paint(g, cx - (l.width * n) / 2, top + (PAD_TOP + ASC + i * LINE_H) * n, fill)));
    }
  }
  if (skip !== 'note' && drawn.length) {
    ctx.font = `${gs * FONT.nativeSize}px ${FAMILY}`;
    drawn.forEach((l, i) =>
      l.glyphs.forEach((g) => paint(g, cx - (l.width * gs) / 2, noteTop + ASC * gs + i * noteLineH, showPrompt ? FAINT : INK, gs)),
    );
    ctx.font = `${fit.size}px ${FAMILY}`;
  }
  const last = laid[laid.length - 1];
  const signBase = ay + ah - (PAD_TOP + DESC) * n;
  const signX = cx - (last.width * n) / 2;
  last.glyphs.forEach((g, i) => {
    if (i >= GREETING.length && skip === 'name') return;
    paint(g, signX, signBase, i >= GREETING.length && !name ? FAINT : INK);
  });

  const msgW = Math.max(...laid.slice(0, -1).map((l) => l.width), 0);
  const centred = (w: number, y: number, h: number): Rect => ({ x: cx - w / 2, y, w, h });
  const noteW = (Math.max(...drawn.map((l) => l.width), 0) + PAD_X) * gs;
  return {
    ...fit,
    lines: lines.length,
    message: centred((msgW + PAD_X) * n, top, (PAD_TOP + ASC + DESC + 2 + (Math.max(lines.length, 1) - 1) * LINE_H) * n),
    messageEdit: { x: ax, y: top, w: aw, h: Math.min((PAD_TOP + MAX_LINES_H) * n, ay + ah - top) },
    note: centred(noteW, noteTop, drawn.length * noteLineH),
    noteEdit: { x: ax, y: noteTop, w: aw, h: 2 * noteLineH },
    sign: { x: signX - 2 * n, y: signTop, w: (last.width + 8) * n, h: signBase + (DESC + 2) * n - signTop },
    nameX: signX + last.glyphs[GREETING.length].x * n,
  };
}
const MAX_LINES_H = 3 * LINE_H;

/** Paper, border, stamp and text on `cv` at `s` device px per art px. Resolution-dependent: the text is fitted again for each scale. */
export function renderStatic(
  cv: HTMLCanvasElement,
  img: LetterImages,
  o: Orientation,
  s: number,
  message: string,
  name: string,
  note: string,
  skip?: 'message' | 'note' | 'name',
  prompt = false,
) {
  cv.width = LETTER[o].w * s;
  cv.height = LETTER[o].h * s;
  const g = cv.getContext('2d')!;
  drawFrame(g, img, o, s);
  const info = drawText(g, o, s, message, name, note, skip, prompt);
  drawCredit(g, o, s);
  return info;
}

const CREDIT = 'made by Loveaction';
/** Quiet credit in the 16 art px strip under the globe and text: bottom-left on landscape, centred on portrait. */
function drawCredit(ctx: CanvasRenderingContext2D, o: Orientation, s: number) {
  const { w, h } = LETTER[o];
  const stripY = (h - 24) * s; // the strip runs from 24 art px above the bottom edge to 8 above it (inside the border)
  const stripH = 16 * s;
  ctx.font = `${FONT.nativeSize}px Pixelta, 'Pixelify Sans', monospace`;
  const width = [...CREDIT].reduce((x, ch) => x + ctx.measureText(ch).width, 0); // font px
  // largest integer n whose glyphs fit 10 art px tall and the column; fractional (still inside) on tiny letters
  const k = Math.min((10 * s) / (ASC + DESC), ((o === 'landscape' ? 200 : 104) * s) / width);
  const n = (k >= 1 ? Math.floor(k) : k) * 0.8; // a touch smaller than the largest that fits
  ctx.font = `${n * FONT.nativeSize}px Pixelta, 'Pixelify Sans', monospace`;
  ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = 'rgb(43 43 43 / 0.75)';
  const x = o === 'landscape' ? 16 * s : Math.round((w * s - width * n) / 2);
  ctx.fillText(CREDIT, Math.round(x), Math.round(stripY + (stripH - (ASC + DESC) * n) / 2 + ASC * n));
}
