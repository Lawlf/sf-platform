import Stripe from "stripe";

import { requireStripeConfig } from "@/infrastructure/config/env";

let _client: Stripe | null = null;

export function getStripeClient(): Stripe {
  if (_client) return _client;
  const cfg = requireStripeConfig();
  _client = new Stripe(cfg.secretKey, {
    apiVersion: "2026-04-22.dahlia",
    typescript: true,
  });
  return _client;
}

/** Permite reset em testes que mockam a config. */
export function _resetStripeClientForTesting(): void {
  _client = null;
}
