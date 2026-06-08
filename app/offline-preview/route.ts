import { OFFLINE_FALLBACK_HTML } from "../offline-fallback-html";

// Preview da tela de offline servida pelo service worker (app/sw.ts). Existe só
// pra ver o visual em dev, onde o SW fica desabilitado. Não é a rota real do
// fallback: o SW devolve esse HTML inline em qualquer navegação que falhe.
export function GET() {
  return new Response(OFFLINE_FALLBACK_HTML, {
    status: 200,
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}
