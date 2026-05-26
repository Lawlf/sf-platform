import { InvalidAmortizationParamsError } from "@/domain/errors/financial-errors";
import { InterestRate } from "@/domain/value-objects/interest-rate.vo";
import type { Money } from "@/domain/value-objects/money.vo";
import { err, isOk, ok, type Result } from "@/shared/errors/result";

export interface CetParams {
  principal: Money;
  installments: Money[]; // monthly outflows (in order)
  upfrontFees?: Money; // optional, reduces net received
  initialGuessMonthly?: number; // override start (default heuristic)
  maxIterations?: number; // default 100
  tolerance?: number; // default 1e-9
}

const DEFAULT_MAX_ITERATIONS = 100;
const DEFAULT_TOLERANCE = 1e-9;
const MIN_RATE = -0.99;
const MIN_DERIVATIVE = 1e-12;

export class CetCalculatorService {
  static compute(params: CetParams): Result<InterestRate, InvalidAmortizationParamsError> {
    if (params.installments.length === 0) {
      return err(new InvalidAmortizationParamsError("installments deve ter ao menos uma parcela."));
    }
    if (!params.principal.isPositive()) {
      return err(new InvalidAmortizationParamsError("principal deve ser positivo."));
    }
    if (params.installments.some((m) => m.isNegative())) {
      return err(new InvalidAmortizationParamsError("Parcelas nao podem ser negativas."));
    }

    const installments = params.installments.map((m) => m.toNumber());
    const principal = params.principal.toNumber();
    const fees = params.upfrontFees ? params.upfrontFees.toNumber() : 0;
    const net = principal - fees;
    if (net <= 0) {
      return err(
        new InvalidAmortizationParamsError(
          "Principal liquido (descontadas taxas) deve ser positivo.",
        ),
      );
    }
    const n = installments.length;
    const sumInstallments = installments.reduce((acc, v) => acc + v, 0);

    let r =
      params.initialGuessMonthly ??
      (sumInstallments > 0 ? Math.pow(sumInstallments / net, 1 / n) - 1 : 0.01);
    if (!Number.isFinite(r) || r <= MIN_RATE) r = 0.01;

    const maxIter = params.maxIterations ?? DEFAULT_MAX_ITERATIONS;
    const tol = params.tolerance ?? DEFAULT_TOLERANCE;

    for (let iter = 0; iter < maxIter; iter++) {
      let f = -net;
      let fPrime = 0;
      for (let k = 1; k <= n; k++) {
        const installment = installments[k - 1]!;
        const denom = Math.pow(1 + r, k);
        f += installment / denom;
        fPrime += (-k * installment) / Math.pow(1 + r, k + 1);
      }
      if (Math.abs(f) < tol) {
        const final = InterestRate.fromMonthly(r);
        if (!isOk(final)) {
          return err(new InvalidAmortizationParamsError("CET convergiu para taxa invalida."));
        }
        return ok(final.value);
      }
      if (Math.abs(fPrime) < MIN_DERIVATIVE) {
        return err(
          new InvalidAmortizationParamsError("CET: derivada zero, nao foi possivel convergir."),
        );
      }
      r = r - f / fPrime;
      if (r <= MIN_RATE) r = MIN_RATE;
      if (!Number.isFinite(r)) {
        return err(new InvalidAmortizationParamsError("CET: iteracao produziu valor nao finito."));
      }
    }

    return err(new InvalidAmortizationParamsError(`CET nao convergiu em ${maxIter} iteracoes.`));
  }
}
