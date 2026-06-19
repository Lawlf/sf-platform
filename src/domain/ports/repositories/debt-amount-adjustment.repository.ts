import type { DebtAmountAdjustmentEntity } from "@/domain/entities/debt-amount-adjustment.entity";

export interface DebtAmountAdjustmentRepositoryPort {
  // Lista todos os ajustes (períodos + overrides) de uma dívida, ordenados por
  // startMonth/month asc.
  listForDebt(debtId: string, profileId: string): Promise<DebtAmountAdjustmentEntity[]>;

  // Lista todos os ajustes do perfil em qualquer dívida. Usado pelo timeline
  // service que projeta múltiplas dívidas mês a mês.
  listForProfile(profileId: string): Promise<DebtAmountAdjustmentEntity[]>;

  // Cria um novo ajuste (período ou override). Para override em mês que já tem
  // ajuste, sobrescreve (upsert pelo par debtId + kind + month).
  upsert(entity: DebtAmountAdjustmentEntity): Promise<DebtAmountAdjustmentEntity>;

  // Remove ajuste pelo id. profileId é validado dentro do repository pra evitar
  // delete cross-tenant.
  delete(id: string, profileId: string): Promise<void>;

  // Hard delete em massa, usado quando uma dívida é apagada de vez.
  deleteByDebtId(debtId: string): Promise<void>;
}
