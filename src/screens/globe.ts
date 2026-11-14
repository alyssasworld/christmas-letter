// Globe screen (SPEC §3.1): background, corner icons, title, globe canvas, buttons, footer.
import { ASSETS, BACKGROUNDS, BG_VARIANTS, bgSrc } from '../assets/manifest.ts';
import { drawGlobe, loadGlobeImages } from '../render/globeScene.ts';
import { layoutGlobe } from '../render/scale.ts';
import { createSnow, shake, stepSnow, type Snow } from '../render/snow.ts';
import { prefs } from '../state.ts';
import { handwrite } from '../ui/handwritten.ts';

// Set this to the public repo URL to show the footer GitHub link.
const REPO_URL = '';

let snow: Snow | undefined;
/** Current snow energy (0-1), for the music box. */
export const getEnergy = () => snow?.energy ?? 0;

const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;

export async function mountGlobeScreen() {
  const bg = $('bg');
  const canvas = $<HTMLCanvasElement>('globe');
  const title = $('title');
  const actions = $('actions');
  const root = document.documentElement;
  const ctx = canvas.getContext('2d')!;
  handwrite(title.querySelector('.greet')!);

  const gh = $<HTMLAnchorElement>('github-link');
  if (REPO_URL) Object.assign(gh, { href: REPO_URL, hidden: false });

  let background = prefs.background;
  let tiltPx = 0; // CSS px per globe art px, for the dome tilt

  function layout() {
    const dpr = window.devicePixelRatio || 1;
    const vv = window.visualViewport;
    const vp = { w: vv?.width ?? innerWidth, h: vv?.height ?? innerHeight, dpr };
    const L = layoutGlobe(vp);
    const css = (dev: number) => `${dev / dpr}px`;
    tiltPx = L.globeScale / dpr;
    const v = BG_VARIANTS[L.variant];

    root.style.setProperty('--ui', css(L.uiPx));
    root.style.setProperty('--font-px', css(L.textPx));
    // button labels: whole font pixels, ~17-22 CSS px on phones and tablets
    root.style.setProperty('--btn-font', css(Math.max(1, Math.round(dpr * 0.6))));

    bg.style.backgroundImage = `url(${import.meta.env.BASE_URL}${bgSrc(background, L.variant)})`;
    bg.style.backgroundSize = `${css(v.w * L.bgScale)} ${css(v.h * L.bgScale)}`;
    bg.style.backgroundPosition = `${css(L.bgX)} ${css(L.bgY)}`;

    Object.assign(canvas.style, {
      left: css(L.globeX),
      top: css(L.globeY),
      width: css(96 * L.globeScale),
      height: css(120 * L.globeScale),
    });

    // title sits between the corner icons and the cat on top of the globe
    const cornerBottom = 8 * dpr + 16 * L.uiPx;
    title.style.top = css(cornerBottom);
    title.style.height = css(Math.max(0, L.globeY + ASSETS.cat.y * L.globeScale - cornerBottom));
    // below the globe's shadow (frame rows 112-119)
    actions.style.top = css(L.anchorY + 8 * L.globeScale + 6 * dpr);
  }

  // debounce to one layout per frame
  let pending = 0;
  const schedule = () => {
    cancelAnimationFrame(pending);
    pending = requestAnimationFrame(layout);
  };
  addEventListener('resize', schedule);
  addEventListener('orientationchange', schedule);
  window.visualViewport?.addEventListener('resize', schedule);
  layout();

  $('bg-btn').addEventListener('click', () => {
    background = BACKGROUNDS[(BACKGROUNDS.indexOf(background) + 1) % BACKGROUNDS.length];
    prefs.background = background;
    layout();
  });

  const soundBtn = $('sound-btn');
  const renderSound = () => {
    const on = prefs.soundOn;
    soundBtn.setAttribute('aria-pressed', String(on));
    soundBtn.querySelector('.icon')!.setAttribute('data-icon', on ? 'soundOn' : 'soundOff');
  };
  soundBtn.addEventListener('click', () => {
    prefs.soundOn = !prefs.soundOn;
    renderSound();
  });
  renderSound();

  const about = $<HTMLDialogElement>('about');
  $('about-btn').addEventListener('click', () => about.showModal());

  const img = await loadGlobeImages();
  const still = matchMedia('(prefers-reduced-motion: reduce)');
  snow = createSnow(still.matches ? 40 : 90, Math.random, still.matches);
  const sim = snow;

  // Pointer drag: velocity in art px/s becomes energy and pushes the snow along the drag.
  let drag: { x: number; y: number; t: number } | null = null;
  canvas.addEventListener('pointerdown', (e) => {
    canvas.setPointerCapture(e.pointerId);
    drag = { x: e.clientX, y: e.clientY, t: e.timeStamp };
  });
  canvas.addEventListener('pointermove', (e) => {
    if (!drag) return;
    const k = 96 / canvas.getBoundingClientRect().width;
    const dt = Math.max(1, e.timeStamp - drag.t) / 1000;
    const dx = (e.clientX - drag.x) * k;
    const dy = (e.clientY - drag.y) * k;
    const speed = Math.hypot(dx, dy) / dt;
    if (speed > 0) shake(sim, Math.min(0.01, speed / 30000), dx / (speed * dt), dy / (speed * dt));
    drag = { x: e.clientX, y: e.clientY, t: e.timeStamp };
  });
  const endDrag = () => (drag = null);
  canvas.addEventListener('pointerup', endDrag);
  canvas.addEventListener('pointercancel', endDrag);

  $('shake-btn').addEventListener('click', () => shake(sim, 0.8));
  canvas.addEventListener('keydown', (e) => {
    if (e.key === ' ' || e.key === 'Enter') {
      e.preventDefault();
      shake(sim, 0.8);
    }
  });
  addEventListener('keydown', (e) => {
    const t = e.target as HTMLElement;
    if (e.ctrlKey || e.metaKey || e.altKey || about.open || /^(INPUT|TEXTAREA)$/.test(t.tagName) || t.isContentEditable) return;
    if (e.key.toLowerCase() === 'm') soundBtn.click();
    else if (e.key.toLowerCase() === 'b') $('bg-btn').click();
  });

  // Device motion (SPEC §6): feature-detected; "active" only once a real reading arrives (desktops fire none or nulls).
  const hint = $('hint');
  const motionBtn = $('motion-btn');
  let base: number[] | null = null;
  const onMotion = (e: DeviceMotionEvent) => {
    const a = e.accelerationIncludingGravity ?? e.acceleration;
    if (a?.x == null || a.y == null || a.z == null) return;
    hint.textContent = 'Shake your phone!';
    const cur = [a.x, a.y, a.z];
    base ??= cur;
    const d = cur.map((v, i) => v - base![i]);
    base = base.map((b, i) => b * 0.9 + cur[i] * 0.1);
    const mag = Math.hypot(...d);
    if (mag > 2) shake(sim, Math.min(0.3, (mag - 2) / 60), d[0] / mag, -d[1] / mag);
  };
  if (typeof DeviceMotionEvent !== 'undefined') {
    const req = (DeviceMotionEvent as unknown as { requestPermission?: () => Promise<string> }).requestPermission;
    // desktop Chrome also exposes requestPermission; only offer the prompt where a phone could be shaken
    if (typeof req === 'function' && matchMedia('(any-pointer: coarse)').matches) {
      motionBtn.hidden = false;
      motionBtn.addEventListener('click', async () => {
        motionBtn.hidden = true;
        if ((await req().catch(() => 'denied')) === 'granted') addEventListener('devicemotion', onMotion);
      });
    } else addEventListener('devicemotion', onMotion);
  }

  // Fixed 60 Hz sim inside rAF. rAF pauses with the tab; elapsed is clamped so a long gap doesn't replay a backlog.
  const STEP = 1 / 60;
  let prev = -1;
  let acc = 0;
  let avgMs = 16;
  let slowFor = 0;
  let tilt = 0;
  const tick = (t: number) => {
    const el = prev < 0 ? 0 : Math.min((t - prev) / 1000, 0.25);
    prev = t;
    acc += el;
    while (acc >= STEP) {
      stepSnow(sim, STEP);
      acc -= STEP;
    }
    // auto quality: sustained slow frames halve the flake count, once
    if (el > 0 && el < 0.25 && sim.flakes.length > 60) {
      avgMs = avgMs * 0.95 + el * 1000 * 0.05;
      slowFor = avgMs > 20 ? slowFor + el : 0;
      if (slowFor > 2) sim.flakes.length = Math.max(30, sim.flakes.length >> 1);
    }
    // dome tilt: whole art px so the canvas stays pixel-aligned
    const tiltNow = still.matches ? 0 : Math.round(2 * Math.sin(t / 70) * Math.min(1, sim.energy * 1.5));
    if (tiltNow !== tilt) canvas.style.transform = `translateX(${(tilt = tiltNow) * tiltPx}px)`;
    drawGlobe(ctx, img, still.matches ? 0 : Math.floor((t / 1000) * ASSETS.cat.fps), sim);
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}
