export type RuleOfThreeKind = "direct" | "inverse";

export interface RuleOfThreeInput {
  a: number;
  b: number;
  c: number;
  kind: RuleOfThreeKind;
}

export interface RuleOfThreeResult {
  /** Valor de X; null quando a entrada é inválida (divisão por zero ou não finita). */
  x: number | null;
}

/**
 * Serviço puro de regra de três. "A está para B assim como C está para X".
 *
 * Direta (grandezas crescem juntas): X = B * C / A.
 * Inversa (uma cresce, a outra cai): X = A * B / C.
 * Sem I/O, sem efeitos colaterais.
 */
export class RuleOfThreeService {
  static solve(input: RuleOfThreeInput): RuleOfThreeResult {
    const { a, b, c, kind } = input;
    if (![a, b, c].every(Number.isFinite)) return { x: null };

    const x = kind === "direct" ? (b * c) / a : (a * b) / c;
    if (!Number.isFinite(x)) return { x: null };
    return { x };
  }
}
