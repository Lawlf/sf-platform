import { loadEnv } from "@/infrastructure/config/env";

export function mcpServerUrl(): string {
  return `${loadEnv().NEXT_PUBLIC_APP_URL}/api/mcp`;
}
