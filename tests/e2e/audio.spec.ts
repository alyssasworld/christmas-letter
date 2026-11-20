import { expect, test } from '@playwright/test';

// iPhone Safari mutes web audio when the ring switch is on silent unless the page asks for media playback.
test.use({ browserName: 'webkit' });
const sessionType = () => (navigator as Navigator & { audioSession: { type: string } }).audioSession.type;

test('the first tap sets the audio session to playback (iOS silent switch)', async ({ page }) => {
  await page.goto('/');
  expect(await page.evaluate(sessionType)).toBe('auto');
  await page.locator('#globe').click();
  await expect.poll(() => page.evaluate(sessionType)).toBe('playback');
});
