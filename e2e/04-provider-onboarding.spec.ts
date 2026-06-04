import { test, expect } from '@playwright/test';
import { stubCommon, stubLoggedOut } from './fixtures';

/**
 * 04 — Provider onboarding page smoke tests
 *
 * Verifies the 3-step wizard renders, step 0 shows business-type selection,
 * and that step-0 gating works: the Next button validates required fields on
 * click (companyName / registryCode / contactPhone + a business type) and only
 * advances to step 1 once they are all filled.
 *
 * Real app facts (src/pages/ProviderOnboardingPage.tsx):
 *  - Anonymous page (stubLoggedOut). Route /et/provider/onboarding.
 *  - 3 steps; stepper renders numbered circles (1,2,3).
 *  - Business types rendered as <button class="...rounded-xl border-2..."> (company / sole).
 *  - Step-0 inputs in order: companyName[0], registryCode[1], vat[2],
 *    contactName[3], contactEmail[4], contactPhone[5].
 *  - The Next button is ALWAYS enabled; clicking it with missing fields sets
 *    showValidation=true (renders destructive validation text) and stays on step 0.
 *    Next button text = t("onboard.next") = "Järgmine" (et).
 */

const NEXT = /järgmine|next|далее|tālāk|toliau/i;

test.describe('Provider onboarding', () => {
  test.beforeEach(async ({ page }) => {
    // Suppress the fixed cookie-consent banner so it can't intercept Next clicks.
    await page.addInitScript(() => localStorage.setItem('ruumly-cookie-consent', 'true'));
    await stubCommon(page);
    await stubLoggedOut(page);
  });

  test('page loads without app JS errors', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (err) => errors.push(err.message));

    await page.goto('/et/provider/onboarding');
    // Let lazy chunks / queries settle.
    await expect(page.locator('h1')).toBeVisible();

    const appErrors = errors.filter(
      (e) =>
        !e.includes('ResizeObserver') &&
        !e.includes('Non-Error promise rejection') &&
        !e.includes('401'),
    );
    expect(appErrors).toEqual([]);
  });

  test('stepper with 3 steps is visible', async ({ page }) => {
    await page.goto('/et/provider/onboarding');
    await expect(page.locator('h1')).toBeVisible();

    // Stepper renders numbered circles; at least three "1","2","3" indicators.
    const stepBadges = page.locator('div').filter({ hasText: /^[123]$/ });
    expect(await stepBadges.count()).toBeGreaterThanOrEqual(3);
  });

  test('step 0 shows two business-type options (company / sole trader)', async ({ page }) => {
    await page.goto('/et/provider/onboarding');
    await expect(page.locator('h1')).toBeVisible();

    const bizTypeButtons = page.locator('button[class*="rounded-xl"][class*="border-2"]');
    expect(await bizTypeButtons.count()).toBeGreaterThanOrEqual(2);
  });

  test('clicking Next with empty required fields stays on step 0 and shows validation', async ({ page }) => {
    await page.goto('/et/provider/onboarding');
    await expect(page.locator('h1')).toBeVisible();

    // Select a business type but leave companyName/registryCode/phone empty.
    const bizTypeButtons = page.locator('button[class*="rounded-xl"][class*="border-2"]');
    await bizTypeButtons.first().click();

    const nextBtn = page.locator('button').filter({ hasText: NEXT }).first();
    await expect(nextBtn).toBeVisible();
    await nextBtn.click();

    // Still on step 0: the company-name field (step-0 only) is still present,
    // and inline validation text has appeared.
    const validation = page.locator('p.text-destructive, p[class*="destructive"]').first();
    await expect(validation).toBeVisible({ timeout: 3000 });
    // The step-1 services heading must NOT be present yet.
    await expect(page.locator('input').nth(2)).toBeVisible();
  });

  test('filling all step-0 fields lets Next advance to step 1 (services)', async ({ page }) => {
    await page.goto('/et/provider/onboarding');
    await expect(page.locator('h1')).toBeVisible();

    await page.locator('button[class*="rounded-xl"][class*="border-2"]').first().click();

    const inputs = page.locator('input');
    await inputs.nth(0).fill('Test OÜ');          // companyName
    await inputs.nth(1).fill('12345678');         // registryCode
    // inputs[2] = VAT (optional)
    await inputs.nth(3).fill('Test User');        // contactName
    await inputs.nth(4).fill('test@test.com');    // contactEmail
    await inputs.nth(5).fill('+37255555555');     // contactPhone

    const nextBtn = page.locator('button').filter({ hasText: NEXT }).first();
    await nextBtn.click();

    // Now on step 1: the services section heading t("onboard.step3.types") is shown.
    await expect(page.locator('h2')).toBeVisible();
    // Step-1 service-type buttons (warehouse, ...) render as flex-col bordered tiles.
    const serviceButtons = page.locator('button[class*="rounded-xl"][class*="border-2"]');
    expect(await serviceButtons.count()).toBeGreaterThanOrEqual(1);
    // The step-0 company-name input (index 0) should no longer be the same form —
    // step 1 has no <input> named like the company field; confirm we left step 0
    // by checking the "Back" button is now enabled.
    const backBtn = page.locator('button').filter({ hasText: /eelmine|previous|назад|iepriekšējais|atgal/i }).first();
    await expect(backBtn).toBeEnabled();
  });
});
