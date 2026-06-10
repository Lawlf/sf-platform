import { NextResponse, type NextRequest } from "next/server";


import { unsubscribeFromEmails } from "@/application/use-cases/notification/unsubscribe-from-emails.use-case";
import { loadEnv } from "@/infrastructure/config/env";
import { repos } from "@/infrastructure/container";
import type { EmailCategory } from "@/infrastructure/email/unsubscribe-token";
import { verifyUnsubscribeToken } from "@/infrastructure/email/unsubscribe-token";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const CATEGORY_LABEL: Record<EmailCategory, string> = {
  all: "todos os emails",
  monthly: "o lembrete mensal",
  promotions: "as promoções",
  newsletter: "a newsletter",
  news: "as novidades",
};

function page(title: string, body: string, status: number): NextResponse {
  const html = `<!doctype html>
<html lang="pt-BR">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta name="robots" content="noindex" />
    <title>${title}</title>
  </head>
  <body style="margin:0;background:#fdf8f3;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;color:#1f1d1c;">
    <div style="max-width:480px;margin:48px auto;padding:0 20px;">
      <div style="background:#ffffff;border:1px solid #ece4d8;border-radius:16px;padding:32px 28px;">
        <h1 style="margin:0 0 12px;font-size:22px;font-weight:800;letter-spacing:-0.4px;">${title}</h1>
        <p style="margin:0 0 20px;font-size:15px;line-height:1.6;color:#3a3633;">${body}</p>
        <a href="/app/perfil/notificacoes" style="display:inline-block;background:#ef7a1a;color:#fff;padding:12px 22px;border-radius:999px;font-weight:700;font-size:14px;text-decoration:none;">Gerenciar preferências</a>
      </div>
      <p style="text-align:center;margin:16px 0 0;font-size:11px;color:#6b6a67;">Sabor Financeiro · O mês inteiro do seu dinheiro</p>
    </div>
  </body>
</html>`;
  return new NextResponse(html, {
    status,
    headers: { "content-type": "text/html; charset=utf-8" },
  });
}

async function perform(token: string | null): Promise<NextResponse> {
  if (!token) {
    return page("Link inválido", "Esse link de descadastro não é válido. Use os botões no rodapé de um email recente.", 400);
  }
  const parsed = verifyUnsubscribeToken(token);
  if (!parsed) {
    return page("Link inválido ou expirado", "Esse link de descadastro não é válido. Você pode ajustar tudo nas suas preferências.", 400);
  }

  try {
    await unsubscribeFromEmails(
      { preferences: repos.notificationPreferences },
      { userId: parsed.userId, category: parsed.category },
    );
  } catch (e) {
    console.error("[unsubscribe] failed:", e);
    return page("Algo deu errado", "Não foi possível concluir agora. Tente de novo pelas suas preferências.", 500);
  }

  return page(
    "Pronto, descadastrado.",
    `Você não vai mais receber ${CATEGORY_LABEL[parsed.category]}. Mudou de ideia? É só reativar nas preferências.`,
    200,
  );
}

export async function GET(req: NextRequest) {
  loadEnv();
  return perform(new URL(req.url).searchParams.get("token"));
}

export async function POST(req: NextRequest) {
  loadEnv();
  return perform(new URL(req.url).searchParams.get("token"));
}
