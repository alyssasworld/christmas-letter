import { expect, test } from '@playwright/test';
import { VIEWPORTS } from './viewports.ts';

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

test('Shake me! swirls the snow', async ({ page }) => {
  await page.goto('/');
  await page.waitForTimeout(300);
  const snap = () => page.evaluate(() => (document.getElementById('globe') as HTMLCanvasElement).toDataURL());
  const before = await snap();
  await page.click('#shake-btn');
  await page.waitForTimeout(250);
  expect(await snap()).not.toBe(before);
});
