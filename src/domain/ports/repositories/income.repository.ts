import type { IncomeEntity } from "@/domain/entities/income.entity";

export interface IncomeRepositoryPort {
  /**
   * Retorna a renda pelo id ou `null`. Ignora linhas soft-deleted
   * (`deleted_at IS NOT NULL`) por padrão; a UI nunca deve enxergar uma
   * renda apagada via esse método.
   */
  findById(id: string): Promise<IncomeEntity | null>;
  /**
   * Lista rendas do perfil. Sempre filtra `deleted_at IS NULL`. O parâmetro
   * `onlyActive` filtra adicionalmente por `is_active = true` (sem incluir
   * arquivadas).
   */
  listForProfile(profileId: string, opts?: { onlyActive?: boolean }): Promise<IncomeEntity[]>;
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
  /**
   * Reverte um soft delete (`deleted_at = null`). Usado pelo undo de uma ação
   * MCP que apagou a renda. Como o soft delete não toca em sub-records (income
   * não tem), restaurar é um simples UPDATE.
   */
  restore(id: string): Promise<void>;
}
