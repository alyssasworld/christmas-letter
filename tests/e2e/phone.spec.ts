import { devices, expect, test } from '@playwright/test';

// Chromium with iPhone metrics: CDP can set a pinch-zoom scale, which WebKit can't.
const { defaultBrowserType: _, userAgent: __, ...iphone } = devices['iPhone 13'];
test.use(iphone);

for (const [screen, url, id] of [
  ['globe', '/', 'globe'],
  ['letter', '/?screen=letter', 'letter'],
] as const) {
  test(`pinch-zoom leaves the ${screen} screen layout alone`, async ({ page, context }) => {
    await page.goto(url);
    if (screen === 'letter') await expect(page.locator('#letter')).toHaveAttribute('data-text-fits', 'true');
    await page.evaluate(() => document.fonts.ready);
    const width = () => page.evaluate((id) => document.getElementById(id)!.style.width, id);
    const before = await width();
    const cdp = await context.newCDPSession(page);
    await cdp.send('Emulation.setPageScaleFactor', { pageScaleFactor: 2 });
    await expect.poll(() => page.evaluate(() => visualViewport!.scale)).toBe(2);
    await page.waitForTimeout(100); // one layout frame
    expect(await width()).toBe(before);
  });
}

// Mobile Safari drops drop-shadow offsets under 1 CSS px, which removed the greeting's cream outline on phones.
test('the greeting outline offsets are at least 1 CSS px on a phone', async ({ page }) => {
  await page.goto('/');
  const offsets = await page.evaluate(() =>
    [...getComputedStyle(document.querySelector('.greet')!).filter.matchAll(/(-?[\d.]+)px (-?[\d.]+)px 0px/g)].map((m) =>
      Math.max(Math.abs(+m[1]), Math.abs(+m[2])),
    ),
  );
  expect(offsets.length).toBeGreaterThan(0);
  for (const o of offsets) expect(o).toBeGreaterThanOrEqual(1);
});

test('on iPhone, the first "Shake me!" tap shakes and asks for motion permission once; no extra button', async ({ page }) => {
  await page.addInitScript(() => {
    (window as unknown as { asks: number }).asks = 0;
    Object.assign(DeviceMotionEvent, {
      requestPermission: async () => {
        (window as unknown as { asks: number }).asks++;
        return 'granted';
      },
    });
  });
  await page.goto('/');
  await expect(page.locator('#motion-btn')).toHaveCount(0);
  await page.locator('#shake-btn').tap();
  await page.locator('#shake-btn').tap();
  await expect.poll(() => page.evaluate(() => (window as unknown as { asks: number }).asks)).toBe(1);
});

test.describe('Android', () => {
  const { defaultBrowserType: _, ...pixel } = devices['Pixel 7'];
  test.use(pixel);
  // Chromium exposes requestPermission too (it resolves without a prompt), so shaking must not wait for a tap
  test('shaking the phone works without tapping anything first', async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() =>
      dispatchEvent(new DeviceMotionEvent('devicemotion', { accelerationIncludingGravity: { x: 0, y: 9.8, z: 0 } })),
    );
    await expect(page.locator('#hint')).toHaveText('Shake your phone!');
  });
});
