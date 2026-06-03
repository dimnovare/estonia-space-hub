import { test, expect } from '@playwright/test';

/**
 * 03 — Auth / Login page smoke tests
 *
 * Checks the login form UI, validation, and the register toggle.
 * Does NOT attempt real login — no test credentials exist.
 */

test.describe('Login page', () => {
  test.beforeEach(async ({ page }) => {
    await page.route('**/settings/public', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ maintenanceMode: false, inviteCodeRequired: false }),
      })
    );

    await page.route('**/auth/me', (route) =>
      route.fulfill({ status: 401, contentType: 'application/json', body: JSON.stringify({ message: 'Unauthorized' }) })
    );
  });

  test('login form is present with email and password inputs', async ({ page }) => {
    await page.goto('/et/login');
    await page.waitForLoadState('domcontentloaded');

    // Inputs are identified by their id attributes from LoginPage.tsx
    await expect(page.locator('#login-email')).toBeVisible();
    await expect(page.locator('#login-password')).toBeVisible();
  });

  test('login button is present', async ({ page }) => {
    await page.goto('/et/login');
    await page.waitForLoadState('domcontentloaded');

    // The submit button is a <Button type="submit"> inside the login form
    const submitBtn = page.locator('form button[type="submit"]').first();
    await expect(submitBtn).toBeVisible();
    await expect(submitBtn).toBeEnabled();
  });

  test('submitting with invalid email shows validation error', async ({ page }) => {
    await page.goto('/et/login');
    await page.waitForLoadState('domcontentloaded');

    await page.locator('#login-email').fill('not-an-email');
    await page.locator('#login-password').fill('short');

    // Click submit to trigger zod/react-hook-form validation
    await page.locator('form button[type="submit"]').first().click();

    // An error paragraph should appear (react-hook-form renders <p class="text-xs text-destructive">)
    const errorMsg = page.locator('p.text-destructive, [class*="destructive"]').first();
    await expect(errorMsg).toBeVisible({ timeout: 3000 });
    const errorText = await errorMsg.textContent();
    expect(errorText?.trim().length).toBeGreaterThan(0);
  });

  test('register / create account toggle is present', async ({ page }) => {
    await page.goto('/et/login');
    await page.waitForLoadState('domcontentloaded');

    // The switch-view button renders as a <button> inside a <p> at the bottom of the form
    // LoginPage.tsx: "t('login.noAccount')" + button with "t('login.register')"
    const registerToggle = page.locator('button').filter({ hasText: /registreeri|register|регистрация|reģistrēties|registruotis/i }).first();
    await expect(registerToggle).toBeVisible();
  });

  test('toggling to register shows the register form', async ({ page }) => {
    await page.goto('/et/login');
    await page.waitForLoadState('domcontentloaded');

    const registerToggle = page.locator('button').filter({ hasText: /registreeri|register|регистрация|reģistrēties|registruotis/i }).first();
    await registerToggle.click();

    // Register form should now show name and confirm-password fields
    await expect(page.locator('#reg-name')).toBeVisible();
    await expect(page.locator('#reg-email')).toBeVisible();
    await expect(page.locator('#reg-password')).toBeVisible();
  });

  test('forgot password link is visible', async ({ page }) => {
    await page.goto('/et/login');
    await page.waitForLoadState('domcontentloaded');

    const forgotLink = page.locator('button').filter({ hasText: /unustasid|forgot|забыли|aizmirsi|pamiršai/i }).first();
    await expect(forgotLink).toBeVisible();
  });
});
