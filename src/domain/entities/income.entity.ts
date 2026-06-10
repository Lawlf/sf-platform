import type { Money } from "@/domain/value-objects/money.vo";

export type IncomeFrequency = "monthly" | "weekly" | "one_off";

export interface IncomeEntity {
  id: string;
  userId: string;
  label: string;
  amount: Money;
  frequency: IncomeFrequency;
  startDate: Date;
  endDate: Date | null;
  isActive: boolean;
  /**
   * Dia do mês (1-31) em que a renda cai. `null` significa "usar o dia de
   * `startDate`". Alimenta o saldo reativo da Carteira.
   */
  paymentDay: number | null;
  /**
   * Renda cujo valor oscila mês a mês (comissão, freela, PJ). O valor segue
   * sendo um número só (a média informada pelo usuário); a flag só sinaliza
   * que é estimativa, não promessa, pra UI e prescrição não tratarem como
   * receita garantida.
   */
  isEstimated: boolean;
  /**
   * Momento em que a renda foi cadastrada no sistema. Distinto de `startDate`
   * (data em que a renda começa a valer pro usuário), permite que a linha do
   * tempo posicione o evento "Nova renda" no mês de criação real mesmo
   * quando o usuário cadastra retroativamente.
   */
  createdAt: Date;
  /**
   * Soft delete: quando preenchido, a renda é tratada como apagada (não
   * aparece em listas, dashboard, timeline). Diferente de `isActive`, que
   * representa arquivar/reativar (visível como histórico). Mantemos a linha
   * pra atender LGPD/auditoria.
   */
  deletedAt: Date | null;
}
