import { eq, sql } from "drizzle-orm";

import type {
  UserCredentials,
  UserCredentialsRepository,
  WebauthnCredential,
} from "@/domain/ports/repositories/user-credentials.repository";

import { getDb } from "../client";
import { userCredentials } from "../schema/user-credentials.schema";
import { webauthnCredentials } from "../schema/webauthn-credentials.schema";

function toWeb(row: typeof webauthnCredentials.$inferSelect): WebauthnCredential {
  return {
    id: row.id,
    userId: row.userId,
    credentialId: row.credentialId,
    publicKey: row.publicKey,
    counter: row.counter,
    transports: row.transports,
  };
}

export class DrizzleUserCredentialsRepository implements UserCredentialsRepository {
  async find(userId: string): Promise<UserCredentials | null> {
    const rows = await getDb()
      .select()
      .from(userCredentials)
      .where(eq(userCredentials.userId, userId))
      .limit(1);
    const r = rows[0];
    return r ? { userId: r.userId, totpSecret: r.totpSecret, pinHash: r.pinHash, appLockEnabled: r.appLockEnabled, appLockTimeout: r.appLockTimeout } : null;
  }

  async setTotpSecret(userId: string, encryptedSecret: string): Promise<void> {
    await getDb()
      .insert(userCredentials)
      .values({ userId, totpSecret: encryptedSecret })
      .onConflictDoUpdate({
        target: userCredentials.userId,
        set: { totpSecret: encryptedSecret, updatedAt: sql`now()` },
      });
  }

  async setPin(userId: string, pinHash: string): Promise<void> {
    await getDb().insert(userCredentials).values({ userId, pinHash })
      .onConflictDoUpdate({ target: userCredentials.userId, set: { pinHash, updatedAt: sql`now()` } });
  }

  async clearPin(userId: string): Promise<void> {
    await getDb().update(userCredentials).set({ pinHash: null, updatedAt: sql`now()` }).where(eq(userCredentials.userId, userId));
  }

  async setAppLock(userId: string, enabled: boolean, timeoutSeconds: number): Promise<void> {
    await getDb().insert(userCredentials).values({ userId, appLockEnabled: enabled, appLockTimeout: timeoutSeconds })
      .onConflictDoUpdate({ target: userCredentials.userId, set: { appLockEnabled: enabled, appLockTimeout: timeoutSeconds, updatedAt: sql`now()` } });
  }

  async listWebauthn(userId: string): Promise<WebauthnCredential[]> {
    const rows = await getDb()
      .select()
      .from(webauthnCredentials)
      .where(eq(webauthnCredentials.userId, userId));
    return rows.map(toWeb);
  }

  async findWebauthnByCredentialId(credentialId: string): Promise<WebauthnCredential | null> {
    const rows = await getDb()
      .select()
      .from(webauthnCredentials)
      .where(eq(webauthnCredentials.credentialId, credentialId))
      .limit(1);
    return rows[0] ? toWeb(rows[0]) : null;
  }

  async addWebauthn(cred: Omit<WebauthnCredential, "id">): Promise<void> {
    await getDb().insert(webauthnCredentials).values({
      userId: cred.userId,
      credentialId: cred.credentialId,
      publicKey: cred.publicKey,
      counter: cred.counter,
      transports: cred.transports,
    });
  }

  async updateWebauthnCounter(credentialId: string, counter: bigint): Promise<void> {
    await getDb()
      .update(webauthnCredentials)
      .set({ counter })
      .where(eq(webauthnCredentials.credentialId, credentialId));
  }

  async hasAnyFactor(userId: string): Promise<boolean> {
    const cred = await this.find(userId);
    if (cred?.totpSecret) return true;
    const web = await this.listWebauthn(userId);
    return web.length > 0;
  }
}
