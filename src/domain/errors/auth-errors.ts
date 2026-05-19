import { DomainError } from "@/shared/errors";

export class MagicLinkExpired extends DomainError {
  readonly code = "MAGIC_LINK_EXPIRED" as const;
}
export class MagicLinkInvalid extends DomainError {
  readonly code = "MAGIC_LINK_INVALID" as const;
}
export class MagicLinkAlreadyUsed extends DomainError {
  readonly code = "MAGIC_LINK_ALREADY_USED" as const;
}
export class TooManyAttempts extends DomainError {
  readonly code = "TOO_MANY_ATTEMPTS" as const;
}
export class RateLimited extends DomainError {
  readonly code = "RATE_LIMITED" as const;
}
export class OauthStateMismatch extends DomainError {
  readonly code = "OAUTH_STATE_MISMATCH" as const;
}
export class OauthExchangeFailed extends DomainError {
  readonly code = "OAUTH_EXCHANGE_FAILED" as const;
}
export class OauthAccountLinkRequiresVerification extends DomainError {
  readonly code = "OAUTH_ACCOUNT_LINK_REQUIRES_VERIFICATION" as const;
}
export class AccountDeactivated extends DomainError {
  readonly code = "ACCOUNT_DEACTIVATED" as const;
}
export class SessionNotFound extends DomainError {
  readonly code = "SESSION_NOT_FOUND" as const;
}
export class Forbidden extends DomainError {
  readonly code = "FORBIDDEN" as const;
}
export class UserNotFound extends DomainError {
  readonly code = "USER_NOT_FOUND" as const;
}
