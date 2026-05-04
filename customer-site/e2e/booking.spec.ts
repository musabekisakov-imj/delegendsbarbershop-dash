import { test, expect } from '@playwright/test';

/**
 * Happy-path booking spec. Requires:
 *  - The NestJS backend running on :3001 with the seed data loaded
 *    (1 tenant, 2 offices, 4 staff, 5 services, today's shifts present).
 *  - The customer-site dev server (auto-started by playwright.config webServer).
 *
 * Run with: npx playwright test
 * Or against a deployed env: E2E_BASE_URL=https://staging.delegendsbarbershop.lt npx playwright test
 */

test('user can book a haircut end-to-end', async ({ page }) => {
  await page.goto('/book');

  // Step 1 — pick the first service tile.
  const firstService = page.getByRole('button', { name: /Men.s haircut|Beard trim|Cut/i }).first();
  await expect(firstService).toBeVisible();
  await firstService.click();

  // Step 2 — pick the first barber.
  const firstBarber = page.locator('button.tile').filter({ hasText: /^[A-ZŠŽČĖĘĮŪ]/ }).first();
  await expect(firstBarber).toBeVisible({ timeout: 5000 });
  await firstBarber.click();

  // Step 3 — pick the first available slot.
  const firstSlot = page.locator('button.slot').first();
  await firstSlot.waitFor({ state: 'visible', timeout: 10_000 });
  await firstSlot.click();

  // Step 4 — fill contact form.
  await page.getByLabel('First name').fill('Test');
  await page.getByLabel('Last name').fill('Customer');
  await page.getByLabel('Email').fill(`e2e+${Date.now()}@example.com`);
  await page.getByLabel('Phone').fill('+370 600 12345');

  // Submit.
  await page.getByRole('button', { name: /Confirm booking/i }).click();

  // Lands on confirmation with the manage link.
  await expect(page).toHaveURL(/\/book\/confirmation/);
  await expect(page.getByText(/See you on/i)).toBeVisible({ timeout: 10_000 });
});
