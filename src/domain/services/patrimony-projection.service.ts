export interface ProjectionAssetInput {
  assetId: string;
  valueCents: bigint;
  /** monthly decimal. positive = yield/appreciation, negative = depreciation, 0 = stable. */
  monthlyGrowthRate: number;
}

export interface ProjectionDebtInput {
  debtId: string;
  balanceCents: bigint;
  /** monthly interest rate, decimal. >= 0. */
  monthlyRate: number;
  monthlyPaymentCents: bigint;
}

export interface ProjectionInput {
  assets: ProjectionAssetInput[];
  debts: ProjectionDebtInput[];
  /** saldo livre per month, lands in the liquid bucket. >= 0. */
  monthlyFreeCashFlowCents: bigint;
  /** monthly yield of the bucket where new saldo livre accumulates. >= 0. */
  liquidBucketMonthlyRate: number;
  horizonMonths: number;
}

export interface ProjectionPoint {
  /** 1-based month offset from the start (month 1 = end of first projected month). */
  month: number;
  assetsCents: bigint;
  debtsCents: bigint;
  netWorthCents: bigint;
}

export interface ProjectionResult {
  points: ProjectionPoint[];
}

interface AssetState {
  value: number; // reais
  rate: number;
}

interface DebtState {
  balance: number; // reais
  rate: number;
  payment: number;
}

function toReais(cents: bigint): number {
  return Number(cents) / 100;
}

function toCents(reaisValue: number): bigint {
  return BigInt(Math.round(reaisValue * 100));
}

export class PatrimonyProjectionService {
  static project(input: ProjectionInput): ProjectionResult {
    const freeCash = Math.max(0, toReais(input.monthlyFreeCashFlowCents));
    const bucketRate = input.liquidBucketMonthlyRate;

    const assets: AssetState[] = input.assets.map((a) => ({
      value: toReais(a.valueCents),
      rate: a.monthlyGrowthRate,
    }));
    const debts: DebtState[] = input.debts.map((d) => ({
      balance: toReais(d.balanceCents),
      rate: d.monthlyRate,
      payment: toReais(d.monthlyPaymentCents),
    }));

    let bucket = 0;
    const points: ProjectionPoint[] = [];

    for (let month = 1; month <= input.horizonMonths; month++) {
      for (const a of assets) {
        a.value = Math.max(0, a.value * (1 + a.rate));
      }
      bucket = bucket * (1 + bucketRate) + freeCash;
      for (const d of debts) {
        if (d.balance <= 0) continue;
        d.balance = Math.max(0, d.balance * (1 + d.rate) - d.payment);
      }

      const assetsTotal = assets.reduce((sum, a) => sum + a.value, 0) + bucket;
      const debtsTotal = debts.reduce((sum, d) => sum + d.balance, 0);
      const assetsCents = toCents(assetsTotal);
      const debtsCents = toCents(debtsTotal);
      points.push({
        month,
        assetsCents,
        debtsCents,
        netWorthCents: assetsCents - debtsCents,
      });
    }

    return { points };
  }
}
