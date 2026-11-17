import { expect, test } from '@playwright/test';
import fs from 'node:fs';
import { VIEWPORTS } from './viewports.ts';

// ?screen=letter is a test hook that skips the photo and shake normally needed to unlock the letter.
for (const { w, h, dpr } of VIEWPORTS) {
  test.describe(`letter ${w}x${h}@${dpr}`, () => {
    test.use({ viewport: { width: w, height: h }, deviceScaleFactor: dpr, reducedMotion: 'reduce' });

    test('crisp, fits, text inside', async ({ page }) => {
      await page.goto('/?screen=letter');
      const canvas = page.locator('#letter');
      await expect(canvas).toHaveAttribute('data-text-fits', 'true');
      const m = await page.evaluate(() => {
        const box = (sel: string) => document.querySelector(sel)!.getBoundingClientRect().toJSON();
        const c = document.getElementById('letter') as HTMLCanvasElement;
        const de = document.documentElement;
        return {
          canvasW: c.width,
          scroll: [de.scrollWidth, de.scrollHeight],
          boxes: [
            box('#letter-hint'),
            box('#letter'),
            box('#save-gif-btn'),
            box('#another-btn'),
            box('.letter-actions .hint'),
            box('#bg-btn'),
            box('#sound-btn'),
          ],
        };
      });
      const artW = w >= h ? 288 : 136;
      expect(m.canvasW % artW).toBe(0); // integer device px per art px
      const [hint, letter, ...rest] = m.boxes;
      expect(Math.abs(letter.width * dpr - m.canvasW)).toBeLessThan(0.1); // 1:1 with device pixels
      expect(m.scroll[0]).toBeLessThanOrEqual(w);
      expect(m.scroll[1]).toBeLessThanOrEqual(h);
      for (const b of [hint, letter, ...rest]) {
        expect(b.left).toBeGreaterThanOrEqual(-0.5);
        expect(b.right).toBeLessThanOrEqual(w + 0.5);
        expect(b.top).toBeGreaterThanOrEqual(-0.5);
        expect(b.bottom).toBeLessThanOrEqual(h + 0.5);
      }
      expect(hint.top).toBeGreaterThanOrEqual(rest[3].bottom - 1); // clear of the corner buttons
      expect(letter.top).toBeGreaterThanOrEqual(hint.bottom - 1);
    });
  });
}

test.describe('letter editing', () => {
  test.use({ reducedMotion: 'reduce' });

  test('long message wraps to 3 lines and still fits; name edit; Escape cancels', async ({ page }) => {
    await page.goto('/?screen=letter');
    const canvas = page.locator('#letter');
    await expect(canvas).toHaveAttribute('data-text-fits', 'true');

    await page.click('#edit-message-btn');
    await page.fill('#edit-message', 'Wishing you all a wonderful holiday full of joy and warm cocoa and cheer ' + 'W'.repeat(40));
    await expect(page.locator('#edit-count')).toContainText('lines');
    await page.keyboard.press('Enter');
    await expect(canvas).toHaveAttribute('data-lines', '3');
    await expect(canvas).toHaveAttribute('data-text-fits', 'true');
    expect((await page.locator('#letter-text').textContent())!.length).toBeLessThanOrEqual(54 + 30);

    await page.click('#edit-name-btn');
    await page.fill('#edit-name', 'Alyssa ♥');
    await expect(page.locator('#edit-name')).toHaveValue('Alyssa '); // unsupported glyph dropped
    await page.keyboard.press('Enter');
    await expect(canvas).toHaveAttribute('aria-label', /Love, Alyssa /);

    await page.click('#edit-name-btn');
    await page.fill('#edit-name', 'Zed');
    await page.keyboard.press('Escape');
    await expect(canvas).toHaveAttribute('aria-label', /Love, Alyssa /);
    await page.reload(); // remembered in prefs
    await expect(page.locator('#letter')).toHaveAttribute('aria-label', /Love, Alyssa /);
  });

  test('Make another confirms, clears and returns to the globe', async ({ page }) => {
    await page.goto('/?screen=letter');
    await expect(page.locator('#globe-screen')).toBeHidden();
    await page.click('#another-btn');
    await expect(page.locator('#confirm-new')).toBeVisible();
    await page.click('#confirm-no');
    await expect(page.locator('#letter-screen')).toBeVisible();
    await page.click('#another-btn');
    await page.click('#confirm-yes');
    await expect(page.locator('#globe-screen')).toBeVisible();
    await expect(page.locator('#letter-screen')).toBeHidden();
    await expect(page.locator('#letter-btn')).toBeHidden();
    await expect(page.locator('#globe')).toBeFocused();
  });
});

