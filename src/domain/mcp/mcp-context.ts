import type { McpScope } from "./scopes";

export interface McpContext {
  connectionId: string;
  userId: string;
  isPro: boolean;
  scopes: McpScope[];
}

export function hasScope(ctx: McpContext, scope: McpScope): boolean {
  return ctx.scopes.includes(scope);
}
