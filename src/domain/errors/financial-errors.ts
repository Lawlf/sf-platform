import { DomainError } from "@/shared/errors";

export class InvalidMoneyAmountError extends DomainError {
  readonly code = "INVALID_MONEY_AMOUNT" as const;
}

export class InvalidInterestRateError extends DomainError {
  readonly code = "INVALID_INTEREST_RATE" as const;
}

export class InvalidPeriodError extends DomainError {
  readonly code = "INVALID_PERIOD" as const;
}

export class InvalidAmortizationParamsError extends DomainError {
  readonly code = "INVALID_AMORTIZATION_PARAMS" as const;
}

export class DebtNotFound extends DomainError {
  readonly code = "DEBT_NOT_FOUND" as const;
}

export class IncomeNotFound extends DomainError {
  readonly code = "INCOME_NOT_FOUND" as const;
}

export class IncomeAlreadyActive extends DomainError {
  readonly code = "INCOME_ALREADY_ACTIVE" as const;
}

export class DebtAlreadyActive extends DomainError {
  readonly code = "DEBT_ALREADY_ACTIVE" as const;
}

export class PaymentExceedsBalanceError extends DomainError {
  readonly code = "PAYMENT_EXCEEDS_BALANCE" as const;
}

export class NotificationNotFound extends DomainError {
  readonly code = "NOTIFICATION_NOT_FOUND" as const;
}
