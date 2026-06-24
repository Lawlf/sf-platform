import { subscribePushAction } from "../_actions/subscribe-push.action";

function urlBase64ToUint8Array(base64String: string): Uint8Array<ArrayBuffer> {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  const buffer = new ArrayBuffer(rawData.length);
  const output = new Uint8Array(buffer);
  for (let i = 0; i < rawData.length; i++) {
    output[i] = rawData.charCodeAt(i);
  }
  return output;
}

function arrayBufferToBase64(buffer: ArrayBuffer | null): string {
  if (!buffer) return "";
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]!);
  }
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export interface SubscribePushResult {
  ok: true;
  deviceCount: number;
}

export interface SubscribePushError {
  ok: false;
  message: string;
}

export async function subscribePush(
  vapidPublicKey: string,
): Promise<SubscribePushResult | SubscribePushError> {
  if (typeof window === "undefined" || !("serviceWorker" in navigator) || !("PushManager" in window)) {
    return { ok: false, message: "Seu navegador não suporta notificações." };
  }
  if (!vapidPublicKey) {
    return { ok: false, message: "Não foi possível ativar agora. Tente de novo." };
  }

  const permission = await Notification.requestPermission();
  if (permission !== "granted") {
    return { ok: false, message: "Permissão negada. Habilite nas configurações do navegador." };
  }

  const registration = await navigator.serviceWorker.ready;
  let subscription = await registration.pushManager.getSubscription();
  if (!subscription) {
    subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
    });
  }

  const p256dh = arrayBufferToBase64(subscription.getKey("p256dh"));
  const auth = arrayBufferToBase64(subscription.getKey("auth"));
  const res = await subscribePushAction({
    endpoint: subscription.endpoint,
    p256dh,
    auth,
    userAgent: navigator.userAgent,
  });

  if (!res.ok) {
    return { ok: false, message: res.message };
  }

  return { ok: true, deviceCount: res.data.deviceCount };
}
