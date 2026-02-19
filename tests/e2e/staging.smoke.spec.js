import { test, expect } from '@playwright/test';

const hasBaseUrl = Boolean(process.env.STAGING_BASE_URL);

test.describe('staging smoke', () => {
  test.skip(!hasBaseUrl, 'Set STAGING_BASE_URL to run staging smoke tests.');

  test('auth + home shell loads', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('#loginBtn')).toBeVisible();
    await page.click('#loginBtn');
    await expect(page.locator('#savedCount')).toBeVisible();
  });

  test('content detail opens for first content card', async ({ page }) => {
    await page.goto('/');
    await page.click('#loginBtn');
    await expect(page.locator('#contentList .content-card').first()).toBeVisible();
    await page.locator('#contentList .viewBtn').first().click();
    await expect(page.locator('#detailBox h3')).toBeVisible();
  });
});
