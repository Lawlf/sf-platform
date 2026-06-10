import type { DebtEntity, DebtStatus } from "@/domain/entities/debt.entity";

export interface DebtRepositoryPort {
  /**
   * Retorna a dívida pelo id ou `null`. Ignora linhas soft-deleted
   * (`deleted_at IS NOT NULL`) por padrão; a UI nunca deve enxergar uma
   * dívida apagada via esse método.
   */
  findById(id: string): Promise<DebtEntity | null>;
  /**
   * Lista dívidas do usuário. Sempre filtra `deleted_at IS NULL`. O
   * parâmetro `status` filtra adicionalmente pelo status legítimo
   * (active/paid_off/written_off) ou `"all"` para não filtrar status.
   */
  listForUser(userId: string, opts?: { status?: DebtStatus | "all" }): Promise<DebtEntity[]>;
  create(entity: DebtEntity): Promise<DebtEntity>;
  update(entity: DebtEntity): Promise<DebtEntity>;
  setStatus(id: string, status: DebtStatus): Promise<void>;
  /**
   * Marca a dívida como apagada (soft delete). Usado pelo use case
   * `deleteDebt`. Sub-records (pagamentos, alocações) são removidos pelo
   * próprio use case via repositórios dedicados antes do soft delete aqui.
   */
  softDelete(id: string, deletedAt: Date): Promise<void>;
}
