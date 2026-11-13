// Globe screen (SPEC §3.1): background, corner icons, title, globe canvas, buttons, footer.
import { ASSETS, BACKGROUNDS, BG_VARIANTS, bgSrc } from '../assets/manifest.ts';
import { drawGlobe, loadGlobeImages } from '../render/globeScene.ts';
import { layoutGlobe } from '../render/scale.ts';
import { prefs } from '../state.ts';
import { handwrite } from '../ui/handwritten.ts';

// Set this to the public repo URL to show the footer GitHub link.
const REPO_URL = '';

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

  function layout() {
    const dpr = window.devicePixelRatio || 1;
    const vv = window.visualViewport;
    const vp = { w: vv?.width ?? innerWidth, h: vv?.height ?? innerHeight, dpr };
    const L = layoutGlobe(vp);
    const css = (dev: number) => `${dev / dpr}px`;
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

  // Globe: cat animates at its own fps; static when reduced motion is preferred. Pauses with the tab (rAF stops).
  const img = await loadGlobeImages();
  const still = matchMedia('(prefers-reduced-motion: reduce)');
  let last = -1;
  const tick = (t: number) => {
    const frame = still.matches ? 0 : Math.floor((t / 1000) * ASSETS.cat.fps);
    if (frame !== last) drawGlobe(ctx, img, (last = frame));
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}
