import { DomainError } from "@/shared/errors/domain-error";

export class HouseholdNotFound extends DomainError {
  readonly code = "HOUSEHOLD_NOT_FOUND" as const;
}

export class HouseholdInviteNotFound extends DomainError {
  readonly code = "HOUSEHOLD_INVITE_NOT_FOUND" as const;
}

export class HouseholdInviteInvalidStatus extends DomainError {
  readonly code = "HOUSEHOLD_INVITE_INVALID_STATUS" as const;
}

export class HouseholdAlreadyMember extends DomainError {
  readonly code = "HOUSEHOLD_ALREADY_MEMBER" as const;
}

export class HouseholdLastAdminError extends DomainError {
  readonly code = "HOUSEHOLD_LAST_ADMIN" as const;
}

export class HouseholdNotMember extends DomainError {
  readonly code = "HOUSEHOLD_NOT_MEMBER" as const;
}
