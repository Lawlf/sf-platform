import { ChevronDown, Eye, Lock, Pencil, ShieldCheck } from "lucide-react";
import type { Metadata } from "next";
import type { Route } from "next";
import Link from "next/link";

import { MCP_FREE_MONTHLY_LIMIT } from "@/domain/mcp/constants";
import { MCP_SCOPE_DESCRIPTIONS, MCP_SHIPPED_SCOPES } from "@/domain/mcp/scopes";
import { mcpServerUrl } from "@/presentation/http/mcp/mcp-endpoint";
import { requireUser } from "@/presentation/http/middleware/cached-current-user";

import { PageShell } from "../../../_components/page-shell";

import { CopyUrl } from "./copy-url.client";

export const metadata: Metadata = { title: "Como conectar" };

const CARD =
  "flex flex-col gap-3 rounded-2xl border border-[color:var(--border-soft)] bg-[color:var(--surface-1)] p-4 backdrop-blur-xl";

const CLIENTS: { name: string; steps: string[] }[] = [
  {
    name: "Claude",
    steps: [
      "Configurações → Conectores → adicionar conector personalizado.",
      "Cole a URL e inicie. Autorize na tela do Sabor e escolha os escopos.",
    ],
  },
  {
    name: "ChatGPT",
    steps: [
      "Em conectores compatíveis com MCP, adicione um conector por URL.",
      "Cole a URL, inicie e autorize na tela do Sabor.",
    ],
  },
  {
    name: "OpenClaw, Cursor, Gemini e outros",
    steps: [
      "Adicione um servidor MCP remoto (Streamable HTTP) com a URL acima.",
      "Ao conectar, você é levado à tela de autorização do Sabor.",
    ],
  },
];

const READ = MCP_SHIPPED_SCOPES.filter((s) => s.endsWith(":read"));
const WRITE = MCP_SHIPPED_SCOPES.filter((s) => s.endsWith(":write") || s.endsWith(":delete"));

