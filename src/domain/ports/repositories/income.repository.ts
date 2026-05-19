import type { IncomeEntity } from "@/domain/entities/income.entity";

export interface IncomeRepository {
  findById(id: string): Promise<IncomeEntity | null>;
  listForUser(userId: string, opts?: { onlyActive?: boolean }): Promise<IncomeEntity[]>;
  create(entity: IncomeEntity): Promise<IncomeEntity>;
  update(entity: IncomeEntity): Promise<IncomeEntity>;
  setActive(id: string, isActive: boolean): Promise<void>;
}
