export const MCP_ACCESS_TOKEN_TTL_MS = 30 * 60 * 1000;
export const MCP_REFRESH_TOKEN_TTL_MS = 30 * 24 * 60 * 60 * 1000;
export const MCP_AUTH_CODE_TTL_MS = 60 * 1000;
export const MCP_CONFIRMATION_TOKEN_TTL_MS = 5 * 60 * 1000;

export const MCP_FREE_MONTHLY_LIMIT = 100;

export const MCP_CONFIRMATION_VALUE_THRESHOLD_CENTS = 500_000;

export function mcpUsagePeriod(now: Date): string {
  return now.toISOString().slice(0, 7);
}
