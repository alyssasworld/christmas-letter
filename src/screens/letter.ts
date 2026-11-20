// Letter screen (SPEC §3.2): envelope transition, one canvas with paper, border, mini globe and text (so Phase 6 can encode it),
// inline editing, and Make another.
import { ASSETS } from '../assets/manifest.ts';
import type { createMusicBox } from '../audio/musicbox.ts';
import { drawGlobe, type GlobeImages } from '../render/globeScene.ts';
import { layoutLetter, loadLetterImages, LETTER, renderStatic, type TextInfo } from '../render/letterScene.ts';
import { uiPixel } from '../render/scale.ts';
import { createSnow, shake, stepSnow } from '../render/snow.ts';
import { prefs } from '../state.ts';
import {
  clampMessage,
  clampName,
  clampNote,
  DEFAULT_MESSAGE,
  MAX_MESSAGE,
  MAX_NAME,
  MAX_NOTE,
  NOTE_SCALE,
  MAX_ROWS,
  wrapMessage,
} from '../render/text.ts';

const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;
const FONTS = ["33px 'Pixelta Rounded'", '33px Pixelta'];

interface Deps {
  music: ReturnType<typeof createMusicBox>;
  img: GlobeImages;
  reset: () => void;
}

export async function mountLetterScreen({ music, img, reset }: Deps) {
  const screen = $('letter-screen');
  const globeScreen = $('globe-screen');
  const canvas = $<HTMLCanvasElement>('letter');
  const ctx = canvas.getContext('2d')!;
  const layer = document.createElement('canvas'); // paper, border, stamp and text: static, so drawn only when something changes
  const still = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const sim = createSnow(45, Math.random, still);
  const letterImg = await loadLetterImages();

  let message = clampMessage(prefs.message);
  let name = clampName(prefs.name);
  let note = clampNote(prefs.note);
  let editing: 'message' | 'note' | 'name' | null = null;
  let L = layoutLetter({ w: innerWidth, h: innerHeight, dpr: 1 }, 3);
  let info: TextInfo;
  const dpr = () => window.devicePixelRatio || 1;

  const css = (dev: number) => `${dev / dpr()}px`;
  const place = (el: HTMLElement, r: { x: number; y: number; w: number; h: number }) =>
    Object.assign(el.style, { left: css(r.x), top: css(r.y), width: css(r.w), height: css(r.h) });

  function describe() {
    const sign = `Love, ${name || 'your name not set yet'}`;
    const extra = note ? ` ${note}` : '';
    $('letter-text').textContent = `${message}${extra} ${sign}`;
    canvas.setAttribute(
      'aria-label',
      `A Christmas airmail letter with a small snowglobe. It says: ${message}${extra} ${sign}. Tap the message, note or name to edit them.`,
    );
  }

  function renderLayer() {
    const { scale: s } = L;
    info = renderStatic(layer, letterImg, L.orientation, s, message, name, note, editing ?? undefined, true);
    canvas.dataset.textFits = String(info.fits);
    canvas.dataset.lines = String(info.lines);
    canvas.dataset.fontPx = info.size.toFixed(2);
    // dashed boxes sit a few px outside the text so the dashes never touch the letters
    const pad = 4 * dpr();
    const box = (id: string, r: { x: number; y: number; w: number; h: number }) =>
      place($(id), { x: r.x - pad, y: r.y - pad, w: r.w + 2 * pad, h: r.h + 2 * pad });
    box('edit-message-btn', info.message);
    // an empty note with no room for its prompt still gets a one-line target
    box('edit-note-btn', info.note.h ? info.note : { ...info.noteEdit, h: info.noteEdit.h / 2 });
    box('edit-name-btn', info.sign);
  }

  function layout() {
    const vp = { w: window.visualViewport?.width ?? innerWidth, h: window.visualViewport?.height ?? innerHeight, dpr: dpr() };
    L = layoutLetter(vp, uiPixel(vp.dpr));
    // backing store at device res: every art pixel is exactly `scale` device px (this also resets the context state)
    canvas.width = L.w * L.scale;
    canvas.height = L.h * L.scale;
    canvas.style.width = css(canvas.width);
    canvas.style.height = css(canvas.height);
    renderLayer();
    if (editing) edit(editing);
  }
  let pending = 0;
  const schedule = () => {
    cancelAnimationFrame(pending);
    pending = requestAnimationFrame(layout);
  };
  addEventListener('resize', schedule);
  addEventListener('orientationchange', schedule);
  window.visualViewport?.addEventListener('resize', schedule);

  // text needs both fonts; draw it again once they arrive
  void Promise.all(FONTS.map((f) => document.fonts.load(f))).then(() => {
    layout();
  });

  // inline editing
  const ta = $<HTMLTextAreaElement>('edit-message');
  const inp = $<HTMLInputElement>('edit-name');
  const noteInp = $<HTMLInputElement>('edit-note');
  const count = $('edit-count');
  const field = () => (editing === 'message' ? ta : editing === 'note' ? noteInp : inp);
  const updateCount = () => {
    const v = field().value;
    count.textContent =
      editing === 'message'
        ? `${v.length}/${MAX_MESSAGE} · ${wrapMessage(v).length}/${MAX_ROWS} lines`
        : `${v.length}/${editing === 'note' ? MAX_NOTE : MAX_NAME}`;
  };

  function edit(which: 'message' | 'note' | 'name') {
    editing = which;
    renderLayer(); // skips the text being edited
    const el = field();
    const m = which === 'message';
    const r = m
      ? info.messageEdit
      : which === 'note'
        ? info.noteEdit
        : { x: info.nameX, y: info.sign.y, w: info.sign.x + info.sign.w - info.nameX, h: info.sign.h };
    place(el, r);
    // at least 16px so iOS doesn't zoom the page on focus
    Object.assign(el.style, {
      fontSize: `max(16px, ${css(m || which === 'name' ? info.size : info.size * NOTE_SCALE)})`,
      lineHeight: `max(1.2em, ${css(36 * info.n)})`,
    });
    if (document.activeElement !== el) el.value = m ? message : which === 'note' ? note : name;
    el.hidden = count.hidden = false;
    // counter sits just under the field
    Object.assign(count.style, { left: css(r.x), top: css(r.y + r.h) });
    updateCount();
    if (document.activeElement !== el) el.focus();
  }
  function stop(save: boolean) {
    if (!editing) return;
    const which = editing;
    const v = field().value;
    editing = null; // before hiding: hiding blurs the field
    if (save) {
      screen.classList.add('edited'); // the dashed boxes stop pulsing once the user has found them
      if (which === 'message') prefs.message = message = clampMessage(v);
      else if (which === 'note') prefs.note = note = clampNote(v);
      else prefs.name = name = clampName(v);
      describe();
    }
    ta.hidden = noteInp.hidden = inp.hidden = count.hidden = true;
    renderLayer();
    $(`edit-${which}-btn`).focus();
  }
  for (const el of [ta, noteInp, inp] as (HTMLTextAreaElement | HTMLInputElement)[]) {
    el.addEventListener('input', () => {
      const v = (el === ta ? clampMessage : el === noteInp ? clampNote : clampName)(el.value);
      if (v !== el.value) el.value = v;
      updateCount();
    });
    el.addEventListener('blur', () => stop(true));
    el.onkeydown = (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        stop(true);
      } else if (e.key === 'Escape') stop(false);
    };
  }
  $('edit-message-btn').addEventListener('click', () => edit('message'));
  $('edit-note-btn').addEventListener('click', () => edit('note'));
  $('edit-name-btn').addEventListener('click', () => edit('name'));

  // the mini globe shakes like the big one: tap it, or Space/Enter while focused
  canvas.addEventListener('pointerdown', () => shake(sim, 0.5));
  canvas.addEventListener('keydown', (e) => {
    if (e.key === ' ' || e.key === 'Enter') {
      e.preventDefault();
      shake(sim, 0.8);
    }
  });

  // screens
  const env = $('envelope');
  const reveal = () => {
    env.hidden = true;
    screen.classList.remove('opening');
    canvas.focus({ focusVisible: false } as FocusOptions); // screen change, not keyboard nav: no ring
  };
  function open() {
    globeScreen.hidden = true;
    screen.hidden = false;
    layout();
    describe();
    if (still) return reveal();
    // 4 frames at 6 fps, then a beat on the open envelope
    screen.classList.add('opening');
    env.hidden = false;
    env.style.animation = 'none';
    void env.offsetWidth; // restart the animation
    env.style.animation = '';
    setTimeout(reveal, 800);
  }

  // Save GIF: the encoder is lazy-loaded here, so first load never pays for it
  const saveBtn = $<HTMLButtonElement>('save-gif-btn');
  const gifNote = $('gif-note');
  const NOTE = gifNote.textContent!;
  saveBtn.addEventListener('click', async () => {
    stop(true); // an open edit is part of the letter
    saveBtn.disabled = true;
    saveBtn.textContent = 'Making GIF…';
    gifNote.textContent = 'Making GIF…';
    const coarse = matchMedia('(pointer: coarse)').matches;
    try {
      const { encodeLetterGif } = await import('../render/gif.ts');
      let last = 0;
      const { blob } = await encodeLetterGif({ img, letterImg, o: L.orientation, message, name, note }, L.scale, coarse, (n, total) => {
        if (n - last >= 10) gifNote.textContent = `Making GIF… ${Math.round((n / total) * 100)}%`;
        if (n - last >= 10) last = n;
      });
      const file = new File([blob], 'shake-a-memory.gif', { type: 'image/gif' });
      const canShare = coarse && !!navigator.canShare?.({ files: [file] });
      // iOS rejects share() once the tap's activation has expired, so sharing waits for its own tap in the dialog
      showReady(blob, file, coarse, canShare);
      if (!coarse) dl.click(); // desktop: save straight away; the dialog says where it went
      gifNote.textContent = NOTE;
    } catch {
      gifNote.textContent = "Couldn't make the GIF. Please try again.";
    } finally {
      saveBtn.disabled = false;
      saveBtn.textContent = 'Save GIF';
    }
  });

  const ready = $<HTMLDialogElement>('gif-ready');
  const dl = $<HTMLAnchorElement>('gif-download');
  const shareBtn = $<HTMLButtonElement>('gif-share');
  const where = $('gif-where');
  let shareFile: File | undefined;
  function showReady(blob: Blob, file: File, coarse: boolean, canShare: boolean) {
    const url = URL.createObjectURL(blob);
    dl.href = $<HTMLImageElement>('gif-preview').src = url;
    dl.textContent = coarse ? 'Download' : 'Download again';
    shareFile = canShare ? file : undefined;
    shareBtn.hidden = !canShare;
    where.textContent = canShare
      ? 'Tap Share to send it or save it to your Photos.'
      : coarse
        ? 'Press and hold the picture to save it.'
        : 'Saved to your Downloads folder as shake-a-memory.gif.';
    ready.showModal();
    (canShare ? shareBtn : dl).focus();
  }
  ready.addEventListener('close', () => URL.revokeObjectURL(dl.href));
  $('gif-close').addEventListener('click', () => ready.close());
  shareBtn.addEventListener('click', async () => {
    try {
      await navigator.share({ files: [shareFile!], title: 'Shake-a-Memory' });
    } catch (e) {
      if ((e as Error).name !== 'AbortError') where.textContent = "Couldn't open sharing. Press and hold the picture to save it.";
    }
  });

  const confirm = $<HTMLDialogElement>('confirm-new');
  $('another-btn').addEventListener('click', () => confirm.showModal());
  $('confirm-no').addEventListener('click', () => confirm.close());
  $('confirm-yes').addEventListener('click', () => {
    confirm.close();
    prefs.message = message = DEFAULT_MESSAGE;
    prefs.name = name = '';
    prefs.note = note = '';
    gifNote.textContent = NOTE;
    screen.hidden = true;
    globeScreen.hidden = false;
    reset();
  });

  // Fixed 60 Hz sim, like the globe screen; only runs while this screen shows.
  const STEP = 1 / 60;
  let prev = -1;
  let acc = 0;
  const tick = (t: number) => {
    requestAnimationFrame(tick);
    if (screen.hidden) {
      prev = -1;
      return;
    }
    acc += prev < 0 ? 0 : Math.min((t - prev) / 1000, 0.25);
    prev = t;
    for (; acc >= STEP; acc -= STEP) stepSnow(sim, STEP);
    music.setEnergy(sim.energy);
    const s = L.scale;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(layer, 0, 0);
    const g = LETTER[L.orientation].globe;
    drawGlobe(ctx, img, s, still ? 0 : Math.floor((t / 1000) * ASSETS.cat.fps), sim, g.x * s, g.y * s);
  };
  requestAnimationFrame(tick);

  return { open };
}
