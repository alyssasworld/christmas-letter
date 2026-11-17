// Handwritten greeting: split text into letters, each with a small seeded tilt, baseline drift, size and spacing change.
// Seeded so it looks identical on every load (and later in the GIF). Styling lives in .greet in style.css.
export const seeded = (seed: number) => () => (seed = (seed * 16807) % 2147483647) / 2147483647;

/** One letter's wobble: baseline drift in whole font px, tilt in degrees, extra gap in font px, size multiplier. */
export function wobble(rnd: () => number, i: number) {
  return {
    drift: Math.round(Math.sin(i * 0.6) * 1.5 + (rnd() - 0.5) * 2.5),
    rot: (rnd() - 0.5) * 12,
    gap: Math.round((rnd() - 0.4) * 2),
    scale: 0.92 + rnd() * 0.16,
  };
}

export function handwrite(el: HTMLElement, seed = 11) {
  const rnd = seeded(seed);
  const label = el.textContent ?? '';
  let i = 0;
  for (const node of [...el.childNodes]) {
    if (node.nodeType !== Node.TEXT_NODE) continue;
    const frag = document.createDocumentFragment();
    for (const ch of node.textContent ?? '') {
      const s = document.createElement('span');
      s.className = 'ch';
      s.textContent = ch;
      s.setAttribute('aria-hidden', 'true');
      const w = wobble(rnd, i); // 1 font px = 0.03em
      s.style.setProperty('--y', `${w.drift * 0.03}em`);
      s.style.setProperty('--r', `${w.rot.toFixed(1)}deg`);
      s.style.marginRight = `${w.gap * 0.03}em`;
      s.style.setProperty('--s', w.scale.toFixed(3));
      frag.appendChild(s);
      i++;
    }
    node.replaceWith(frag);
  }
  // letters are aria-hidden; screen readers get the phrase once
  const sr = document.createElement('span');
  sr.className = 'sr-only';
  sr.textContent = label;
  el.appendChild(sr);
}
