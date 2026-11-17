// Upload menu, selfie camera, drag and drop, and the "Cutting you out…" overlay (SPEC §3.1, §6). Photos live in memory only (SPEC §9).
import { decode, makeSprite, MAX_BYTES } from './cutout.ts';

const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;

export function mountPhotoUi(hooks: { setPhoto: (b: ImageBitmap) => void; say: (msg: string) => void; done: () => void }) {
  const menu = $<HTMLDialogElement>('upload-menu');
  const selfie = $<HTMLDialogElement>('selfie');
  const busy = $<HTMLDialogElement>('busy');
  const input = $<HTMLInputElement>('file-input');
  const buttons = ['upload-btn', 'shake-btn'].map((id) => $<HTMLButtonElement>(id));
  let working = false;

  async function process(load: () => Promise<ImageBitmap>) {
    if (working) return;
    working = true;
    buttons.forEach((b) => (b.disabled = true));
    busy.showModal();
    let ok = false;
    try {
      const { sprite, fallback } = await makeSprite(await load());
      hooks.setPhoto(sprite);
      hooks.say(fallback ? "Couldn't cut you out, so here's a little framed photo instead." : 'You are in the globe! Give it a shake.');
      ok = true;
    } catch {
      hooks.say("Couldn't read that image. Try another photo (JPEG or PNG work best).");
    } finally {
      busy.close();
      buttons.forEach((b) => (b.disabled = false));
      working = false;
    }
    if (ok) hooks.done(); // after the busy dialog has closed, so it can't take focus back
  }

  function handleFile(file: File | undefined) {
    if (!file) return;
    if (!file.type.startsWith('image/')) return hooks.say("That doesn't look like a photo. Please choose an image file.");
    if (file.size > MAX_BYTES) return hooks.say('That photo is too big (25 MB max). Try a smaller one.');
    void process(() => decode(file));
  }

  // upload menu
  $('upload-btn').addEventListener('click', () => menu.showModal());
  $('choose-btn').addEventListener('click', () => {
    menu.close();
    input.click();
  });
  input.addEventListener('change', () => {
    handleFile(input.files?.[0]);
    input.value = ''; // so picking the same file again still fires
  });
  $('menu-close').addEventListener('click', () => menu.close());

  // selfie
  const selfieBtn = $<HTMLButtonElement>('selfie-btn');
  selfieBtn.hidden = !navigator.mediaDevices?.getUserMedia;
  const video = $<HTMLVideoElement>('selfie-video');
  const count = $('selfie-count');
  let stream: MediaStream | undefined;
  let timer = 0;
  selfie.addEventListener('close', () => {
    clearTimeout(timer);
    stream?.getTracks().forEach((t) => t.stop());
    stream = undefined;
    video.srcObject = null;
  });
  $('selfie-cancel').addEventListener('click', () => selfie.close());

  selfieBtn.addEventListener('click', async () => {
    menu.close();
    count.textContent = '';
    try {
      stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' }, audio: false });
    } catch (e) {
      const name = (e as DOMException).name;
      hooks.say(
        name === 'NotAllowedError' || name === 'SecurityError'
          ? 'The camera is blocked. Allow it in your browser, or choose a photo instead.'
          : name === 'NotFoundError' || name === 'OverconstrainedError'
            ? "Couldn't find a camera. Try choosing a photo instead."
            : "Couldn't start the camera. Try choosing a photo instead.",
      );
      return;
    }
    video.srcObject = stream;
    selfie.showModal();
    await video.play().catch(() => {});
    let n = 3;
    const tick = () => {
      if (n > 0) {
        count.textContent = String(n--);
        timer = window.setTimeout(tick, 1000);
        return;
      }
      count.textContent = '';
      const c = document.createElement('canvas');
      c.width = video.videoWidth;
      c.height = video.videoHeight;
      const g = c.getContext('2d')!;
      g.translate(c.width, 0);
      g.scale(-1, 1); // keep the mirrored orientation shown in the preview
      g.drawImage(video, 0, 0);
      selfie.close();
      if (c.width && c.height) void process(() => createImageBitmap(c));
      else hooks.say("Couldn't start the camera. Try choosing a photo instead.");
    };
    $('selfie-msg').textContent = '3, 2, 1… cheesy face!';
    tick();
  });

  // drag and drop anywhere on the page (the browser would otherwise navigate to the file)
  const globe = $('globe');
  const hasFiles = (e: DragEvent) => e.dataTransfer?.types.includes('Files');
  addEventListener('dragover', (e) => {
    if (!hasFiles(e)) return;
    e.preventDefault();
    globe.classList.add('drop-over');
  });
  addEventListener('dragleave', (e) => {
    if (!e.relatedTarget) globe.classList.remove('drop-over');
  });
  addEventListener('drop', (e) => {
    if (!hasFiles(e)) return;
    e.preventDefault();
    globe.classList.remove('drop-over');
    if (!working) handleFile(e.dataTransfer?.files[0]);
  });

  // the busy overlay can't be dismissed with Escape while the model runs
  busy.addEventListener('cancel', (e) => e.preventDefault());
}
