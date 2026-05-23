import type { IncomeEntity } from "@/domain/entities/income.entity";

export interface IncomeRepository {
  /**
   * Retorna a renda pelo id ou `null`. Ignora linhas soft-deleted
   * (`deleted_at IS NOT NULL`) por padrão; a UI nunca deve enxergar uma
   * renda apagada via esse método.
   */
  findById(id: string): Promise<IncomeEntity | null>;
  /**
   * Lista rendas do usuário. Sempre filtra `deleted_at IS NULL`. O parâmetro
   * `onlyActive` filtra adicionalmente por `is_active = true` (sem incluir
   * arquivadas).
   */
  listForUser(userId: string, opts?: { onlyActive?: boolean }): Promise<IncomeEntity[]>;
  create(entity: IncomeEntity): Promise<IncomeEntity>;
  update(entity: IncomeEntity): Promise<IncomeEntity>;
  setActive(id: string, isActive: boolean): Promise<void>;
  /**
   * Marca a renda como apagada (soft delete). Usado pelo use case
   * `deleteIncome`. Diferente de `setActive(false)` (arquivar), o soft delete
   * remove a renda da visão do usuário definitivamente. Income não tem
   * sub-records (sem payments, sem allocations), então o use case só dispara
   * esse método.
   */
  softDelete(id: string, deletedAt: Date): Promise<void>;
}
