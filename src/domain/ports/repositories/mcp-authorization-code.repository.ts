import type { McpScope } from "@/domain/mcp/scopes";

export interface McpAuthorizationCode {
  codeHash: string;
  clientId: string;
  userId: string;
  scopes: McpScope[];
  codeChallenge: string;
  redirectUri: string;
  expiresAt: Date;
  consumedAt: Date | null;
}

export interface McpAuthorizationCodeRepositoryPort {
  create(input: Omit<McpAuthorizationCode, "consumedAt">): Promise<void>;
  findByHash(codeHash: string): Promise<McpAuthorizationCode | null>;
  markConsumed(codeHash: string, now: Date): Promise<boolean>;
}
