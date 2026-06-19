import type { InvestmentSnapshotEntity } from "@/domain/entities/investment-snapshot.entity";

export interface InvestmentSnapshotRow {
  investmentType: string;
  totalValueCents: bigint;
}

export interface InvestmentSnapshotRepositoryPort {
  /**
   * Substitui as linhas do mês para o perfil pelo conjunto informado
   * (remove tipos que sumiram, insere/atualiza os presentes). Idempotente.
   */
  replaceMonth(
    userId: string,
    profileId: string,
    month: Date,
    rows: InvestmentSnapshotRow[],
    capturedAt: Date,
  ): Promise<void>;
  /** Todas as linhas do perfil, ordenadas por mês ascendente. */
  listForProfile(profileId: string): Promise<InvestmentSnapshotEntity[]>;
}
