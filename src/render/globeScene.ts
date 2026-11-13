// Draws the snowglobe at native art resolution (96x120); CSS scales the canvas by an integer (SPEC §4.1 draw order).
import { ASSETS } from '../assets/manifest.ts';

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
}

export async function loadGlobeImages(): Promise<GlobeImages> {
  const a = ASSETS;
  const [back, front, base, tree, cat, shadow] = await Promise.all(
    [a.globeBack.src, a.globeFront.src, a.globeBase.src, a.tree.src, a.cat.src, a.shadow.src].map(load),
  );
  return { back, front, base, tree, cat, shadow };
}

/** catFrame: which of the cat's animation frames to show. */
export function drawGlobe(ctx: CanvasRenderingContext2D, img: GlobeImages, catFrame: number) {
  const a = ASSETS;
  ctx.imageSmoothingEnabled = false;
  ctx.clearRect(0, 0, 96, 120);
  ctx.drawImage(img.shadow, 16, 112);
  ctx.drawImage(img.back, a.globeBack.x, a.globeBack.y);
  ctx.drawImage(img.tree, a.tree.x, a.tree.y);
  // (photo sprite and snow go here in Phases 2 and 4)
  ctx.drawImage(img.front, a.globeFront.x, a.globeFront.y);
  ctx.drawImage(img.base, a.globeBase.x, a.globeBase.y);
  const f = catFrame % a.cat.frames;
  ctx.drawImage(img.cat, f * a.cat.w, 0, a.cat.w, a.cat.h, a.cat.x, a.cat.y, a.cat.w, a.cat.h);
}
