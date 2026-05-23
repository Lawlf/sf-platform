import { Client, Receiver } from "@upstash/qstash";

import { getQStashConfig } from "@/infrastructure/config/env";

let cachedClient: Client | null = null;
let cachedReceiver: Receiver | null = null;

export function getQStashClient(): Client | null {
  if (cachedClient) return cachedClient;
  const cfg = getQStashConfig();
  if (!cfg) return null;
  cachedClient = new Client({ token: cfg.token });
  return cachedClient;
}

export function getQStashReceiver(): Receiver | null {
  if (cachedReceiver) return cachedReceiver;
  const cfg = getQStashConfig();
  if (!cfg) return null;
  cachedReceiver = new Receiver({
    currentSigningKey: cfg.currentSigningKey,
    nextSigningKey: cfg.nextSigningKey,
  });
  return cachedReceiver;
}
