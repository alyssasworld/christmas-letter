// Draws the snowglobe on a canvas of 96x120 art px at `scale` device px each (SPEC §4.1 draw order). Art is crisp; the photo is smooth.
import { ASSETS, DOME, PHOTO_SLOT } from '../assets/manifest.ts';
import { drawSnow, type Snow } from './snow.ts';

const url = (src: string) => import.meta.env.BASE_URL + src;

export function load(src: string) {
  const img = new Image();
  img.src = url(src);
  return img.decode().then(() => img);
}

export interface GlobeImages {
  back: HTMLImageElement;
  front: HTMLImageElement;
  base: HTMLImageElement;
  tree: HTMLImageElement;
  cat: HTMLImageElement;
  shadow: HTMLImageElement;
  snow: HTMLImageElement;
}

export async function loadGlobeImages(): Promise<GlobeImages> {
  const a = ASSETS;
  const [back, front, base, tree, cat, shadow, snow] = await Promise.all(
    [a.globeBack.src, a.globeFront.src, a.globeBase.src, a.tree.src, a.cat.src, a.shadow.src, a.snow.src].map(load),
  );
  return { back, front, base, tree, cat, shadow, snow };
}

/** Largest size (art px) for a w x h photo standing on the ground: at most maxH tall, all four corners inside the glass. */
export function photoSize(w: number, h: number) {
  // same 0.97 margin the snow bounces at, so the photo never touches the glass outline
  const inside = (x: number, y: number) => ((x - DOME.cx) / (DOME.rx * 0.97)) ** 2 + ((y - DOME.cy) / (DOME.ry * 0.97)) ** 2 <= 1;
  const { x, bottom, maxH } = PHOTO_SLOT;
  const fits = (k: number) => {
    const half = (w * k) / 2;
    const top = bottom - h * k;
    return [top, bottom].every((y) => inside(x - half, y) && inside(x + half, y));
  };
  // fits() only gets harder as k grows, so bisect between 0 and the height cap
  let lo = 0;
  let hi = maxH / h;
  if (fits(hi)) lo = hi;
  else for (let i = 0; i < 30; i++) [lo, hi] = fits((lo + hi) / 2) ? [(lo + hi) / 2, hi] : [lo, (lo + hi) / 2];
  return { w: w * lo, h: h * lo };
}

// In memory only, never persisted (SPEC §9).
let photo: ImageBitmap | undefined;
export const setPhoto = (b?: ImageBitmap) => (photo = b);

/** scale: device px per art px. catFrame: which of the cat's animation frames to show. (ox, oy): device px offset; the caller clears. */
export function drawGlobe(ctx: CanvasRenderingContext2D, img: GlobeImages, scale: number, catFrame: number, snow: Snow, ox = 0, oy = 0) {
  const a = ASSETS;
  ctx.setTransform(scale, 0, 0, scale, ox, oy);
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(img.shadow, 16, 112);
  ctx.drawImage(img.back, a.globeBack.x, a.globeBack.y);
  ctx.drawImage(img.tree, a.tree.x, a.tree.y);
  if (photo) {
    const size = photoSize(photo.width, photo.height);
    const w = Math.round(size.w * scale);
    const h = Math.round(size.h * scale);
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    // whole device px, in device space (transform is a pure scale)
    ctx.drawImage(photo, Math.round(PHOTO_SLOT.x * scale - w / 2) / scale, (PHOTO_SLOT.bottom * scale - h) / scale, w / scale, h / scale);
    ctx.imageSmoothingEnabled = false;
  }
  drawSnow(ctx, snow, img.snow);
  ctx.drawImage(img.front, a.globeFront.x, a.globeFront.y);
  ctx.drawImage(img.base, a.globeBase.x, a.globeBase.y);
  const f = catFrame % a.cat.frames;
  ctx.drawImage(img.cat, f * a.cat.w, 0, a.cat.w, a.cat.h, a.cat.x, a.cat.y, a.cat.w, a.cat.h);
}
