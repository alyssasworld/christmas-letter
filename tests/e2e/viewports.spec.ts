import { expect, test } from '@playwright/test';

// SPEC §7 viewport matrix, both orientations, at typical device pixel ratios.
const SIZES: [number, number, number][] = [
  [320, 568, 2],
  [375, 667, 2],
  [390, 844, 3],
  [430, 932, 3],
  [768, 1024, 2],
  [1024, 768, 2],
  [1280, 800, 2],
  [1440, 900, 2],
  [1920, 1080, 1],
  [2560, 1440, 1],
];
// both orientations, de-duplicated (768x1024 and 1024x768 are both already listed)
const VIEWPORTS = [
  ...new Map(
    SIZES.flatMap(([w, h, dpr]) => [
      [w, h, dpr],
      [h, w, dpr],
    ]).map((v) => [v.join(), v]),
  ).values(),
].map(([w, h, dpr]) => ({ w, h, dpr }));

for (const { w, h, dpr } of VIEWPORTS) {
  test.describe(`${w}x${h}@${dpr}`, () => {
    test.use({ viewport: { width: w, height: h }, deviceScaleFactor: dpr });

    test('globe screen fits, crisp, no scrollbars', async ({ page }) => {
      const origin = new URL('http://127.0.0.1:4173').origin;
      const foreign: string[] = [];
      page.on('request', (r) => {
        const u = new URL(r.url());
        if (!['data:', 'blob:'].includes(u.protocol) && u.origin !== origin) foreign.push(r.url());
      });
      await page.goto('/');
      await page.evaluate(() => document.fonts.ready);
      await page.waitForTimeout(200);

      const m = await page.evaluate(() => {
        const box = (id: string) => document.getElementById(id)!.getBoundingClientRect().toJSON();
        const de = document.documentElement;
        return {
          scroll: [de.scrollWidth, de.scrollHeight],
          globe: box('globe'),
          actions: box('actions'),
          footer: box('footer'),
          bgBtn: box('bg-btn'),
          soundBtn: box('sound-btn'),
          title: document.querySelector('#title .greet')!.getBoundingClientRect().toJSON(),
        };
      });

      expect(m.scroll[0]).toBeLessThanOrEqual(w);
      expect(m.scroll[1]).toBeLessThanOrEqual(h);
      // integer device-pixel scale for the 96x120 globe
      const s = (m.globe.width * dpr) / 96;
      expect(Math.abs(s - Math.round(s))).toBeLessThan(0.01);
      expect(Math.abs((m.globe.height * dpr) / 120 - s)).toBeLessThan(0.01);
      // everything on screen, stacked without overlap
      for (const b of [m.globe, m.actions, m.footer, m.bgBtn, m.soundBtn, m.title]) {
        expect(b.left).toBeGreaterThanOrEqual(-0.5);
        expect(b.right).toBeLessThanOrEqual(w + 0.5);
        expect(b.top).toBeGreaterThanOrEqual(-0.5);
        expect(b.bottom).toBeLessThanOrEqual(h + 0.5);
      }
      expect(m.title.top).toBeGreaterThanOrEqual(m.bgBtn.bottom - 1);
      expect(m.title.bottom).toBeLessThanOrEqual(m.globe.top + (8 * m.globe.height) / 120); // may touch the cat's ears
      expect(m.actions.top).toBeGreaterThanOrEqual(m.globe.bottom - 1);
      expect(m.actions.bottom).toBeLessThanOrEqual(m.footer.top + 8); // footer links have generous padding
      // touch targets
      for (const b of [m.bgBtn, m.soundBtn]) expect(Math.min(b.width, b.height)).toBeGreaterThanOrEqual(44);
      expect(foreign).toEqual([]);
    });
  });
}

test('background picker cycles and is remembered', async ({ page }) => {
  await page.goto('/');
  const bg = () => page.evaluate(() => getComputedStyle(document.getElementById('bg')!).backgroundImage);
  const first = await bg();
  await page.click('#bg-btn');
  const second = await bg();
  expect(second).not.toBe(first);
  await page.reload();
  expect(await bg()).toBe(second);
});
