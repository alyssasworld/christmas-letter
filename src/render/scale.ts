// Integer pixel-art scaling and the globe-screen layout (SPEC §4.2, §7).
// Everything is computed in device pixels so each art pixel maps to whole physical pixels.
import { BG_VARIANTS, GLOBE_FRAME } from '../assets/manifest.ts';

export type Variant = keyof typeof BG_VARIANTS;
export interface Viewport {
  w: number; // CSS px
  h: number;
  dpr: number;
}

/** Background variant whose aspect ratio is closest to the viewport's (compared in log space). */
export function pickVariant(w: number, h: number): Variant {
  const a = Math.log(w / h);
  let best: Variant = 'desktop';
  for (const v of Object.keys(BG_VARIANTS) as Variant[]) {
    const b = BG_VARIANTS[v];
    if (Math.abs(Math.log(b.w / b.h) - a) < Math.abs(Math.log(BG_VARIANTS[best].w / BG_VARIANTS[best].h) - a)) best = v;
  }
  return best;
}

/** Device px per UI pixel: icons are 8 art px; aim for ~3 CSS px on desktop, never below 2 device px. */
export const uiPixel = (dpr: number) => Math.max(2, Math.round(3 * dpr));

/** Largest integer scale (>=1) at which an art-sized box fits in the available device pixels. */
export const fitScale = (artW: number, artH: number, devW: number, devH: number) =>
  Math.max(1, Math.floor(Math.min(devW / artW, devH / artH)));

// The globe frame row that rests on the windowsill (just under the base's bottom edge).
const GLOBE_REST_ROW = 112;

export interface GlobeLayout {
  variant: Variant;
  bgScale: number; // device px per background art px
  bgX: number; // device px offset of the background (may be negative: cover crops)
  bgY: number;
  globeScale: number; // device px per globe art px
  globeX: number;
  globeY: number;
  anchorY: number; // device px y of the line the globe stands on (sill top, or higher if the buttons need room)
  textPx: number; // device px per font pixel for the title
  uiPx: number; // device px per pixel for icons, button frames and labels
}

/** "Merry Christmas!" width in font px (Pixelta Rounded with the wobble), measured in the browser. */
export const GREETING_W = 210;

/**
 * Globe screen: background covers the viewport at an integer scale; the globe stands on the window sill at the
 * same scale when it fits, otherwise at the largest integer scale that leaves room for the corner icons and title above.
 * Heights reserved for HTML UI are in CSS px and converted here.
 */
export function layoutGlobe(vp: Viewport): GlobeLayout {
  const W = Math.round(vp.w * vp.dpr);
  const H = Math.round(vp.h * vp.dpr);
  const variant = pickVariant(vp.w, vp.h);
  const bg = BG_VARIANTS[variant];
  const bgScale = Math.max(1, Math.ceil(Math.max(W / bg.w, H / bg.h)));
  const bgX = Math.round((W - bg.w * bgScale) / 2);
  const bgY = Math.round((H - bg.h * bgScale) / 2);

  // UI pixel: icons are 8 art px; aim for ~3 CSS px per pixel on desktop, never below 2 device px.
  const uiPx = uiPixel(vp.dpr);
  // portrait: the greeting spans ~70% of the width (bgScale barely grows on a narrow screen, so it looked tiny on phones)
  const textPx = Math.max(1, Math.round(bgScale / 2.5), H > W ? (0.7 * W) / GREETING_W : 0);

  const cornerRow = 16 * uiPx + 8 * vp.dpr; // corner button height + gap
  const titleH = Math.ceil((100 / 3) * textPx * 1.4); // one line of the title font, plus wobble room
  const below = Math.round(120 * vp.dpr) + 8 * bgScale; // globe shadow + buttons row + footer (gs <= bgScale)

  const sill = bgY + bg.sillY * bgScale;
  const anchorY = Math.min(sill, H - below);
  const globeScale = Math.min(bgScale, fitScale(GLOBE_FRAME.w, GLOBE_REST_ROW, W - 16 * vp.dpr, anchorY - cornerRow - titleH));
  const globeX = Math.round((W - GLOBE_FRAME.w * globeScale) / 2);
  const globeY = anchorY - GLOBE_REST_ROW * globeScale;
  return { variant, bgScale, bgX, bgY, globeScale, globeX, globeY, anchorY, textPx, uiPx };
}
