import type { InvestmentSnapshotEntity } from "@/domain/entities/investment-snapshot.entity";

export interface InvestmentSnapshotRow {
  investmentType: string;
  totalValueCents: bigint;
}

export interface InvestmentSnapshotRepositoryPort {
  /**
   * Substitui as linhas do mês para o usuário pelo conjunto informado
   * (remove tipos que sumiram, insere/atualiza os presentes). Idempotente.
   */
  replaceMonth(
    userId: string,
    month: Date,
    rows: InvestmentSnapshotRow[],
    capturedAt: Date,
  ): Promise<void>;
  /** Todas as linhas do usuário, ordenadas por mês ascendente. */
  listForUser(userId: string): Promise<InvestmentSnapshotEntity[]>;
}
