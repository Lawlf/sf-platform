import type { DebtPaymentEntity } from "@/domain/entities/debt-payment.entity";

export interface DebtPaymentRepository {
  listForDebt(debtId: string): Promise<DebtPaymentEntity[]>;
  /**
   * Lista pagamentos de todas as dívidas do usuário no intervalo `[from, to]`
   * (inclusivos). Filtragem por `userId` é feita via JOIN com a tabela de
   * dívidas (debt_payments só tem `debtId`).
   */
  listForUserInRange(userId: string, range: { from: Date; to: Date }): Promise<DebtPaymentEntity[]>;
  create(entity: DebtPaymentEntity): Promise<DebtPaymentEntity>;
  /**
   * Remove um pagamento pelo id. Usado por `reactivateDebt` para desfazer o
   * pagamento sintético criado por `archiveDebt` (closing payment). Não usado
   * por fluxos de usuário comum: pagamentos regulares não são deletáveis pela
   * UI hoje.
   */
  delete(id: string): Promise<void>;
  /**
   * Remove TODOS os pagamentos vinculados à dívida. Hard delete. Usado pelo
   * use case `deleteDebt` para limpar sub-records antes do soft delete da
   * dívida. Pagamentos não têm valor isolado (são apenas histórico de
   * débitos da dívida), então hard delete é seguro.
   */
  deleteByDebtId(debtId: string): Promise<void>;
}
