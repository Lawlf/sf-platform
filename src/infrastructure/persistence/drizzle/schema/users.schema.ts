import { sql } from "drizzle-orm";
import { boolean, index, jsonb, pgEnum, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

export const userRole = pgEnum("user_role", ["user", "admin"]);
export const userPlan = pgEnum("user_plan", ["free", "pro"]);
export const contentDiagnosticAnswer = pgEnum("content_diagnostic_answer", [
  "pagar-divida",
  "guardar",
  "investir",
  "fechar-mes",
]);

export const users = pgTable(
  "users",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    email: text("email").notNull().unique(),
    emailVerifiedAt: timestamp("email_verified_at", { withTimezone: true }),
    displayName: text("display_name"),
    role: userRole("role").notNull().default("user"),
    plan: userPlan("plan").notNull().default("free"),
    isPro: boolean("is_pro").notNull().default(false),
    // Lock-on-downgrade de perfis: durante a graça (7 dias pós-downgrade) todos os
    // perfis ficam acessíveis; depois, só o freeKeptProfileId (ou o primary) no Free.
    proGraceUntil: timestamp("pro_grace_until", { withTimezone: true }),
    freeKeptProfileId: uuid("free_kept_profile_id"),
    baseCurrency: text("base_currency").notNull().default("BRL"),
    deactivatedAt: timestamp("deactivated_at", { withTimezone: true }),
    deactivationReason: text("deactivation_reason"),
    contentDiagnosticAnswer: contentDiagnosticAnswer("content_diagnostic_answer"),
    contentDiagnosticAnsweredAt: timestamp("content_diagnostic_answered_at", {
      withTimezone: true,
    }),
    onboardingWizardSeenAt: timestamp("onboarding_wizard_seen_at", { withTimezone: true }),
    homeTourDismissedAt: timestamp("home_tour_dismissed_at", { withTimezone: true }),
    acquisitionChannel: text("acquisition_channel"),
    acquisitionChannelOther: text("acquisition_channel_other"),
    quickAccess: jsonb("quick_access")
      .notNull()
      .default(sql`'[]'::jsonb`),
    username: text("username").unique(),
    profileFlair: text("profile_flair"),
    lastActiveAt: timestamp("last_active_at", { withTimezone: true })
      .notNull()
      .default(sql`now()`),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .default(sql`now()`),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .default(sql`now()`),
  },
  (table) => ({
    emailIdx: index("users_email_lower_idx").on(sql`lower(${table.email})`),
  }),
);

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
