import type { Money } from "@/domain/value-objects/money.vo";

export interface WalletEvent {
  /** Data em que o dinheiro se move. Comparada em UTC. */
  date: Date;
  /** Valor sempre positivo; o sinal vem de `direction`. */
  amount: Money;
  direction: "in" | "out";
}

export interface ReactiveBalanceInput {
  /** Último saldo fixado pela pessoa ("quanto tem hoje?" / ajustar saldo). */
  anchorValue: Money;
  /** Quando a âncora foi fixada. Eventos <= anchorAt são ignorados. */
  anchorAt: Date;
  /** "Agora" — eventos realizados até esta data entram. */
  asOf: Date;
  /** Eventos já realizados (renda recebida, dívida liquidada, lançamentos). */
  events: WalletEvent[];
}

export interface MonthProjectionInput extends ReactiveBalanceInput {
  /** Eventos esperados ainda no mês (renda a cair, dívida a vencer). */
  expectedEvents: WalletEvent[];
}

function applyEvents(base: Money, events: WalletEvent[], after: Date, until: Date): Money {
  const afterMs = after.getTime();
  const untilMs = until.getTime();
  return events.reduce((acc, ev) => {
    const t = ev.date.getTime();
    if (t <= afterMs || t > untilMs) return acc;
    return ev.direction === "in" ? acc.add(ev.amount) : acc.subtract(ev.amount);
  }, base);
}

function endOfMonthUtc(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0, 23, 59, 59, 999));
}

export class WalletBalanceService {
  static reactiveBalance(input: ReactiveBalanceInput): Money {
    return applyEvents(input.anchorValue, input.events, input.anchorAt, input.asOf);
  }

  static monthEndProjection(input: MonthProjectionInput): Money {
    const reactive = WalletBalanceService.reactiveBalance(input);
    return applyEvents(reactive, input.expectedEvents, input.asOf, endOfMonthUtc(input.asOf));
  }
}
