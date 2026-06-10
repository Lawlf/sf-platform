import { Bot, ChevronRight, FileUp } from "lucide-react";
import type { Metadata } from "next";
import type { Route } from "next";
import Link from "next/link";

import { requireUser } from "@/presentation/http/middleware/cached-current-user";

import { PageShell } from "../../_components/page-shell";

export const metadata: Metadata = { title: "Importação de dados" };

export default async function ImportacaoDeDadosPage() {
  await requireUser();

  return (
    <PageShell
      title="Importação de dados"
      description="Você revisa tudo antes de confirmar. Nada é lançado automaticamente."
      backHref={"/app/configuracoes" as Route}
    >
      <Link
        href={"/app/configuracoes/importacao-de-dados/extrato" as Route}
        className="focus-ring flex items-center gap-3 rounded-2xl border border-[color:var(--border-soft)] bg-[color:var(--surface-1)] p-4 backdrop-blur-xl transition-colors hover:bg-[color:var(--surface-2)]"
      >
        <span className="flex h-10 w-10 flex-none items-center justify-center rounded-xl bg-[color:var(--color-brand-500)]/[0.14] text-[color:var(--color-brand-800)]">
          <FileUp size={18} strokeWidth={1.75} aria-hidden />
        </span>
        <div className="flex-1">
          <div className="text-[0.875rem] font-semibold text-[color:var(--text-primary)]">
            Importar extrato do banco
          </div>
          <div className="mt-0.5 text-[0.75rem] text-[color:var(--text-secondary)]">
            O arquivo do banco traz suas movimentações e o saldo da conta. O dinheiro das caixinhas
            não vem no arquivo, então a gente pergunta esse valor na hora. 1 conta no plano gratuito,
            várias no Pro.
          </div>
        </div>
        <ChevronRight
          size={18}
          strokeWidth={2}
          className="flex-none text-[color:var(--color-brand-800)]"
          aria-hidden
        />
      </Link>

      <Link
        href={"/app/configuracoes/integracoes" as Route}
        className="focus-ring flex items-center gap-3 rounded-2xl border border-[color:var(--border-soft)] bg-[color:var(--surface-1)] p-4 backdrop-blur-xl transition-colors hover:bg-[color:var(--surface-2)]"
      >
        <span className="flex h-10 w-10 flex-none items-center justify-center rounded-xl bg-[color:var(--color-brand-500)]/[0.14] text-[color:var(--color-brand-800)]">
          <Bot size={18} strokeWidth={1.75} aria-hidden />
        </span>
        <div className="flex-1">
          <div className="text-[0.875rem] font-semibold text-[color:var(--text-primary)]">
            Importar com IA
          </div>
          <div className="mt-0.5 text-[0.75rem] text-[color:var(--text-secondary)]">
            Conecte o ChatGPT ou Claude e deixe a IA lançar seus dados por você.
          </div>
        </div>
        <ChevronRight
          size={18}
          strokeWidth={2}
          className="flex-none text-[color:var(--color-brand-800)]"
          aria-hidden
        />
      </Link>
    </PageShell>
  );
}
