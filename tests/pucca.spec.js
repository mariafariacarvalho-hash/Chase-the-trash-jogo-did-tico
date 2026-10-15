const { test, expect } = require('@playwright/test');

test('botao jogar abre intro e comecar inicia a corrida', async ({ page }) => {
  const pageErrors = [];
  const failedResponses = [];

  page.on('pageerror', error => pageErrors.push(error.message));
  page.on('response', response => {
    if (response.status() >= 400) {
      failedResponses.push(`${response.status()} ${response.url()}`);
    }
  });

  await page.goto('http://localhost:8000');
  await page.waitForTimeout(1500);
  await expect(page.locator('#playButton')).toBeVisible();
  await page.locator('#playButton').click();
  await expect(page.locator('#intro')).toBeVisible();
  await page.locator('#introStart').click();
  await expect(page.locator('#intro')).toBeHidden();
  await expect(page.locator('#hud')).toBeVisible();

  expect(pageErrors).toEqual([]);
  expect(failedResponses).toEqual([]);
});
