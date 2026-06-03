import { CheckCircle2, Eye, History, Lock, Pencil, ShieldCheck } from "lucide-react";
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

const CLIENTS: { name: string; steps: string[] }[] = [
  {
    name: "Claude (claude.ai e Claude Desktop)",
    steps: [
      "Abra Configurações e vá em Conectores.",
      "Escolha adicionar um conector personalizado e cole a URL acima.",
      "Autorize: a tela do Sabor Financeiro abre pedindo seu login e a escolha dos escopos.",
      "Aprove os escopos que quiser conceder e conclua.",
    ],
  },
  {
    name: "ChatGPT",
    steps: [
      "Nas configurações de conectores compatíveis com MCP, adicione um conector por URL.",
      "Cole a URL acima e inicie a conexão.",
      "Autorize na tela do Sabor Financeiro e escolha os escopos.",
    ],
  },
  {
    name: "OpenClaw",
    steps: [
      "Adicione um servidor MCP remoto apontando para a URL acima.",
      "Inicie a conexão e autorize na tela do Sabor Financeiro.",
      "Escolha os escopos que deseja liberar.",
    ],
  },
  {
    name: "Qualquer cliente MCP (Cursor, Gemini e outros)",
    steps: [
      "Procure a opção de adicionar um servidor ou conector MCP remoto.",
      "Use a URL acima como endereço do servidor (Streamable HTTP).",
      "Ao conectar, o cliente é redirecionado para a tela de autorização do Sabor Financeiro, onde você faz login e escolhe os escopos.",
    ],
  },
];

const SCOPE_CARD =
  "flex flex-col gap-3 rounded-2xl border border-[color:var(--border-soft)] bg-[color:var(--surface-1)] p-4 backdrop-blur-xl";

