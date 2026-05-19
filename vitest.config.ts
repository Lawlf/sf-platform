import path from "node:path";

import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    globals: false,
    include: ["src/**/*.test.ts", "src/**/*.test.tsx", "app/**/*.test.ts", "app/**/*.test.tsx"],
    coverage: {
      provider: "v8",
      reporter: ["text", "lcov"],
      include: ["src/**/*.ts", "src/**/*.tsx"],
      exclude: ["src/**/*.test.ts", "src/**/*.test.tsx", "src/**/index.ts", "src/**/.gitkeep"],
    },
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
