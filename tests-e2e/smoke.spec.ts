import { expect, test } from "@playwright/test";

test("public placeholder renders the brand name", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: /sabor financeiro/i })).toBeVisible();
});

test("health endpoint responds 200", async ({ request }) => {
  const response = await request.get("/api/health");
  expect(response.status()).toBe(200);
  const body = await response.json();
  expect(body.status).toBe("ok");
});

test("unauthenticated user is redirected from /app to /entrar", async ({ page }) => {
  await page.goto("/app");
  await expect(page).toHaveURL(/\/entrar/);
  await expect(page.getByRole("heading", { name: /entrar/i })).toBeVisible();
});

test("/entrar page renders the email form", async ({ page }) => {
  await page.goto("/entrar");
  await expect(page.getByRole("heading", { name: /entrar/i })).toBeVisible();
  await expect(page.getByPlaceholder(/voce@exemplo\.com/i)).toBeVisible();
  await expect(page.getByRole("button", { name: /receber c[oó]digo/i })).toBeVisible();
});
