import type { TransactionEntity } from "@/domain/entities/transaction.entity";

export interface TransactionRepositoryPort {
  create(transaction: Omit<TransactionEntity, "createdAt">): Promise<TransactionEntity>;
  update(transaction: TransactionEntity): Promise<TransactionEntity>;
  findByIdForProfile(id: string, profileId: string): Promise<TransactionEntity | null>;
  listByAccount(accountId: string, profileId: string): Promise<TransactionEntity[]>;
  listByAccountPaged(
    accountId: string,
    profileId: string,
    opts: { limit: number; beforeOccurredAt?: Date; beforeId?: string },
  ): Promise<TransactionEntity[]>;
  countByAccount(accountId: string, profileId: string): Promise<number>;
  monthSummariesByAccount(
    accountId: string,
    profileId: string,
  ): Promise<Array<{ key: string; inCents: bigint; outCents: bigint; currency: string }>>;
  listForProfileInRange(profileId: string, from: Date, to: Date): Promise<TransactionEntity[]>;
  /** Lançamentos atribuídos a um patrimônio (não apagados), para o custo de propriedade. */
  listByAttributedAsset(assetId: string, profileId: string): Promise<TransactionEntity[]>;
  /** Agendados com data já vencida (occurredAt <= asOf), de todos os perfis. Para o cron de postagem. */
  listDueScheduled(asOf: Date): Promise<TransactionEntity[]>;
  softDelete(id: string, deletedAt: Date): Promise<void>;
  /** Define a categoria de vários lançamentos de uma vez (scoped por perfil). Categoria não mexe saldo. */
  setCategoryForIds(profileId: string, ids: string[], category: string | null): Promise<void>;
  /** Marca/desmarca "não contar no mês" em vários lançamentos (scoped por perfil). Não mexe saldo. */
  setExcludedForIds(profileId: string, ids: string[], excluded: boolean): Promise<void>;
  existingExternalIds(profileId: string, externalIds: string[]): Promise<string[]>;
  countByCategory(profileId: string, categoryKey: string): Promise<number>;
  reassignCategory(profileId: string, fromKey: string, toKey: string): Promise<void>;
}
