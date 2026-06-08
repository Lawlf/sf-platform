export interface RevolvingCreditInput {
  /** Fatura atual (saldo que entra no rotativo), em centavos. */
  statementCents: bigint;
  /** Quanto a pessoa paga por mês, em centavos. */
  monthlyPaymentCents: bigint;
  /** Juro do rotativo ao mês, em decimal (0.15 = 15% a.m.). */
  monthlyRate: number;
  maxMonths?: number;
}

export interface RevolvingCreditResult {
  /** A fatura quita dentro do horizonte? Falso quando o pagamento não cobre o juro. */
  paysOff: boolean;
  /** Meses até quitar (null quando não quita). */
  payoffMonth: number | null;
  /** Juro pago a mais além da fatura, em centavos. */
  totalInterestCents: bigint;
  /** Desembolso total (fatura + juro), em centavos. */
  totalPaidCents: bigint;
  /** Juro do primeiro mês, em centavos. Usado no estado "a fatura não diminui". */
  firstMonthInterestCents: bigint;
}

const DEFAULT_MAX_MONTHS = 600;

export class RevolvingCreditSimulatorService {
  static simulate(input: RevolvingCreditInput): RevolvingCreditResult {
    const maxMonths = input.maxMonths ?? DEFAULT_MAX_MONTHS;
    const rate = input.monthlyRate > 0 ? input.monthlyRate : 0;
    const payment = input.monthlyPaymentCents > 0n ? input.monthlyPaymentCents : 0n;
    let balance = input.statementCents > 0n ? input.statementCents : 0n;

    const firstMonthInterestCents = BigInt(Math.round(Number(balance) * rate));

    if (balance === 0n) {
      return {
        paysOff: true,
        payoffMonth: 0,
        totalInterestCents: 0n,
        totalPaidCents: 0n,
        firstMonthInterestCents: 0n,
      };
    }

    let totalInterest = 0n;
    let totalPaid = 0n;
    let month = 0;

    while (balance > 0n && month < maxMonths) {
      month += 1;
      const interest = BigInt(Math.round(Number(balance) * rate));
      const balanceWithInterest = balance + interest;
      const pay = payment >= balanceWithInterest ? balanceWithInterest : payment;

      // Pagamento não cobre nem o juro: a fatura não diminui, nunca quita.
      if (pay <= interest) {
        return {
          paysOff: false,
          payoffMonth: null,
          totalInterestCents: totalInterest,
          totalPaidCents: totalPaid,
          firstMonthInterestCents,
        };
      }

      totalInterest += interest;
      totalPaid += pay;
      balance = balanceWithInterest - pay;
    }

    const paysOff = balance <= 0n;
    return {
      paysOff,
      payoffMonth: paysOff ? month : null,
      totalInterestCents: totalInterest,
      totalPaidCents: totalPaid,
      firstMonthInterestCents,
    };
  }
}
