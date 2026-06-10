import { Bot, FileUp } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";

export function HomeBringDataCard() {
  return (
    <section className="flex flex-col gap-3 rounded-2xl border border-[color:var(--border-soft)] bg-[color:var(--surface-1)] p-4 backdrop-blur-xl">
      <div>
        <h2 className="text-[0.9375rem] font-bold text-[color:var(--text-primary)]">
          Já tem essas contas registradas em outro lugar?
        </h2>
        <p className="mt-1 text-[0.8125rem] text-[color:var(--text-secondary)]">
          Em vez de digitar tudo na mão, traga seus dados de uma vez. A gente lê o extrato que você
          baixou do banco e preenche renda e patrimônio pra você conferir.
        </p>
      </div>
      <div className="flex flex-col gap-2 sm:flex-row">
        <Link
          href={"/app/configuracoes/importacao-de-dados/extrato" as Route}
          className="focus-ring flex flex-1 items-center justify-center gap-2 rounded-xl bg-[color:var(--color-brand-800)] px-4 py-2.5 text-[0.8125rem] font-bold text-white transition-opacity hover:opacity-90"
        >
          <FileUp size={16} strokeWidth={2} aria-hidden />
          Importar extrato
        </Link>
        <Link
          href={"/app/configuracoes/integracoes" as Route}
          className="focus-ring flex flex-1 items-center justify-center gap-2 rounded-xl border border-[color:var(--border-soft)] px-4 py-2.5 text-[0.8125rem] font-semibold text-[color:var(--text-primary)] transition-colors hover:bg-[color:var(--surface-2)]"
        >
          <Bot size={16} strokeWidth={2} aria-hidden />
          Deixar a IA lançar
        </Link>
      </div>
      <p className="text-[0.75rem] text-[color:var(--text-muted)]">
        Você confere tudo antes de salvar. Nada entra sem você aprovar.
      </p>
    </section>
  );
}
