import { sql } from "drizzle-orm";
import {
  bigint,
  boolean,
  index,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

import { assets } from "./assets.schema";
import { profiles } from "./profiles.schema";
import { users } from "./users.schema";

export const transactions = pgTable(
  "transactions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    profileId: uuid("profile_id").notNull().references(() => profiles.id, { onDelete: "cascade" }),
    direction: text("direction").notNull().default("out"),
    amountCents: bigint("amount_cents", { mode: "bigint" }).notNull(),
    currency: text("currency").notNull().default("BRL"),
    description: text("description").notNull(),
    category: text("category"),
    accountId: uuid("account_id").references(() => assets.id, { onDelete: "set null" }),
    // Patrimônio ao qual o lançamento é atribuído (custo/renda de ter o bem).
    // Só metadado de relatório: não mexe no valor do ativo nem em motor macro.
    // set null: apagar o bem desatrela os lançamentos, não os apaga.
    assetId: uuid("asset_id").references(() => assets.id, { onDelete: "set null" }),
    occurredAt: timestamp("occurred_at", { withTimezone: true }).notNull(),
    status: text("status").notNull().default("paid"),
    // "Não contar no mês": transferência entre contas / dinheiro mudando de lugar
    // / item que o usuário decide ignorar. Sai dos totais de fluxo (mês, timeline,
    // dossiê) mas continua na lista, marcado. Não mexe no saldo da conta.
    excludedFromTotals: boolean("excluded_from_totals").notNull().default(false),
    source: text("source").notNull().default("manual"),
    externalId: text("external_id"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().default(sql`now()`),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (t) => ({
    byUser: index("transactions_user_idx").on(t.userId),
    byUserOccurred: index("transactions_user_occurred_idx").on(t.userId, t.occurredAt),
    byAccount: index("transactions_account_idx").on(t.accountId),
    byAssetAttribution: index("transactions_profile_asset_idx").on(t.profileId, t.assetId),
    profileIdx: index("transactions_profile_id_idx").on(t.profileId),
    // Backstop de banco contra a corrida de double-commit do import OFX: o mesmo
    // fitId (external_id) nunca pode entrar duas vezes para o mesmo usuário.
    // Parcial porque lançamentos manuais têm external_id nulo (sem dedup).
    uniqExternal: uniqueIndex("transactions_profile_external_uniq")
      .on(t.profileId, t.externalId)
      .where(sql`${t.externalId} is not null`),
  }),
);

export type TransactionRow = typeof transactions.$inferSelect;
export type NewTransactionRow = typeof transactions.$inferInsert;
