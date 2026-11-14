// Draws the snowglobe on a canvas of 96x120 art px at `scale` device px each (SPEC §4.1 draw order). Art is crisp; the photo is smooth.
import { ASSETS, PHOTO_SLOT } from '../assets/manifest.ts';
import { drawSnow, type Snow } from './snow.ts';

const url = (src: string) => import.meta.env.BASE_URL + src;

function load(src: string) {
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

// In memory only, never persisted (SPEC §9).
let photo: ImageBitmap | undefined;
export const setPhoto = (b: ImageBitmap) => (photo = b);

/** scale: device px per art px. catFrame: which of the cat's animation frames to show. */
export function drawGlobe(ctx: CanvasRenderingContext2D, img: GlobeImages, scale: number, catFrame: number, snow: Snow) {
  const a = ASSETS;
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, 96 * scale, 120 * scale);
  ctx.setTransform(scale, 0, 0, scale, 0, 0);
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(img.shadow, 16, 112);
  ctx.drawImage(img.back, a.globeBack.x, a.globeBack.y);
  ctx.drawImage(img.tree, a.tree.x, a.tree.y);
  if (photo) {
    const k = Math.min(PHOTO_SLOT.maxW / photo.width, PHOTO_SLOT.maxH / photo.height);
    const w = Math.round(photo.width * k * scale);
    const h = Math.round(photo.height * k * scale);
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
