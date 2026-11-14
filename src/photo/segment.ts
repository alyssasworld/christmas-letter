// Segmentation sits behind this interface so imgly (AGPL) can be swapped for MediaPipe later (SPEC §2).
export type Segment = (img: Blob | ImageBitmap) => Promise<ImageBitmap | Blob>;

// Model + wasm are served from our own origin (scripts/copy-models.ts), never the vendor CDN (SPEC §9).
export const segment: Segment = async (img) => {
  const { removeBackground } = await import('@imgly/background-removal'); // lazy: only after a photo is picked
  const blob = img instanceof Blob ? img : await bitmapToBlob(img);
  return removeBackground(blob, {
    // BASE_URL is relative ('./'), so resolve it to an absolute same-origin URL
    publicPath: new URL(import.meta.env.BASE_URL + 'models/', location.href).href,
    model: 'small',
    output: { format: 'image/png' },
  });
};

function bitmapToBlob(b: ImageBitmap) {
  const c = new OffscreenCanvas(b.width, b.height);
  c.getContext('2d')!.drawImage(b, 0, 0);
  return c.convertToBlob({ type: 'image/png' });
}
