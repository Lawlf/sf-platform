import type { AssetCategory } from "@/domain/entities/asset.entity";
import { DomainError } from "@/shared/errors/domain-error";

export class AssetNotFound extends DomainError {
  readonly code = "ASSET_NOT_FOUND" as const;
}

export class AssetNotOwned extends DomainError {
  readonly code = "ASSET_NOT_OWNED" as const;
}

export class AssetDeactivated extends DomainError {
  readonly code = "ASSET_DEACTIVATED" as const;
}

export class AssetAlreadyDeactivated extends DomainError {
  readonly code = "ASSET_ALREADY_DEACTIVATED" as const;
}

export class AssetAlreadyActive extends DomainError {
  readonly code = "ASSET_ALREADY_ACTIVE" as const;
}

export class InvalidAssetLabel extends DomainError {
  readonly code = "INVALID_ASSET_LABEL" as const;
}

export class InvalidAssetValue extends DomainError {
  readonly code = "INVALID_ASSET_VALUE" as const;
}

export class InvalidDeactivationReason extends DomainError {
  readonly code = "INVALID_DEACTIVATION_REASON" as const;
}

export class InvalidAllocation extends DomainError {
  readonly code = "INVALID_ALLOCATION" as const;
}

export class AssetMetadataMismatch extends DomainError {
  readonly code = "ASSET_METADATA_MISMATCH" as const;
  readonly expected: AssetCategory;
  readonly got: string;

  constructor(expected: AssetCategory, got: string) {
    super(`Metadata kind (${got}) does not match asset category (${expected}).`);
    this.expected = expected;
    this.got = got;
  }
}

export class DebtNotActive extends DomainError {
  readonly code = "DEBT_NOT_ACTIVE" as const;
  readonly debtId: string;

  constructor(debtId: string) {
    super(`Divida ${debtId} nao esta ativa.`);
    this.debtId = debtId;
  }
}

export class AllocationExceedsPrincipal extends DomainError {
  readonly code = "ALLOCATION_EXCEEDS_PRINCIPAL" as const;
  readonly debtId: string;
  readonly availableCents: bigint;

  constructor(debtId: string, availableCents: bigint) {
    super(
      `Alocacao excede o principal disponivel da divida ${debtId}. Disponivel: ${availableCents} centavos.`,
    );
    this.debtId = debtId;
    this.availableCents = availableCents;
  }
}

export class AssetFipeNotApplicable extends DomainError {
  readonly code = "ASSET_FIPE_NOT_APPLICABLE" as const;

  constructor(message = "Ativo não é veículo ou não possui código FIPE configurado.") {
    super(message);
  }
}

export class AssetFipeRefreshFailed extends DomainError {
  readonly code = "ASSET_FIPE_REFRESH_FAILED" as const;
  readonly reason: string;

  constructor(reason: string) {
    super(`Falha ao atualizar valor FIPE: ${reason}`);
    this.reason = reason;
  }
}

export class AssetNotStock extends DomainError {
  readonly code = "ASSET_NOT_STOCK" as const;

  constructor(message = "Esse ativo não é uma ação.") {
    super(message);
  }
}

export class QuoteUnavailable extends DomainError {
  readonly code = "QUOTE_UNAVAILABLE" as const;

  constructor(message = "Não foi possível buscar a cotação no momento.") {
    super(message);
  }
}

export class AssetNotCash extends DomainError {
  readonly code = "ASSET_NOT_CASH" as const;

  constructor(message = "Acao disponivel apenas para reservas em dinheiro.") {
    super(message);
  }
}
