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
