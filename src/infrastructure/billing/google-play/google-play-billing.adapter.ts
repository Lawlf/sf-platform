import type { GooglePlaySubscriptionDetail } from "@/application/use-cases/billing/verify-google-play-purchase.use-case";
import type { PaymentProvider } from "@/domain/entities/subscription.entity";
import { BillingProviderError } from "@/domain/errors/billing-errors";
import type {
  BillingProvider,
  CheckoutSessionOutput,
  ParsedWebhookEvent,
  ProviderInvoiceSnapshot,
  ProviderSubscriptionSnapshot,
} from "@/domain/ports/external/billing-provider.port";

import { GooglePlayClient } from "./google-play-client";
import { mapSubscriptionV2ToSnapshot } from "./google-play-event.mapper";

function notSupported(method: string): never {
  throw new BillingProviderError(
    `Google Play não suporta "${method}". Assinaturas Play são geridas no app/Play Store.`,
  );
}

/**
 * Adapter de billing do Google Play. A compra acontece client-side (Digital Goods
 * + Payment Request); o servidor só verifica o purchaseToken e reconcilia o estado.
 * Por isso os fluxos de redirect/portal/cancelamento do `BillingProvider` (próprios
 * de gateways web como Stripe) lançam NotSupported — o usuário cancela na Play Store.
 */
export class GooglePlayBillingAdapter implements BillingProvider {
  readonly provider: PaymentProvider = "google_play";

  constructor(private readonly client: GooglePlayClient = new GooglePlayClient()) {}

  async getSubscriptionDetail(
    providerSubscriptionId: string,
  ): Promise<GooglePlaySubscriptionDetail> {
    const v2 = await this.client.getSubscriptionV2(providerSubscriptionId);
    return {
      snapshot: mapSubscriptionV2ToSnapshot(providerSubscriptionId, v2, new Date()),
      latestOrderId: v2.latestOrderId ?? null,
      acknowledged: v2.acknowledgementState === "ACKNOWLEDGEMENT_STATE_ACKNOWLEDGED",
    };
  }

  async getSubscription(providerSubscriptionId: string): Promise<ProviderSubscriptionSnapshot> {
    return (await this.getSubscriptionDetail(providerSubscriptionId)).snapshot;
  }

  async getLatestInvoiceForSubscription(): Promise<ProviderInvoiceSnapshot | null> {
    // A Play API não expõe "invoices"; o pagamento é registrado no verify a partir
    // do latestOrderId. Retornar null mantém o pipeline de webhook compatível.
    return null;
  }

  async acknowledge(sku: string, purchaseToken: string): Promise<void> {
    await this.client.acknowledge(sku, purchaseToken);
  }

  verifyAndParseWebhook(): ParsedWebhookEvent | null {
    // RTDN (Pub/Sub) não está no escopo do v1; a sincronização é via cron.
    return null;
  }

  createCheckoutSession(): Promise<CheckoutSessionOutput> {
    return notSupported("createCheckoutSession");
  }
  createSetupSession(): Promise<CheckoutSessionOutput> {
    return notSupported("createSetupSession");
  }
  createBillingPortalSession(): Promise<{ url: string }> {
    return notSupported("createBillingPortalSession");
  }
  cancelAtPeriodEnd(): Promise<void> {
    return notSupported("cancelAtPeriodEnd");
  }
  reactivate(): Promise<void> {
    return notSupported("reactivate");
  }
  swapSubscriptionPrice(): Promise<ProviderSubscriptionSnapshot> {
    return notSupported("swapSubscriptionPrice");
  }
}

export function buildGooglePlayBillingAdapter(): GooglePlayBillingAdapter {
  return new GooglePlayBillingAdapter();
}
