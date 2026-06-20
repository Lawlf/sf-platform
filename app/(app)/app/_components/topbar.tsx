"use client";

import { Bell } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Fragment } from "react";

import { SimpleTooltip } from "@/app/components/ui/tooltip";

import { HideValuesToggle } from "./money-visibility/hide-values-toggle.client";

export interface TopbarProps {
  notificationCount?: number;
}

const SEGMENT_LABELS: Record<string, string> = {
  app: "Início",
  dividas: "Dívidas",
  nova: "Nova",
  financiamento: "Financiamento",
  emprestimo: "Empréstimo",
  cartao: "Cartão",
  "cheque-especial": "Cheque especial",
  patrimonio: "Patrimônio",
  novo: "Novo",
  simular: "Simular",
  compra: "Compra",
  conteudo: "Conteúdo",
  perfil: "Perfil",
  configuracoes: "Configurações",
  aparencia: "Aparência",
  seguranca: "Segurança",
  conta: "Conta",
  mercado: "Mercado",
  ajuda: "Ajuda",
  "falar-com-a-gente": "Falar com a gente",
  mensagens: "Suas mensagens",
  renda: "Renda",
  "linha-do-tempo": "Linha do tempo",
  comprei: "Comprei algo",
  antiga: "Dívida antiga",
  recorrente: "Conta recorrente",
};

// Títulos dos simuladores só valem quando o segmento anterior é "simular": vários
// slugs (financiamento, compra, meta, extra, reserva, margem) colidem com rotas
// de dívida/patrimônio e teriam o rótulo errado se entrassem no mapa global.
const SIM_SEGMENT_LABELS: Record<string, string> = {
  independencia: "Independência financeira",
  meta: "Meta de investimento",
  "juros-compostos": "Juros compostos",
  "onde-rende-mais": "Onde rende mais?",
  reserva: "Reserva de emergência",
  quitacao: "Projeção de quitação",
  extra: "Pagar extra",
  rotativo: "Custo do rotativo",
  estrategia: "Qual dívida pagar primeiro",
  "divida-vs-investir": "Quitar dívida ou investir?",
  financiamento: "Financiamento: Price ou SAC?",
  "salario-clt": "Salário líquido CLT",
  "decimo-terceiro": "13º salário líquido",
  ferias: "Férias líquidas",
  rescisao: "Rescisão",
  "clt-vs-pj": "CLT ou PJ?",
  "valor-hora": "Valor da sua hora",
  margem: "Preço e lucro por venda",
  ebitda: "Caixa da operação (EBITDA)",
  compra: "Vale a pena comprar?",
  "avista-parcelado": "À vista ou parcelado?",
  "conversor-juros": "Conversor de juros",
  "regra-de-tres": "Regra de três",
};

// Fallback para qualquer segmento sem rótulo: troca hífens por espaços e dá
// caixa-alta inicial, evitando que o slug cru (ex: "foo-bar") apareça na trilha.
function prettifySegment(seg: string): string {
  return seg
    .split("-")
    .map((w) => (w ? w[0]!.toUpperCase() + w.slice(1) : w))
    .join(" ");
}

function buildBreadcrumb(pathname: string): Array<{ label: string; href: string }> {
  const segments = pathname.split("/").filter(Boolean);
  if (segments[0] !== "app") return [];
  const rest = segments.slice(1);
  if (rest.length === 0) {
    return [{ label: "Início", href: "/app" }];
  }
  const items: Array<{ label: string; href: string }> = [];
  let acc = "/app";
  for (let i = 0; i < rest.length; i++) {
    const seg = rest[i];
    if (!seg) continue;
    acc += `/${seg}`;
    if ((seg === "nova" || seg === "novo") && i < rest.length - 1) continue;
    if (/^[0-9a-f-]{30,}$/i.test(seg)) continue;
    const inSimulator = rest[i - 1] === "simular";
    const label =
      (inSimulator ? SIM_SEGMENT_LABELS[seg] : undefined) ??
      SEGMENT_LABELS[seg] ??
      prettifySegment(seg);
    items.push({ label, href: acc });
  }
  return items;
}

export function Topbar({ notificationCount = 0 }: TopbarProps) {
  const pathname = usePathname();
  const crumbs = buildBreadcrumb(pathname);
  const hasNotifications = notificationCount > 0;
  const badgeLabel = notificationCount > 99 ? "99+" : String(notificationCount);

  return (
    <header className="hidden md:fixed md:left-[var(--sidebar-w)] md:right-0 md:top-0 md:z-20 md:flex md:items-center md:justify-between md:border-b md:border-[color:var(--border-soft)] md:bg-[color:var(--bg-app)]/80 md:px-8 md:py-3 md:backdrop-blur-md md:transition-[left] md:duration-200">
      <nav
        aria-label="Trilha"
        className="flex items-center gap-1 text-[0.75rem] font-semibold text-[color:var(--text-secondary)]"
      >
        {crumbs.map((c, i) => (
          <Fragment key={c.href}>
            {i > 0 ? <span className="text-[color:var(--text-muted)]">›</span> : null}
            {i === crumbs.length - 1 ? (
              <span className="text-[color:var(--text-primary)]">{c.label}</span>
            ) : (
              <Link href={c.href as Route} className="hover:text-[color:var(--color-brand-800)]">
                {c.label}
              </Link>
            )}
          </Fragment>
        ))}
      </nav>

      <div className="flex items-center gap-2">
        <HideValuesToggle />
        <SimpleTooltip label="Notificações" side="bottom">
          <Link
            href={"/app/notificacoes" as Route}
            aria-label={
              hasNotifications ? `${notificationCount} notificações não lidas` : "Notificações"
            }
            className="focus-ring relative flex h-9 w-9 items-center justify-center rounded-full bg-[color:var(--surface-1)] text-[color:var(--text-primary)] transition-colors hover:bg-[color:var(--surface-2)]"
          >
            <Bell size={16} strokeWidth={1.75} aria-hidden />
            {hasNotifications ? (
              <span
                aria-hidden
                className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-[color:var(--semantic-negative)] px-1 text-[0.5625rem] font-bold text-white shadow-[0_0_0_2px_var(--bg-app)]"
              >
                {badgeLabel}
              </span>
            ) : null}
          </Link>
        </SimpleTooltip>
      </div>
    </header>
  );
}
