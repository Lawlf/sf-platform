import type { DebtEntity, DebtStatus } from "@/domain/entities/debt.entity";

export interface DebtRepository {
  findById(id: string): Promise<DebtEntity | null>;
  listForUser(userId: string, opts?: { status?: DebtStatus | "all" }): Promise<DebtEntity[]>;
  create(entity: DebtEntity): Promise<DebtEntity>;
  update(entity: DebtEntity): Promise<DebtEntity>;
  setStatus(id: string, status: DebtStatus): Promise<void>;
}
