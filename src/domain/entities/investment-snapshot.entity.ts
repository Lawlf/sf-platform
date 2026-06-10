export interface InvestmentSnapshotEntity {
  userId: string;
  /** Primeiro dia do mês (âncora mensal). */
  month: Date;
  /** investmentType do metadata (crypto/stocks/fund/fixed_income/other). */
  investmentType: string;
  totalValueCents: bigint;
  capturedAt: Date;
}
