import { expect, test } from '@playwright/test';

// SPEC §9: processing a photo must never contact another origin. The image is synthetic, never a real person.
test('photo upload stays on our own origin', async ({ page }) => {
  test.setTimeout(240_000); // first run decodes the ~65 MB self-hosted model
  const origin = new URL('http://127.0.0.1:4173').origin;
  const foreign: string[] = [];
  page.on('request', (r) => {
    const u = new URL(r.url());
    if (!['data:', 'blob:'].includes(u.protocol) && u.origin !== origin) foreign.push(r.url());
  });
  await page.goto('/');

  const png = await page.evaluate(async () => {
    const c = document.createElement('canvas');
    c.width = c.height = 240;
    const g = c.getContext('2d')!;
    g.fillStyle = '#9ac4d0';
    g.fillRect(0, 0, 240, 240);
    g.fillStyle = '#c44935'; // body
    g.fillRect(80, 120, 80, 120);
    g.fillStyle = '#e5b48f'; // head
    g.beginPath();
    g.arc(120, 85, 40, 0, Math.PI * 2);
    g.fill();
    const blob = await new Promise<Blob>((r) => c.toBlob((b) => r(b!), 'image/png'));
    return Array.from(new Uint8Array(await blob.arrayBuffer()));
  });

  await page.click('#upload-btn');
  await expect(page.locator('#upload-menu')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.locator('#upload-menu')).toBeHidden();
  await expect(page.locator('#upload-btn')).toBeFocused();

  await page.setInputFiles('#file-input', { name: 'test.png', mimeType: 'image/png', buffer: Buffer.from(png) });
  await expect(page.locator('#hint')).toHaveText(/in the globe|framed photo/, { timeout: 200_000 });
  await expect(page.locator('#busy')).toBeHidden();
  await expect(page.locator('#globe')).toHaveAttribute('aria-label', /your photo/);
  expect(foreign).toEqual([]);

  // the cut-out opens the letter by itself
  await expect(page.locator('#letter-screen')).toBeVisible();
  await expect(page.locator('#globe-screen')).toBeHidden();
  await expect(page.locator('#letter')).toBeFocused({ timeout: 5000 });
});

test('non-image files are rejected with a message', async ({ page }) => {
  await page.goto('/');
  await page.setInputFiles('#file-input', { name: 'a.txt', mimeType: 'text/plain', buffer: Buffer.from('hi') });
  await expect(page.locator('#hint')).toHaveText(/doesn't look like a photo/);
});
