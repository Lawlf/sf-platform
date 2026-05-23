/// <reference lib="webworker" />
import { defaultCache } from "@serwist/next/worker";
import type { PrecacheEntry, SerwistGlobalConfig } from "serwist";
import { Serwist } from "serwist";

declare global {
  interface WorkerGlobalScope extends SerwistGlobalConfig {
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined;
  }
}

declare const self: ServiceWorkerGlobalScope & {
  __SW_MANIFEST: (PrecacheEntry | string)[] | undefined;
};

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST ?? [],
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: true,
  runtimeCaching: defaultCache,
});

serwist.addEventListeners();

interface PushPayload {
  title: string;
  body: string;
  url?: string;
  tag?: string;
  icon?: string;
  badge?: string;
}

function parsePushPayload(event: PushEvent): PushPayload {
  if (!event.data) {
    return { title: "Sabor Financeiro", body: "Você tem uma notificação.", url: "/app" };
  }
  try {
    const json = event.data.json() as Partial<PushPayload>;
    const payload: PushPayload = {
      title: typeof json.title === "string" ? json.title : "Sabor Financeiro",
      body: typeof json.body === "string" ? json.body : "",
      url: typeof json.url === "string" ? json.url : "/app",
      icon: typeof json.icon === "string" ? json.icon : "/icons/icon-192.png",
      badge: typeof json.badge === "string" ? json.badge : "/icons/icon-192.png",
    };
    if (typeof json.tag === "string") payload.tag = json.tag;
    return payload;
  } catch {
    return {
      title: "Sabor Financeiro",
      body: event.data.text(),
      url: "/app",
    };
  }
}

self.addEventListener("push", (event) => {
  const pushEvent = event as PushEvent;
  const payload = parsePushPayload(pushEvent);
  const options: NotificationOptions = {
    body: payload.body,
    icon: payload.icon ?? "/icons/icon-192.png",
    badge: payload.badge ?? "/icons/icon-192.png",
    data: { url: payload.url ?? "/app" },
  };
  if (payload.tag) options.tag = payload.tag;
  pushEvent.waitUntil(self.registration.showNotification(payload.title, options));
});

self.addEventListener("notificationclick", (event) => {
  const notifEvent = event as NotificationEvent;
  notifEvent.notification.close();
  const data = notifEvent.notification.data as { url?: string } | null;
  const targetUrl = typeof data?.url === "string" ? data.url : "/app";

  notifEvent.waitUntil(
    (async () => {
      const allClients = await self.clients.matchAll({
        type: "window",
        includeUncontrolled: true,
      });
      for (const client of allClients) {
        if (client.url.includes(targetUrl) && "focus" in client) {
          return client.focus();
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl);
      }
      return undefined;
    })(),
  );
});
