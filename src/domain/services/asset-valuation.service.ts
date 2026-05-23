import type { AssetEntity } from "@/domain/entities/asset.entity";
import { Money } from "@/domain/value-objects/money.vo";

const MS_PER_YEAR = 365 * 24 * 3600 * 1000;

/**
 * Serviço puro para calcular o valor corrente de um ativo conforme sua
 * configuração de depreciação ou apreciação. Sem I/O, sem efeitos colaterais,
 * sem dependência de `Date.now()`. O caller passa `asOf`.
 *
 * Fórmula linear (v1):
 *   yearsElapsed = (asOf - purchaseDate) / 365 dias
 *   ratio = 1 - (depreciationRatePctYear / 100) * yearsElapsed
 *   currentValue = purchaseValue * max(ratio, 0)
 *
 * Casos especiais:
 *   - Sem `purchaseDate` ou taxa = 0: retorna o valor atual cadastrado.
 *   - `asOf` antes da compra: retorna o valor cadastrado (sem depreciação).
 *   - Taxa negativa: apreciação (ex: imóveis), valor cresce com o tempo.
 *   - Valor é clampado em zero (não fica negativo).
 */
export class AssetValuationService {
  static computeCurrentValue(asset: AssetEntity, asOf: Date): Money {
    if (!asset.purchaseDate || asset.depreciationRatePctYear === 0) {
      return asset.currentValue;
    }
    const yearsElapsed = (asOf.getTime() - asset.purchaseDate.getTime()) / MS_PER_YEAR;
    if (yearsElapsed <= 0) return asset.currentValue;
    const ratio = 1 - (asset.depreciationRatePctYear / 100) * yearsElapsed;
    const ratioBp = Math.max(0, Math.round(ratio * 10000));
    const cents = asset.currentValue.toCents();
    const newCents = (cents * BigInt(ratioBp)) / 10000n;
    return Money.fromCents(newCents > 0n ? newCents : 0n);
  }
}