export default async function GuiaConexaoPage() {
  await requireUser();
  const url = mcpServerUrl();

  const readScopes = MCP_SHIPPED_SCOPES.filter((s) => s.endsWith(":read"));
  const writeScopes = MCP_SHIPPED_SCOPES.filter(
    (s) => s.endsWith(":write") || s.endsWith(":delete"),
  );

  return (
    <PageShell
      title="Como conectar"
      description="Conecte seu assistente de IA ao Sabor Financeiro via MCP e cuide das suas finanças por conversa."
      backHref={"/app/configuracoes/integracoes" as Route}
    >
      <section className={SCOPE_CARD}>
        <h2 className="text-[0.9375rem] font-bold text-[color:var(--text-primary)]">O que é</h2>
        <p className="text-[0.8125rem] leading-relaxed text-[color:var(--text-secondary)]">
          O Sabor Financeiro expõe um conector MCP (Model Context Protocol, um padrão aberto). Você
          conecta o assistente de IA que já usa (Claude, ChatGPT, OpenClaw, Cursor, Gemini ou
          qualquer cliente compatível) e passa a cuidar das finanças por conversa: consultar saldo,
          lançar renda, registrar dívida e acompanhar metas.
        </p>
        <p className="text-[0.8125rem] leading-relaxed text-[color:var(--text-secondary)]">
          O conector trabalha sobre a sua visão macro (patrimônio, dívidas, renda mensal e metas),
          não sobre transações individuais do dia a dia.
        </p>
      </section>

      <section className={SCOPE_CARD}>
        <h2 className="text-[0.9375rem] font-bold text-[color:var(--text-primary)]">
          URL do conector
        </h2>
        <p className="text-[0.8125rem] leading-relaxed text-[color:var(--text-secondary)]">
          Copie esta URL e cole no campo de conector MCP do seu assistente.
        </p>
        <CopyUrl url={url} />
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-[0.8125rem] font-bold tracking-wide text-[color:var(--text-secondary)] uppercase">
          Passo a passo por cliente
        </h2>
        {CLIENTS.map((client) => (
          <article key={client.name} className={SCOPE_CARD}>
            <div className="text-[0.9375rem] font-bold text-[color:var(--text-primary)]">
              {client.name}
            </div>
            <ol className="flex flex-col gap-2 border-t border-[color:var(--border-soft)] pt-3">
              {client.steps.map((step, i) => (
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
          </article>
        ))}
        <p className="text-[0.75rem] leading-relaxed text-[color:var(--text-muted)]">
          Em todos os clientes, ao iniciar a conexão você é levado para a tela de autorização do
          Sabor Financeiro: faça login, escolha quais permissões conceder e aprove. Só a partir daí
          o assistente recebe acesso.
        </p>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-[0.8125rem] font-bold tracking-wide text-[color:var(--text-secondary)] uppercase">
          Permissões (escopos)
        </h2>
        <p className="text-[0.8125rem] leading-relaxed text-[color:var(--text-secondary)]">
          Na autorização você concede apenas os escopos que quiser. Pode revogar o acesso a qualquer
          momento em Integrações.
        </p>
        <article className={SCOPE_CARD}>
          <div className="flex items-center gap-1.5 text-[0.875rem] font-bold text-[color:var(--text-primary)]">
            <Eye size={15} strokeWidth={1.75} aria-hidden />
            Leitura
          </div>
          <ul className="flex flex-col gap-1.5 border-t border-[color:var(--border-soft)] pt-3">
            {readScopes.map((scope) => (
              <li
                key={scope}
                className="text-[0.8125rem] leading-relaxed text-[color:var(--text-secondary)]"
              >
                {MCP_SCOPE_DESCRIPTIONS[scope]}
              </li>
            ))}
          </ul>
        </article>
        <article className={SCOPE_CARD}>
          <div className="flex items-center gap-1.5 text-[0.875rem] font-bold text-[color:var(--text-primary)]">
            <Pencil size={15} strokeWidth={1.75} aria-hidden />
            Escrita e exclusão
          </div>
          <ul className="flex flex-col gap-1.5 border-t border-[color:var(--border-soft)] pt-3">
            {writeScopes.map((scope) => (
              <li
                key={scope}
                className="text-[0.8125rem] leading-relaxed text-[color:var(--text-secondary)]"
              >
                {MCP_SCOPE_DESCRIPTIONS[scope]}
              </li>
            ))}
          </ul>
        </article>
      </section>

      <section className={SCOPE_CARD}>
        <h2 className="flex items-center gap-1.5 text-[0.9375rem] font-bold text-[color:var(--text-primary)]">
          <ShieldCheck size={16} strokeWidth={1.75} aria-hidden />
          Segurança
        </h2>
        <ul className="flex flex-col gap-2.5 border-t border-[color:var(--border-soft)] pt-3">
          <li className="flex gap-2.5 text-[0.8125rem] leading-relaxed text-[color:var(--text-secondary)]">
            <Lock
              size={15}
              strokeWidth={1.75}
              aria-hidden
              className="mt-0.5 flex-none text-[color:var(--color-brand-800)]"
            />
            <span>
              A conexão usa OAuth com escopos granulares: o assistente só acessa o que você liberou.
            </span>
          </li>
          <li className="flex gap-2.5 text-[0.8125rem] leading-relaxed text-[color:var(--text-secondary)]">
            <CheckCircle2
              size={15}
              strokeWidth={1.75}
              aria-hidden
              className="mt-0.5 flex-none text-[color:var(--color-brand-800)]"
            />
            <span>
              Ações de exclusão e de alto valor (a partir de R$ 5.000) exigem a sua confirmação antes
              de serem aplicadas.
            </span>
          </li>
          <li className="flex gap-2.5 text-[0.8125rem] leading-relaxed text-[color:var(--text-secondary)]">
            <History
              size={15}
              strokeWidth={1.75}
              aria-hidden
              className="mt-0.5 flex-none text-[color:var(--color-brand-800)]"
            />
            <span>
              Tudo que o assistente faz fica registrado em &quot;Atividade recente&quot; e pode ser
              desfeito onde aplicável.
            </span>
          </li>
          <li className="flex gap-2.5 text-[0.8125rem] leading-relaxed text-[color:var(--text-secondary)]">
            <ShieldCheck
              size={15}
              strokeWidth={1.75}
              aria-hidden
              className="mt-0.5 flex-none text-[color:var(--color-brand-800)]"
            />
            <span>
              Você revoga o acesso na hora em Integrações; a próxima chamada do assistente já é
              bloqueada.
            </span>
          </li>
        </ul>
      </section>

      <section className={SCOPE_CARD}>
        <h2 className="text-[0.9375rem] font-bold text-[color:var(--text-primary)]">
          Limite do plano gratuito
        </h2>
        <p className="text-[0.8125rem] leading-relaxed text-[color:var(--text-secondary)]">
          No plano gratuito, o conector permite até {MCP_FREE_MONTHLY_LIMIT} chamadas por mês. Acima
          disso, assine o Pro para uso contínuo.
        </p>
        <Link
          href={"/app/configuracoes/planos" as Route}
          className="focus-ring inline-flex w-fit items-center rounded-xl border border-[color:var(--color-brand-500)]/40 bg-[color:var(--color-brand-500)]/[0.14] px-3 py-2 text-[0.8125rem] font-bold text-[color:var(--color-brand-800)] transition-colors hover:bg-[color:var(--color-brand-500)]/[0.22]"
        >
          Ver planos
        </Link>
      </section>
    </PageShell>
  );
}
