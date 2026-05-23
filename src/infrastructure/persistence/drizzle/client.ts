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
  queryClient = postgres(env.DATABASE_URL, {
    max: 10,
    idle_timeout: 30,
    connect_timeout: 10,
    ssl: isLocal ? false : "require",
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
