import { test, expect } from '@playwright/test';
import { stubCommon, stubLoggedOut, stubLogin, customerUser } from './fixtures';

/**
 * 03 — Auth / Login page smoke tests
 *
 * Checks the login form UI, validation, the register toggle, and a successful
 * login POST. Uses shared fixtures so stub shapes match the real API contract.
 *
 * Real app facts (src/pages/LoginPage.tsx):
 *  - Logged-out page (no ruumly-auth seeded → /auth/refresh never fires).
 *  - Email input #login-email, password #login-password.
 *  - Submit button text = t("login.title") ("Logi sisse" in et).
 *  - The switch-view button at the bottom shows t("login.register") ("Loo konto").
 *  - Register view reveals #reg-name #reg-email #reg-password #reg-confirm.
 *  - Forgot-password button shows t("login.forgotPassword") ("Unustasid parooli?").
 *  - Successful login navigates to /account.
 */

test.describe('Login page', () => {
  test.beforeEach(async ({ page }) => {
    // Suppress the fixed cookie-consent banner so it can't intercept clicks.
    await page.addInitScript(() => localStorage.setItem('ruumly-cookie-consent', 'true'));
    await stubCommon(page);
    await stubLoggedOut(page);
  });

  test('login form is present with email and password inputs', async ({ page }) => {
    await page.goto('/et/login');
    await expect(page.locator('#login-email')).toBeVisible();
    await expect(page.locator('#login-password')).toBeVisible();
  });

  test('login button is present and enabled', async ({ page }) => {
    await page.goto('/et/login');
    const submitBtn = page.locator('form button[type="submit"]').first();
    await expect(submitBtn).toBeVisible();
    await expect(submitBtn).toBeEnabled();
  });

  test('heading shows the login title', async ({ page }) => {
    await page.goto('/et/login');
    const heading = page.locator('h1').first();
    await expect(heading).toBeVisible();
    await expect(heading).toHaveText(/logi sisse/i);
  });

  test('submitting a too-short password shows a zod validation error', async ({ page }) => {
    await page.goto('/et/login');

    // A valid email passes the native type="email" check so the form actually
    // submits and react-hook-form/zod runs; the 3-char password trips min(8).
    await page.locator('#login-email').fill('valid@example.com');
    await page.locator('#login-password').fill('abc');
    await page.locator('form button[type="submit"]').first().click();

    // react-hook-form + zod renders <p class="text-xs text-destructive"> under the field.
    const errorMsg = page.locator('p.text-destructive, p[class*="destructive"]').first();
    await expect(errorMsg).toBeVisible({ timeout: 3000 });
    const errorText = await errorMsg.textContent();
    expect(errorText?.trim().length ?? 0).toBeGreaterThan(0);
  });

  test('register / create account toggle is present', async ({ page }) => {
    await page.goto('/et/login');

    // Bottom switch-view button: t("login.register") — "Loo konto" in et.
    const registerToggle = page
      .locator('button')
      .filter({ hasText: /loo konto|create account|создать аккаунт|izveidot kontu|sukurti paskyrą/i })
      .first();
    await expect(registerToggle).toBeVisible();
  });

  test('toggling to register reveals the register form fields', async ({ page }) => {
    await page.goto('/et/login');

    const registerToggle = page
      .locator('button')
      .filter({ hasText: /loo konto|create account|создать аккаунт|izveidot kontu|sukurti paskyrą/i })
      .first();
    await registerToggle.click();

    await expect(page.locator('#reg-name')).toBeVisible();
    await expect(page.locator('#reg-email')).toBeVisible();
    await expect(page.locator('#reg-password')).toBeVisible();
    await expect(page.locator('#reg-confirm')).toBeVisible();
  });

  test('forgot password link is visible', async ({ page }) => {
    await page.goto('/et/login');

    const forgotLink = page
      .locator('button')
      .filter({ hasText: /unustasid|forgot|забыли|aizmirsi|pamiršote/i })
      .first();
    await expect(forgotLink).toBeVisible();
  });

  test('a valid login POSTs to /auth/login and navigates away from /login', async ({ page }) => {
    await stubLogin(page, customerUser);

    await page.goto('/et/login');

    const loginReq = page.waitForRequest(
      (req) => req.url().includes('/auth/login') && req.method() === 'POST',
    );

    await page.locator('#login-email').fill(customerUser.email);
    await page.locator('#login-password').fill('correct-horse-battery');
    await page.locator('form button[type="submit"]').first().click();

    await loginReq;
    // After a successful login the app navigates to /account (away from /login).
    await expect.poll(() => page.url(), { timeout: 5000 }).not.toContain('/login');
  });
});
