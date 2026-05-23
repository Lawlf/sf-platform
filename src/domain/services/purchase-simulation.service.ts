import { Money } from "@/domain/value-objects/money.vo";

export interface SimulateInput {
  amountCents: bigint;
  monthsHorizon: number; // 1-120
  depreciationRatePctYear: number; // 0-100 (or negative for appreciation)
  opportunityRatePctYear: number; // 0-50 typically (CDI ~12)
}

export interface ScenarioKeep {
  finalValueCents: bigint; // valor depreciado em N meses (linear)
  netLossCents: bigint; // amountCents - finalValueCents (positive = loss)
}

export interface ScenarioResell {
  finalValueCents: bigint; // same as keep for linear depreciation model
  realCostCents: bigint; // amountCents - finalValueCents
}

export interface ScenarioInvest {
  finalValueCents: bigint; // amountCents * (1 + rate)^years (compound annual)
  profitCents: bigint; // finalValueCents - amountCents
}

export interface SimulationResult {
  scenarioKeep: ScenarioKeep;
  scenarioResell: ScenarioResell;
  scenarioInvest: ScenarioInvest;
  opportunityCostCents: bigint; // scenarioInvest.finalValue - scenarioKeep.finalValue
}

/**
 * Serviço puro para simular cenários de "valeu a pena comprar?".
 *
 * Compara três cenários ao longo de um horizonte em meses:
 *   - Keep: manter o bem (depreciação linear anual).
 *   - Resell: revender ao valor depreciado (v1 sem fricção de transação).
 *   - Invest: investir o mesmo valor a uma taxa de oportunidade (juros compostos anuais).
 *
 * Sem I/O, sem `Date.now`, sem efeitos colaterais. Toda matemática em bigint
 * para os valores em centavos, usando escala em basis points (10000) para
 * preservar precisão ao multiplicar por floats.
 */
export class PurchaseSimulationService {
  static simulate(input: SimulateInput): SimulationResult {
    const { amountCents, monthsHorizon, depreciationRatePctYear, opportunityRatePctYear } = input;
    const years = monthsHorizon / 12;

    // Linear depreciation: finalValue = amount * (1 - rate * years), pode passar de 1 (apreciação)
    // Clamp inferior em 0 para depreciações que ultrapassam 100%.
    const depRatio = 1 - (depreciationRatePctYear / 100) * years;
    const keepFinalCents = scaleCents(amountCents, depRatio);

    // Resell = same value as keep in linear model (no transaction friction in v1)
    const resellFinalCents = keepFinalCents;

    // Invest compound annual: amount * (1 + rate)^years
    const investRatio = Math.pow(1 + opportunityRatePctYear / 100, years);
    const investFinalCents = scaleCents(amountCents, investRatio);

    return {
      scenarioKeep: {
        finalValueCents: keepFinalCents,
        netLossCents: amountCents - keepFinalCents,
      },
      scenarioResell: {
        finalValueCents: resellFinalCents,
        realCostCents: amountCents - resellFinalCents,
      },
      scenarioInvest: {
        finalValueCents: investFinalCents,
        profitCents: investFinalCents - amountCents,
      },
      opportunityCostCents: investFinalCents - keepFinalCents,
    };
  }
}

/**
 * Scale a bigint cents value by a float ratio using 10000 basis points precision.
 * Clamps to >= 0 (não produz valores negativos).
 */
function scaleCents(cents: bigint, ratio: number): bigint {
  if (!Number.isFinite(ratio) || ratio <= 0) return 0n;
  const ratioBp = Math.round(ratio * 10000);
  if (ratioBp <= 0) return 0n;
  const result = (cents * BigInt(ratioBp)) / 10000n;
  return result > 0n ? result : 0n;
}

/**
 * Convenience helper for UI to convert cents to a Money VO.
 */
export function toMoney(cents: bigint): Money {
  return Money.fromCents(cents);
}
