export interface RateEstimate {
  valuePct: number;
  unit: "monthly" | "annual";
  label: string;
  note: string;
}

export const DEBT_RATE_ESTIMATES = {
  creditCardRevolving: {
    valuePct: 15,
    unit: "monthly",
    label: "estimativa ~15% por mês",
    note: "Média de mercado. O rotativo costuma ser dos juros mais caros; confirme o valor exato na sua fatura.",
  },
  overdraft: {
    valuePct: 8,
    unit: "monthly",
    label: "teto legal: 8% por mês",
    note: "É o teto que o banco pode cobrar no cheque especial. O seu pode ser menor; ajuste se souber.",
  },
} as const satisfies Record<string, RateEstimate>;
