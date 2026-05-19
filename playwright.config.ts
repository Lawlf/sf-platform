import { defineConfig, devices } from "@playwright/test";

const baseConfig = {
  testDir: "./tests-e2e",
  timeout: 30_000,
  expect: { timeout: 5_000 },
  fullyParallel: true,
  reporter: process.env.CI ? "list" : "html",
  use: {
    baseURL: process.env.E2E_BASE_URL ?? "http://localhost:3000",
    trace: "on-first-retry" as const,
    screenshot: "only-on-failure" as const,
  },
  projects: [
    {
      name: "chromium-mobile",
      use: { ...devices["Pixel 7"] },
    },
    {
      name: "chromium-desktop",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
};

export default defineConfig(
  process.env.E2E_BASE_URL
    ? baseConfig
    : {
        ...baseConfig,
        webServer: {
          command: "pnpm dev",
          url: "http://localhost:3000",
          timeout: 60_000,
          reuseExistingServer: !process.env.CI,
        },
      },
);
