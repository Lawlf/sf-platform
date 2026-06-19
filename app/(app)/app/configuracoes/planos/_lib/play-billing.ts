export const PLAY_BILLING_METHOD = "https://play.google.com/billing";

// SKUs criados no Google Play Console. Espelham as linhas provider=google_play em
// scripts/seed-pro-plan.sql. Vitalício não é vendido pelo Play (só assinatura).
export const PLAY_SKU_BY_INTERVAL: Record<string, string | undefined> = {
  month: "pro_monthly",
  year: "pro_annual",
};

interface ItemDetails {
  itemId: string;
  title: string;
  price: { value: string; currency: string };
}

interface PurchaseDetails {
  itemId: string;
  purchaseToken: string;
}

interface DigitalGoodsService {
  getDetails(skus: string[]): Promise<ItemDetails[]>;
  listPurchases(): Promise<PurchaseDetails[]>;
}

type WindowWithDigitalGoods = Window & {
  getDigitalGoodsService?: (method: string) => Promise<DigitalGoodsService>;
};

export function isPlayBillingAvailable(): boolean {
  return typeof window !== "undefined" && "getDigitalGoodsService" in window;
}

export function isAndroidTwa(): boolean {
  return typeof document !== "undefined" && document.referrer.startsWith("android-app://");
}

export type PlayPurchaseResult =
  | { ok: true }
  | { ok: false; message: string }
  | { ok: false; canceled: true };

async function resolveToken(
  service: DigitalGoodsService,
  sku: string,
  response: PaymentResponse,
): Promise<string | null> {
  const details = response.details as { purchaseToken?: string } | undefined;
  if (details?.purchaseToken) return details.purchaseToken;
  try {
    const purchases = await service.listPurchases();
    return purchases.find((p) => p.itemId === sku)?.purchaseToken ?? null;
  } catch {
    return null;
  }
}

/**
 * Abre a compra de assinatura via Google Play (TWA). `verify` é chamado com o
 * purchaseToken pra validar no servidor; o resultado decide o complete() do
 * Payment Request. Garante que complete() sempre roda (senão a UI de pagamento
 * trava). Retorna canceled quando o usuário fecha a folha.
 */
export async function purchaseSubscriptionViaPlay(
  sku: string,
  verify: (purchaseToken: string) => Promise<boolean>,
): Promise<PlayPurchaseResult> {
  const getService = (window as WindowWithDigitalGoods).getDigitalGoodsService;
  if (!getService) return { ok: false, message: "Compra no app indisponível." };

  let service: DigitalGoodsService;
  try {
    service = await getService(PLAY_BILLING_METHOD);
  } catch {
    return { ok: false, message: "Compra no app indisponível." };
  }

  let total = { label: "Assinatura", amount: { currency: "BRL", value: "0" } };
  try {
    const item = (await service.getDetails([sku])).find((d) => d.itemId === sku);
    if (item) total = { label: item.title, amount: item.price };
  } catch {
    // segue sem detalhes; Play preenche o valor real na folha de pagamento.
  }

  let response: PaymentResponse;
  try {
    const request = new PaymentRequest([{ supportedMethods: PLAY_BILLING_METHOD, data: { sku } }], {
      total,
    });
    response = await request.show();
  } catch (e) {
    if (e instanceof DOMException && (e.name === "AbortError" || e.name === "NotAllowedError")) {
      return { ok: false, canceled: true };
    }
    return { ok: false, message: "Não foi possível abrir a compra no Google Play." };
  }

  const purchaseToken = await resolveToken(service, sku, response);
  if (!purchaseToken) {
    await response.complete("fail");
    return { ok: false, message: "Compra não retornou um token válido." };
  }

  let verified = false;
  try {
    verified = await verify(purchaseToken);
  } catch {
    verified = false;
  }
  await response.complete(verified ? "success" : "fail");

  return verified ? { ok: true } : { ok: false, message: "Não conseguimos confirmar o pagamento." };
}
