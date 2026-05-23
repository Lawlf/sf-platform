import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import { loadEnv } from "@/infrastructure/config/env";

let dbInstance: ReturnType<typeof drizzle> | null = null;
let queryClient: ReturnType<typeof postgres> | null = null;

export function getDb() {
  if (dbInstance) return dbInstance;
  const env = loadEnv();
  const isLocal =
    env.DATABASE_URL.includes("localhost") || env.DATABASE_URL.includes("127.0.0.1");
  /**
   * `prepare: false` is required for Supabase/pgbouncer Transaction-mode pooler.
   * Trades prepared-statement caching for compatibility across both Transaction
   * and Session pooler modes.
   */
  queryClient = postgres(env.DATABASE_URL, {
    max: 25,
    idle_timeout: 20,
    connect_timeout: 10,
    max_lifetime: 60 * 30,
    ssl: isLocal ? false : "require",
    prepare: false,
    /**
     * Sent as a startup parameter so the schema resolves regardless of pooler
     * mode. Some Supabase Transaction-pooler tenants (e.g. sa-east-1) reset
     * `search_path` to empty per checkout, which breaks unqualified table names.
     */
    connection: { search_path: "public" },
  });
  dbInstance = drizzle(queryClient, {
    casing: "snake_case",
  });
  return dbInstance;
}

export async function closeDb() {
  if (queryClient) {
    await queryClient.end();
    queryClient = null;
    dbInstance = null;
  }
}
