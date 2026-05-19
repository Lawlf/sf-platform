import { DomainError } from "@/shared/errors";

export class InvalidEmailError extends DomainError {
  readonly code = "INVALID_EMAIL" as const;
}

export class Email {
  private constructor(private readonly value: string) {}

  static from(raw: string): { ok: true; value: Email } | { ok: false; error: InvalidEmailError } {
    const trimmed = (raw ?? "").trim().toLowerCase();
    if (trimmed.length === 0) return { ok: false, error: new InvalidEmailError("Email vazio.") };
    if (trimmed.length > 320)
      return { ok: false, error: new InvalidEmailError("Email muito longo.") };
    const at = trimmed.indexOf("@");
    if (at < 1 || at === trimmed.length - 1) {
      return { ok: false, error: new InvalidEmailError("Email invalido.") };
    }
    return { ok: true, value: new Email(trimmed) };
  }

  toString(): string {
    return this.value;
  }

  equals(other: Email): boolean {
    return this.value === other.value;
  }
}
