import type { DebtPaymentEntity } from "@/domain/entities/debt-payment.entity";

export interface DebtPaymentRepository {
  listForDebt(debtId: string): Promise<DebtPaymentEntity[]>;
  create(entity: DebtPaymentEntity): Promise<DebtPaymentEntity>;
}
