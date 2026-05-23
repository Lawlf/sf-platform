import { DomainError } from "@/shared/errors";

export class AlreadySubscribedError extends DomainError {
  readonly code = "ALREADY_SUBSCRIBED" as const;
}

export class NoActiveSubscriptionError extends DomainError {
  readonly code = "NO_ACTIVE_SUBSCRIPTION" as const;
}

export class BillingProviderError extends DomainError {
  readonly code = "BILLING_PROVIDER_ERROR" as const;
}

export class InvalidWebhookSignatureError extends DomainError {
  readonly code = "INVALID_WEBHOOK_SIGNATURE" as const;
}

export class PlanNotFoundError extends DomainError {
  readonly code = "PLAN_NOT_FOUND" as const;
}

export class PlanNotCheckoutReadyError extends DomainError {
  readonly code = "PLAN_NOT_CHECKOUT_READY" as const;
}

export class LifetimeSoldOutError extends DomainError {
  readonly code = "LIFETIME_SOLD_OUT" as const;
}

export class SamePlanError extends DomainError {
  readonly code = "SAME_PLAN" as const;
}

export class PlanSwapNotSupportedError extends DomainError {
  readonly code = "PLAN_SWAP_NOT_SUPPORTED" as const;
}
