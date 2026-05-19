import path from "node:path";

import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    globals: false,
    include: ["src/**/*.it.test.ts"],
    testTimeout: 30_000,
    hookTimeout: 30_000,
    // Integration tests share a single Postgres database; some suites use
    // overlapping email-prefix cleanups (e.g. the user IT wipes "it-test-%"
    // which cascades into sessions/oauth_accounts/magic_link_tokens). Serialize
    // file execution to keep cross-suite FK references stable.
    fileParallelism: false,
  },
  resolve: {
    alias: {
      "@/domain": path.resolve(__dirname, "src/domain"),
      "@/application": path.resolve(__dirname, "src/application"),
      "@/infrastructure": path.resolve(__dirname, "src/infrastructure"),
      "@/presentation": path.resolve(__dirname, "src/presentation"),
      "@/shared": path.resolve(__dirname, "src/shared"),
    },
  },
});
