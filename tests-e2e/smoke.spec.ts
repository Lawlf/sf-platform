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
