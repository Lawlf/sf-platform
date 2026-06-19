import { DomainError } from "@/shared/errors/domain-error";

export class ProfileNotFound extends DomainError {
  readonly code = "PROFILE_NOT_FOUND" as const;
}

export class ProfilePrimaryCannotBeDeleted extends DomainError {
  readonly code = "PROFILE_PRIMARY_CANNOT_BE_DELETED" as const;
}
