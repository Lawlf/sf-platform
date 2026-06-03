export interface McpAccessToken {
  tokenHash: string;
  connectionId: string;
  expiresAt: Date;
}

export interface McpRefreshToken {
  tokenHash: string;
  connectionId: string;
  expiresAt: Date;
}

export interface McpTokenRepository {
  createAccessToken(input: McpAccessToken): Promise<void>;
  findAccessTokenByHash(tokenHash: string): Promise<McpAccessToken | null>;
  createRefreshToken(input: McpRefreshToken): Promise<void>;
  findRefreshTokenByHash(tokenHash: string): Promise<McpRefreshToken | null>;
  rotateRefreshToken(oldHash: string, next: McpRefreshToken): Promise<void>;
  deleteForConnection(connectionId: string): Promise<void>;
}