export default async function GuiaConexaoPage() {
  await requireUser();
  const url = mcpServerUrl();

  return (
    <PageShell
      title="Como conectar"
      description="Conecte seu assistente de IA via MCP e cuide das finanças por conversa: consultar saldo, lançar renda, registrar dívida, acompanhar metas."
      backHref={"/app/configuracoes/integracoes" as Route}
    >
      <section className={CARD}>
        <h2 className="text-[0.9375rem] font-bold text-[color:var(--text-primary)]">
          URL do conector
        </h2>
        <CopyUrl url={url} />
        <ol className="flex flex-col gap-2 border-t border-[color:var(--border-soft)] pt-3">
          {[
            "No seu assistente, adicione um conector MCP por URL.",
            "Cole a URL acima.",
            "Autorize e escolha quais permissões conceder.",
          ].map((step, i) => (
            <li
              key={i}
              className="flex gap-2.5 text-[0.8125rem] leading-relaxed text-[color:var(--text-secondary)]"
            >
              <span className="flex h-5 w-5 flex-none items-center justify-center rounded-full bg-[color:var(--color-brand-500)]/[0.14] text-[0.6875rem] font-bold text-[color:var(--color-brand-800)]">
                {i + 1}
              </span>
              <span>{step}</span>
            </li>
          ))}
        </ol>
      </section>

      <details className="group overflow-hidden rounded-2xl border border-[color:var(--border-soft)] bg-[color:var(--surface-1)] backdrop-blur-xl">
        <summary className="focus-ring flex cursor-pointer list-none items-center justify-between gap-2 p-4 text-[0.875rem] font-bold text-[color:var(--text-primary)] [&::-webkit-details-marker]:hidden">
          Instruções por cliente
          <ChevronDown
            size={16}
            strokeWidth={2}
            className="flex-none text-[color:var(--text-muted)] transition-transform group-open:rotate-180"
            aria-hidden
          />
        </summary>
        <div className="flex flex-col gap-4 border-t border-[color:var(--border-soft)] p-4">
          {CLIENTS.map((client) => (
            <div key={client.name} className="flex flex-col gap-1.5">
              <div className="text-[0.8125rem] font-bold text-[color:var(--text-primary)]">
                {client.name}
              </div>
              <ol className="flex flex-col gap-1">
                {client.steps.map((step, i) => (
                  <li
                    key={i}
                    className="text-[0.8125rem] leading-relaxed text-[color:var(--text-secondary)]"
                  >
                    {step}
                  </li>
                ))}
              </ol>
            </div>
          ))}
        </div>
      </details>

      <details className="group overflow-hidden rounded-2xl border border-[color:var(--border-soft)] bg-[color:var(--surface-1)] backdrop-blur-xl">
        <summary className="focus-ring flex cursor-pointer list-none items-center justify-between gap-2 p-4 text-[0.875rem] font-bold text-[color:var(--text-primary)] [&::-webkit-details-marker]:hidden">
          Permissões disponíveis
          <ChevronDown
            size={16}
            strokeWidth={2}
            className="flex-none text-[color:var(--text-muted)] transition-transform group-open:rotate-180"
            aria-hidden
          />
        </summary>
        <div className="flex flex-col gap-4 border-t border-[color:var(--border-soft)] p-4">
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center gap-1.5 text-[0.8125rem] font-bold text-[color:var(--text-primary)]">
              <Eye size={14} strokeWidth={1.75} aria-hidden />
              Leitura
            </div>
            <ul className="flex flex-col gap-1 text-[0.8125rem] text-[color:var(--text-secondary)]">
              {READ.map((scope) => (
                <li key={scope}>{MCP_SCOPE_DESCRIPTIONS[scope]}</li>
              ))}
            </ul>
          </div>
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center gap-1.5 text-[0.8125rem] font-bold text-[color:var(--text-primary)]">
              <Pencil size={14} strokeWidth={1.75} aria-hidden />
              Escrita e exclusão
            </div>
            <ul className="flex flex-col gap-1 text-[0.8125rem] text-[color:var(--text-secondary)]">
              {WRITE.map((scope) => (
                <li key={scope}>{MCP_SCOPE_DESCRIPTIONS[scope]}</li>
              ))}
            </ul>
          </div>
          <p className="text-[0.75rem] text-[color:var(--text-muted)]">
            Você concede só o que quiser e pode revogar a qualquer momento.
          </p>
        </div>
      </details>

      <section className={CARD}>
        <h2 className="flex items-center gap-1.5 text-[0.9375rem] font-bold text-[color:var(--text-primary)]">
          <ShieldCheck size={16} strokeWidth={1.75} aria-hidden />
          Segurança
        </h2>
        <ul className="flex flex-col gap-2 border-t border-[color:var(--border-soft)] pt-3 text-[0.8125rem] leading-relaxed text-[color:var(--text-secondary)]">
          <li>OAuth com escopos granulares: o assistente só acessa o que você liberou.</li>
          <li>Exclusões e operações acima de R$ 5.000 exigem sua confirmação.</li>
          <li>Tudo fica registrado em Atividade e dá para desfazer onde aplicável.</li>
          <li>Você revoga o acesso na hora; a próxima chamada já é bloqueada.</li>
        </ul>
      </section>

      <section className="flex items-center justify-between gap-3 rounded-2xl border border-[color:var(--border-soft)] bg-[color:var(--surface-1)] p-4 backdrop-blur-xl">
        <p className="min-w-0 flex-1 text-[0.8125rem] text-[color:var(--text-secondary)]">
          <Lock size={13} strokeWidth={1.75} className="mr-1 inline align-[-2px]" aria-hidden />
          Plano gratuito: até {MCP_FREE_MONTHLY_LIMIT} chamadas por mês.
        </p>
        <Link
          href={"/app/configuracoes/planos" as Route}
          className="focus-ring inline-flex flex-none items-center rounded-xl border border-[color:var(--color-brand-500)]/40 bg-[color:var(--color-brand-500)]/[0.14] px-3 py-2 text-[0.75rem] font-bold text-[color:var(--color-brand-800)] transition-colors hover:bg-[color:var(--color-brand-500)]/[0.22]"
        >
          Ver planos
        </Link>
      </section>
    </PageShell>
  );
}
