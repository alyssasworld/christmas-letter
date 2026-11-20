// Letter text rules (SPEC §3.2, §4.6): sanitising, wrapping, handwriting layout and size fitting. Pure, so it's unit-tested.
import { FONT } from '../assets/manifest.ts';
import { seeded, wobble } from '../ui/handwritten.ts';

export const DEFAULT_MESSAGE = 'Merry Christmas & a Happy New Year!';
export const MAX_COLS = 18;
export const MAX_ROWS = 3;
export const MAX_MESSAGE = MAX_COLS * MAX_ROWS;
export const MAX_NAME = 16;
export const NOTE_COLS = 30;
export const NOTE_ROWS = 2;
export const MAX_NOTE = 60;
export const NOTE_SCALE = 0.6; // note glyph size relative to the greeting
export const LINE_H = 36; // font px: ascender 28.3 + descender 7.1
export const PAD_X = 12; // font px: outline, left margin, and the skew leaning the tops right
const PAD_Y = 8;

// What Pixelta has: printable ASCII, Latin-1 letters, and these curly quotes and dashes.
const SUPPORTED = /^[ -~À-ÿ‘’“”…–—]$/;

/** Replaces whitespace runs of any kind with one space each, keeps supported characters, strips accents from others, drops the rest. */
export function sanitize(text: string) {
  let out = '';
  for (const ch of text.replace(/\s/g, ' ')) {
    if (SUPPORTED.test(ch)) out += ch;
    else for (const c of ch.normalize('NFD').replace(/[̀-ͯ]/g, '')) if (SUPPORTED.test(c)) out += c;
  }
  return out;
}

/** Greedy word wrap; words longer than a line are hard-broken. */
export function wrapMessage(text: string, cols = MAX_COLS) {
  const lines: string[] = [];
  let line = '';
  for (let word of text.split(/\s+/).filter(Boolean)) {
    while (word.length > cols) {
      if (line) lines.push(line);
      line = '';
      lines.push(word.slice(0, cols));
      word = word.slice(cols);
    }
    if (line && line.length + 1 + word.length > cols) {
      lines.push(line);
      line = word;
    } else line = line ? `${line} ${word}` : word;
  }
  if (line) lines.push(line);
  return lines;
}

/** Sanitised message cut to the longest prefix that fits 3 lines of 18. */
export function clampMessage(text: string) {
  let t = sanitize(text).slice(0, MAX_MESSAGE);
  while (wrapMessage(t).length > MAX_ROWS) t = t.slice(0, -1);
  return t;
}
/** Sanitised note cut to the longest prefix that fits 2 lines of 30. */
export function clampNote(text: string) {
  let t = sanitize(text).slice(0, MAX_NOTE);
  while (wrapMessage(t, NOTE_COLS).length > NOTE_ROWS) t = t.slice(0, -1);
  return t;
}
export const clampName = (text: string) => sanitize(text).slice(0, MAX_NAME);

export interface Glyph {
  ch: string;
  x: number; // font px from the line start
  dy: number; // baseline drift, whole font px
  rot: number; // degrees
  scale: number;
}

/** Handwriting layout for one line; the same seed always gives the same wobble, so it's identical every frame. */
export function layoutLine(line: string, advance: (ch: string) => number, seed: number) {
  const rnd = seeded(seed);
  let x = 0;
  const glyphs = [...line].map((ch, i) => {
    const w = wobble(rnd, i);
    const g: Glyph = { ch, x, dy: w.drift, rot: w.rot, scale: w.scale };
    x += advance(ch) + w.gap;
    return g;
  });
  return { glyphs, width: x };
}

/**
 * Largest integer n (device px per font px, so Pixelta stays crisp) at which every line fits width and the rows used fit height:
 * the greeting's msgRows (at least 1), the sign-off, and noteRows of note. measure(line, i) is the line's width in font px (note lines already times NOTE_SCALE).
 * If even n = 1 doesn't fit, n is fractional: crispness yields to never overflowing.
 */
export function fitText(
  lines: string[],
  measure: (line: string, i: number) => number,
  areaW: number,
  areaH: number,
  msgRows: number,
  noteRows = 0,
) {
  const w = Math.max(...lines.map(measure)) + PAD_X;
  const h = (Math.max(msgRows, 1) + 1) * LINE_H + PAD_Y + (noteRows > 0 ? (0.25 + noteRows * NOTE_SCALE) * LINE_H : 0);
  const k = Math.min(areaW / w, areaH / h);
  const n = k >= 1 ? Math.floor(k) : k;
  return { n, size: n * FONT.nativeSize, fits: w * n <= areaW + 1e-6 && h * n <= areaH + 1e-6 };
}

/** Note glyph scale for greeting scale n: never above the n * NOTE_SCALE that fitText budgeted, whole device px when it can be. */
export const noteGlyphScale = (n: number) => (n * NOTE_SCALE >= 1 ? Math.floor(n * NOTE_SCALE) : n * NOTE_SCALE);
