import { expect, test } from '@playwright/test';

test('admin home renders', async ({ page }) => {
  await page.goto('/');

  await expect(page.getByRole('heading', { name: 'admin' })).toBeVisible();
});
