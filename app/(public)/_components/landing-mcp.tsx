import {
  ArrowRight,
  KeyRound,
  ListChecks,
  MessageSquare,
  ShieldCheck,
  Undo2,
} from "lucide-react";
import Link from "next/link";

import { Button } from "@/app/components/ui/button";

import { RevealOnScroll } from "./reveal-on-scroll";

const bullets = [
  {
    icon: KeyRound,
    title: "Você escolhe o que liberar.",
    body: "Você concede só o que quiser, leitura ou ação, item por item, e nada além disso.",
  },
  {
    icon: ShieldCheck,
    title: "Confirmação no que pesa.",
    body: "Ações destrutivas e de alto valor pedem sua confirmação antes de acontecer. A IA não decide sozinha o que mexe de verdade.",
  },
  {
    icon: ListChecks,
    title: "Tudo auditado, dá pra desfazer.",
    body: "Cada coisa que o assistente faz fica registrada na Atividade recente, e o que é reversível você desfaz onde aplicável.",
  },
  {
    icon: Undo2,
    title: "Revogação na hora.",
    body: "Tirou o acesso em Integrações e a próxima chamada do assistente já é bloqueada. Sem espera.",
  },
];

const clients = [
  "Claude",
  "ChatGPT",
  "OpenClaw",
  "Cursor",
  "Gemini",
  "qualquer cliente MCP",
];

export function LandingMcp() {
  return (
    <section id="mcp" className="relative py-20 sm:py-28">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid gap-12 lg:grid-cols-[1fr_1.1fr] lg:items-start">
          <RevealOnScroll className="lg:sticky lg:top-24">
            <h2
              className="mt-5 text-4xl font-extrabold text-[color:var(--text-primary)] sm:text-5xl"
              style={{ letterSpacing: "-0.035em" }}
            >
              Conecte seu assistente de IA.
            </h2>
            <p className="mt-5 max-w-md text-base text-[color:var(--text-secondary)] sm:text-lg">
              Use o Claude, ChatGPT, OpenClaw ou qualquer assistente compatível
              (MCP) para cuidar das suas finanças por conversa: consultar saldo,
              lançar renda, registrar dívida, acompanhar metas.
            </p>

            <div className="mt-7">
              <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-[color:var(--text-muted)]">
                Funciona com
              </p>
              <ul className="mt-3 flex flex-wrap gap-2">
                {clients.map((client) => (
                  <li
                    key={client}
                    className="rounded-full border border-[color:var(--border-soft)] bg-[color:var(--surface-1)] px-3 py-1.5 text-[13px] font-semibold text-[color:var(--text-secondary)]"
                  >
                    {client}
                  </li>
                ))}
              </ul>
            </div>

            <div className="mt-8 flex flex-col items-start gap-3 sm:flex-row sm:items-center">
              <Button
                asChild
                variant="brand"
                size="lg"
                className="h-12 px-6 text-sm sf-lift"
              >
                <Link href="/cadastrar" className="gap-2">
                  Criar conta para conectar
                  <ArrowRight className="h-4 w-4" strokeWidth={2.5} />
                </Link>
              </Button>
              <Link
                href="/financas-com-ia"
                className="focus-ring text-sm font-semibold text-[color:var(--text-secondary)] underline-offset-4 hover:text-[color:var(--text-primary)] hover:underline"
              >
                Veja como funciona
              </Link>
              <Link
                href="/entrar"
                className="focus-ring text-sm font-semibold text-[color:var(--text-secondary)] underline-offset-4 hover:text-[color:var(--text-primary)] hover:underline"
              >
                Já tenho conta
              </Link>
            </div>
          </RevealOnScroll>

          <RevealOnScroll stagger as="ul" className="space-y-4">
            {bullets.map((bullet) => {
              const Icon = bullet.icon;
              return (
                <li
                  key={bullet.title}
                  className="flex gap-4 rounded-[1.25rem] border border-[color:var(--border-soft)] bg-[color:var(--surface-1)] p-5 backdrop-blur-xl sm:p-6"
                  style={{ boxShadow: "var(--shadow-glass-strong)" }}
                >
                  <span
                    className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl text-white shadow-lg"
                    style={{
                      background: "linear-gradient(135deg, #f28e25, #d96813)",
                    }}
                  >
                    <Icon className="h-5 w-5" strokeWidth={2} aria-hidden />
                  </span>
                  <div className="flex-1">
                    <h3
                      className="text-[17px] font-extrabold text-[color:var(--text-primary)]"
                      style={{ letterSpacing: "-0.02em" }}
                    >
                      {bullet.title}
                    </h3>
                    <p className="mt-2 text-[14.5px] leading-relaxed text-[color:var(--text-secondary)]">
                      {bullet.body}
                    </p>
                  </div>
                </li>
              );
            })}

            <li className="flex items-center gap-3 rounded-[1.25rem] border border-[color:var(--border-soft)] bg-[color:var(--surface-2)] px-5 py-4">
              <MessageSquare
                className="h-5 w-5 shrink-0 text-[color:var(--color-brand-700)]"
                strokeWidth={2}
                aria-hidden
              />
              <p className="text-[13.5px] leading-relaxed text-[color:var(--text-secondary)]">
                Padrão aberto: é o mesmo Model Context Protocol que outros apps
                usam. Você conecta o assistente que já tem, sem ferramenta nova.
              </p>
            </li>
          </RevealOnScroll>
        </div>
      </div>
    </section>
  );
}
