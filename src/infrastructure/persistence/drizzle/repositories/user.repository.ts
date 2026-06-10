import { and, eq, isNull, sql } from "drizzle-orm";

import type { UserEntity } from "@/domain/entities/user.entity";
import type { UserRepositoryPort } from "@/domain/ports/repositories/user.repository";
import type { Currency } from "@/domain/value-objects/money.vo";

import { getDb } from "../client";
import { users } from "../schema/users.schema";

function toEntity(row: typeof users.$inferSelect): UserEntity {
  return {
    id: row.id,
    email: row.email,
    emailVerifiedAt: row.emailVerifiedAt,
    displayName: row.displayName,
    role: row.role,
    plan: row.plan,
    isPro: row.isPro,
    deactivatedAt: row.deactivatedAt,
    deactivationReason: row.deactivationReason,
    contentDiagnosticAnswer: row.contentDiagnosticAnswer,
    contentDiagnosticAnsweredAt: row.contentDiagnosticAnsweredAt,
    onboardingWizardSeenAt: row.onboardingWizardSeenAt,
    homeTourDismissedAt: row.homeTourDismissedAt,
    quickAccess: (row.quickAccess as string[] | null) ?? [],
    username: row.username,
    profileFlair: row.profileFlair,
    baseCurrency: (row.baseCurrency as Currency | null) ?? "BRL",
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export class UserRepository implements UserRepositoryPort {
  async findById(id: string): Promise<UserEntity | null> {
    const rows = await getDb().select().from(users).where(eq(users.id, id)).limit(1);
    return rows[0] ? toEntity(rows[0]) : null;
  }

  async findByUsername(username: string): Promise<UserEntity | null> {
    const rows = await getDb().select().from(users).where(eq(users.username, username)).limit(1);
    return rows[0] ? toEntity(rows[0]) : null;
  }

  async findByEmail(email: string): Promise<UserEntity | null> {
    const normalized = email.toLowerCase();
    const rows = await getDb()
      .select()
      .from(users)
      .where(sql`lower(${users.email}) = ${normalized}`)
      .limit(1);
    return rows[0] ? toEntity(rows[0]) : null;
  }

  async create(input: {
    email: string;
    emailVerified: boolean;
    displayName?: string | null;
  }): Promise<UserEntity> {
    const rows = await getDb()
      .insert(users)
      .values({
        email: input.email.toLowerCase(),
        emailVerifiedAt: input.emailVerified ? new Date() : null,
        displayName: input.displayName ?? null,
      })
      .returning();
    const row = rows[0];
    if (!row) throw new Error("Failed to insert user: no row returned");
    return toEntity(row);
  }

  async markEmailVerified(id: string): Promise<void> {
    await getDb().update(users).set({ emailVerifiedAt: new Date() }).where(eq(users.id, id));
  }

  async markOnboardingWizardSeen(id: string): Promise<void> {
    await getDb()
      .update(users)
      .set({ onboardingWizardSeenAt: new Date(), updatedAt: new Date() })
      .where(eq(users.id, id));
  }

  async markHomeTourDismissed(id: string): Promise<void> {
    await getDb()
      .update(users)
      .set({ homeTourDismissedAt: new Date(), updatedAt: new Date() })
      .where(eq(users.id, id));
  }

  async deactivate(id: string, reason: string | null): Promise<void> {
    await getDb()
      .update(users)
      .set({ deactivatedAt: new Date(), deactivationReason: reason })
      .where(eq(users.id, id));
  }

  async update(user: UserEntity): Promise<void> {
    await getDb()
      .update(users)
      .set({
        email: user.email.toLowerCase(),
        emailVerifiedAt: user.emailVerifiedAt,
        displayName: user.displayName,
        role: user.role,
        plan: user.plan,
        isPro: user.isPro,
        deactivatedAt: user.deactivatedAt,
        deactivationReason: user.deactivationReason,
        contentDiagnosticAnswer: user.contentDiagnosticAnswer,
        contentDiagnosticAnsweredAt: user.contentDiagnosticAnsweredAt,
        onboardingWizardSeenAt: user.onboardingWizardSeenAt,
        homeTourDismissedAt: user.homeTourDismissedAt,
        quickAccess: user.quickAccess,
        username: user.username,
        profileFlair: user.profileFlair,
        baseCurrency: user.baseCurrency,
        updatedAt: user.updatedAt,
      })
      .where(eq(users.id, user.id));
  }

  async findAllPro(): Promise<UserEntity[]> {
    const rows = await getDb()
      .select()
      .from(users)
      .where(and(eq(users.isPro, true), isNull(users.deactivatedAt)));
    return rows.map(toEntity);
  }

  async findAllActive(): Promise<UserEntity[]> {
    const rows = await getDb().select().from(users).where(isNull(users.deactivatedAt));
    return rows.map(toEntity);
  }
}
