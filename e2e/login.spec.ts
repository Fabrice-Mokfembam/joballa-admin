import { test, expect } from "@playwright/test";

test.describe("Admin login page", () => {
  test("renders login form", async ({ page }) => {
    await page.goto("/admin/login");
    await expect(page.getByTestId("admin-login-identifier")).toBeVisible();
    await expect(page.getByTestId("admin-login-password")).toBeVisible();
    await expect(page.getByTestId("admin-login-submit")).toBeVisible();
  });

  test("shows error on invalid credentials", async ({ page }) => {
    await page.goto("/admin/login");
    await page.getByTestId("admin-login-identifier").fill("invalid@example.test");
    await page.getByTestId("admin-login-password").fill("not-a-real-password");
    await page.getByTestId("admin-login-submit").click();
    await expect(page).toHaveURL(/\/admin\/login/);
  });
});

test.describe("Admin route guard", () => {
  test("unauthenticated user is redirected to login", async ({ page }) => {
    await page.goto("/admin/kyc");
    await expect(page).toHaveURL(/\/admin\/login/);
  });
});

test.describe("Admin sign-in (live API)", () => {
  const identifier =
    process.env.PLAYWRIGHT_ADMIN_EMAIL ?? process.env.PLAYWRIGHT_ADMIN_IDENTIFIER;
  const password = process.env.PLAYWRIGHT_ADMIN_PASSWORD;

  test.skip(!identifier || !password, "Set PLAYWRIGHT_ADMIN_EMAIL and PLAYWRIGHT_ADMIN_PASSWORD");

  test("admin can sign in and reach dashboard", async ({ page }) => {
    await page.goto("/admin/login");
    await page.getByTestId("admin-login-identifier").fill(identifier!);
    await page.getByTestId("admin-login-password").fill(password!);
    await page.getByTestId("admin-login-submit").click();
    await expect(page).toHaveURL(/\/admin$/, { timeout: 30_000 });
  });
});
