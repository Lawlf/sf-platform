import { defineConfig } from "drizzle-kit";

// Migrations must run over a DIRECT (session-mode) connection. Supabase's pooled
// URL (pgbouncer transaction mode, port 6543) silently no-ops DDL + advisory locks,
// so drizzle-kit reports success without applying the migration. Prefer DIRECT_URL
// (port 5432); fall back to DATABASE_URL only when DIRECT_URL is absent.
const databaseUrl = process.env.DIRECT_URL ?? process.env.DATABASE_URL;
if (!databaseUrl) {
  throw new Error("DIRECT_URL or DATABASE_URL is required for drizzle-kit");
}

export default defineConfig({
  schema: "./src/infrastructure/persistence/drizzle/schema/index.ts",
  out: "./drizzle/migrations",
  dialect: "postgresql",
  dbCredentials: {
    url: databaseUrl,
  },
  verbose: true,
  strict: true,
  casing: "snake_case",
});