test('envelope plays, then the letter is revealed', async ({ page }) => {
  await page.goto('/?screen=letter');
  await expect(page.locator('#envelope')).toBeVisible();
  await expect(page.locator('#envelope')).toBeHidden({ timeout: 3000 });
  await expect(page.locator('#letter')).toBeVisible();
  await expect(page.locator('#letter')).toBeFocused();
});

test('the hint and edit boxes are there, and shake does not leave the globe screen', async ({ page }) => {
  await page.goto('/');
  await page.click('#shake-btn');
  await expect(page.locator('#letter-screen')).toBeHidden();
  await page.goto('/?screen=letter');
  await expect(page.locator('#letter-hint')).toContainText('Tap the message or your name to edit');
  for (const id of ['edit-message-btn', 'edit-name-btn']) {
    const b = await page.locator('#' + id).boundingBox();
    expect(Math.min(b!.width, b!.height)).toBeGreaterThanOrEqual(44);
  }
});

test('Save GIF downloads a small looping GIF without leaving the origin', async ({ page }) => {
  test.setTimeout(120_000);
  const origin = new URL('http://127.0.0.1:4173').origin;
  const foreign: string[] = [];
  page.on('request', (r) => {
    const u = new URL(r.url());
    if (!['data:', 'blob:'].includes(u.protocol) && u.origin !== origin) foreign.push(r.url());
  });
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/?screen=letter');
  await expect(page.locator('#letter')).toHaveAttribute('data-text-fits', 'true');
  const pending = page.waitForEvent('download', { timeout: 100_000 });
  await page.click('#save-gif-btn');
  await expect(page.locator('#save-gif-btn')).toBeDisabled(); // while encoding
  await expect(page.locator('#save-gif-btn')).toHaveText('Making GIF…');
  const download = await pending;
  expect(download.suggestedFilename()).toBe('shake-a-memory.gif');
  const bytes = fs.readFileSync((await download.path())!);
  expect(bytes.subarray(0, 6).toString('latin1')).toBe('GIF89a');
  expect(bytes.length).toBeLessThan(3_000_000);
  expect(bytes.includes(Buffer.from('NETSCAPE2.0'))).toBe(true); // loops
  await expect(page.locator('#save-gif-btn')).toBeEnabled({ timeout: 5000 });
  await expect(page.locator('#gif-note')).toHaveText('GIFs have no sound');
  await expect(page.locator('#gif-ready')).toBeVisible();
  await expect(page.locator('#gif-where')).toHaveText('Saved to your Downloads folder as shake-a-memory.gif.');
  expect(await page.locator('#gif-preview').evaluate((i: HTMLImageElement) => i.naturalWidth)).toBeGreaterThan(0);
  await expect(page.locator('#gif-download')).toHaveAttribute('download', 'shake-a-memory.gif');
  expect(foreign).toEqual([]);
});

test('on touch, sharing waits for its own tap', async ({ browser }) => {
  test.setTimeout(120_000);
  const ctx = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 3,
    hasTouch: true,
    isMobile: true,
    reducedMotion: 'reduce',
  });
  const page = await ctx.newPage();
  await page.addInitScript(() => {
    (window as unknown as { shared: number }).shared = 0;
    navigator.canShare = () => true;
    navigator.share = async (d?: ShareData) => {
      (window as unknown as { shared: number }).shared = d?.files?.length ?? -1;
    };
  });
  await page.goto('/?screen=letter');
  await expect(page.locator('#letter')).toHaveAttribute('data-text-fits', 'true');
  await page.tap('#save-gif-btn');
  await expect(page.locator('#gif-ready')).toBeVisible({ timeout: 100_000 });
  await expect(page.locator('#gif-where')).toContainText('Tap Share');
  await expect(page.locator('#gif-share')).toBeFocused();
  expect(await page.evaluate(() => (window as unknown as { shared: number }).shared)).toBe(0);
  await page.screenshot({ path: process.env.GIF_SHOT ?? 'test-results/gif-ready-phone.png' });
  await page.tap('#gif-share');
  await expect.poll(() => page.evaluate(() => (window as unknown as { shared: number }).shared)).toBe(1);
  await ctx.close();
});
