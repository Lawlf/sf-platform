import type { Metadata, Route } from "next";
import { redirect } from "next/navigation";

import { getCurrentUser } from "@/presentation/http/middleware/cached-current-user";

import { LoginPanel } from "./_components/login-panel";

export const metadata: Metadata = {
  title: "Entrar",
  description: "Entre no Sabor Financeiro por magic link ou Google.",
  alternates: { canonical: "/entrar" },
  robots: { index: false, follow: true },
};

interface PageProps {
  searchParams: Promise<{ error?: string }>;
}

const ERROR_MESSAGES: Record<string, string> = {
  link_invalido: "Link inválido ou expirado.",
  magic_link_invalid: "Link inválido ou expirado.",
  magic_link_already_used: "Este link já foi utilizado.",
  magic_link_expired: "Link expirado. Solicite um novo.",
  account_deactivated: "Conta desativada. Fale com o suporte para reativar.",
  account_deactivated_self: "Conta desativada com sucesso.",
};

export default async function EntrarPage({ searchParams }: PageProps) {
  const user = await getCurrentUser();
  if (user) {
    redirect("/app" as Route);
  }

  const sp = await searchParams;
  const errorCode = sp.error;
  const errorMessage = errorCode ? (ERROR_MESSAGES[errorCode] ?? "Não foi possível entrar.") : null;

  return (
    <main
      id="conteudo"
      className="bg-warm-gradient relative flex min-h-screen items-center justify-center overflow-hidden px-6 py-10"
    >
      <div className="bg-blob-top-right" aria-hidden />
      <div className="bg-blob-bottom-left" aria-hidden />
      <LoginPanel errorMessage={errorMessage} />
    </main>
  );
}
