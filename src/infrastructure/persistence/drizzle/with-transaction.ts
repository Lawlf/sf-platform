import { getDb } from "./client";

export async function withTransaction<T>(fn: () => Promise<T>): Promise<T> {
  return getDb().transaction(async () => {
    return fn();
  });
}
