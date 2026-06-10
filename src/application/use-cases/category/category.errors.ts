import { DomainError } from "@/shared/errors/domain-error";

export class CategoryError extends DomainError {
  readonly code = "CATEGORY_ERROR";
}
