import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import postgres from "postgres";

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is required");

  const isLocal = url.includes("localhost") || url.includes("127.0.0.1");
  const sql = postgres(url, {
    max: 1,
    idle_timeout: 5,
    connect_timeout: 10,
    ssl: isLocal ? false : "require",
  });

  const sqlFile = resolve(__dirname, "seed-pro-plan.sql");
  const sqlText = readFileSync(sqlFile, "utf8");

  await sql.unsafe(sqlText);
  await sql.end();
  console.log("[seed-pro-plan] plans seeded successfully");
}

main().catch((e) => {
  console.error("[seed-pro-plan] failed:", e);
  process.exit(1);
});
