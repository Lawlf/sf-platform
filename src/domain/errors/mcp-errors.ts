import { DomainError } from "@/shared/errors/domain-error";

export class McpUnauthorized extends DomainError {
  readonly code = "MCP_UNAUTHORIZED" as const;
  constructor(message = "Token MCP inválido ou expirado.") {
    super(message);
  }
}

export class McpConnectionRevoked extends DomainError {
  readonly code = "MCP_CONNECTION_REVOKED" as const;
  constructor(message = "Conexão revogada.") {
    super(message);
  }
}

export class McpScopeDenied extends DomainError {
  readonly code = "MCP_SCOPE_DENIED" as const;
  constructor(scope: string) {
    super(`Permissão ausente: ${scope}. Conceda esse escopo em Integrações.`);
  }
}

export class McpFreeLimitReached extends DomainError {
  readonly code = "MCP_FREE_LIMIT_REACHED" as const;
  constructor(
    message = "Limite de 100 chamadas mensais do plano gratuito atingido. Assine o Pro para uso ilimitado em /app/configuracoes/planos.",
  ) {
    super(message);
  }
}

export class McpInvalidGrant extends DomainError {
  readonly code = "MCP_INVALID_GRANT" as const;
  constructor(message = "Código de autorização inválido, expirado ou já usado.") {
    super(message);
  }
}

export class McpInvalidClient extends DomainError {
  readonly code = "MCP_INVALID_CLIENT" as const;
  constructor(message = "Cliente OAuth desconhecido.") {
    super(message);
  }
}

export class McpConfirmationRequired extends DomainError {
  readonly code = "MCP_CONFIRMATION_REQUIRED" as const;
  constructor(
    message = "Esta ação precisa de confirmação. Reveja o preview e confirme com o token.",
  ) {
    super(message);
  }
}

export class McpConfirmationInvalid extends DomainError {
  readonly code = "MCP_CONFIRMATION_INVALID" as const;
  constructor(message = "Token de confirmação inválido, expirado ou já usado.") {
    super(message);
  }
}

export class McpPendingNotFound extends DomainError {
  readonly code = "MCP_PENDING_NOT_FOUND" as const;
  constructor(message = "Ação pendente não encontrada.") {
    super(message);
  }
}
