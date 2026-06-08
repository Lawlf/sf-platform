"use client";

import {
  Accessibility,
  Bell,
  ChevronRight,
  Crown,
  FileUp,
  Files,
  Globe,
  HelpCircle,
  KeyRound,
  LayoutGrid,
  Palette,
  Plug,
  Scale,
  ScrollText,
  Search,
  SearchX,
  ShieldCheck,
  UserCog,
} from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { useState } from "react";

interface SettingItem {
  href: Route;
  label: string;
  description: string;
  icon: typeof Palette;
  disabled?: boolean;
}

interface SettingSection {
  title: string;
  items: SettingItem[];
}

const SECTIONS: SettingSection[] = [
  {
    title: "Conta",
    items: [
      {
        href: "/app/perfil/conta" as Route,
        label: "Dados pessoais",
        description: "Nome e email.",
        icon: UserCog,
      },
      {
        href: "/app/configuracoes/estilo" as Route,
        label: "Estilo com dinheiro",
        description: "Como você lida com dinheiro.",
        icon: Scale,
      },
      {
        href: "/app/configuracoes/planos" as Route,
        label: "Plano",
        description: "Veja seu plano atual.",
        icon: Crown,
      },
      {
        href: "/app/perfil/seguranca" as Route,
        label: "Segurança",
        description: "Sessões ativas e desativar conta.",
        icon: KeyRound,
      },
      {
        href: "/app/configuracoes/integracoes" as Route,
        label: "Integrações",
        description: "Conecte sua IA (Claude, ChatGPT) pra cuidar das finanças por conversa.",
        icon: Plug,
      },
      {
        href: "/app/configuracoes/importacao-de-dados" as Route,
        label: "Importação de dados",
        description: "Importe o extrato do banco ou deixe sua IA lançar por você.",
        icon: FileUp,
      },
      {
        href: "/app/configuracoes/documentos" as Route,
        label: "Meus documentos",
        description: "Contratos e comprovantes que você guardou.",
        icon: Files,
      },
    ],
  },
  {
    title: "Preferências",
    items: [
      {
        href: "/app/perfil/notificacoes" as Route,
        label: "Notificações",
        description: "Avisos push de vencimento, preços e resumo macro.",
        icon: Bell,
      },
      {
        href: "/app/configuracoes/acessos-rapidos" as Route,
        label: "Acessos rápidos",
        description: "Escolha os atalhos da sua home.",
        icon: LayoutGrid,
      },
      {
        href: "/app/configuracoes/idioma-regiao" as Route,
        label: "Idioma e região",
        description: "Português (Brasil). Escolha a moeda padrão dos seus lançamentos.",
        icon: Globe,
      },
    ],
  },
  {
    title: "Experiência",
    items: [
      {
        href: "/app/perfil/aparencia" as Route,
        label: "Aparência",
        description: "Tema claro, escuro ou seguir sistema.",
        icon: Palette,
      },
      {
        href: "/app/perfil/acessibilidade" as Route,
        label: "Acessibilidade",
        description: "Modo daltônico e leitura.",
        icon: Accessibility,
      },
    ],
  },
  {
    title: "Suporte",
    items: [
      {
        href: "/app/ajuda" as Route,
        label: "Ajuda e FAQ",
        description: "Tire dúvidas e veja respostas rápidas.",
        icon: HelpCircle,
      },
    ],
  },
  {
    title: "Documentos",
    items: [
      {
        href: "/termos" as Route,
        label: "Termos de uso",
        description: "Regras de uso da plataforma.",
        icon: ScrollText,
      },
      {
        href: "/privacidade" as Route,
        label: "Política de privacidade",
        description: "Como tratamos seus dados.",
        icon: ShieldCheck,
      },
    ],
  },
];

function normalize(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();
}

export function SettingsList() {
  const [query, setQuery] = useState("");

  const normalizedQuery = normalize(query.trim());
  const filteredSections = SECTIONS.map((section) => ({
    ...section,
    items: section.items.filter((item) =>
      normalize(`${item.label} ${item.description}`).includes(normalizedQuery),
    ),
  })).filter((section) => section.items.length > 0);

  return (
    <>
      <div className="relative">
        <Search
          size={18}
          strokeWidth={1.75}
          className="pointer-events-none absolute left-4 top-1/2 z-10 -translate-y-1/2 text-[color:var(--text-muted)]"
          aria-hidden
        />
        <input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Buscar nas configurações"
          className="focus-ring w-full rounded-2xl border border-[color:var(--border-soft)] bg-[color:var(--surface-1)] py-3 pl-11 pr-4 text-[0.875rem] text-[color:var(--text-primary)] placeholder:text-[color:var(--text-muted)] backdrop-blur-xl"
        />
      </div>

      {filteredSections.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-[color:var(--border-soft)] bg-[color:var(--surface-1)] px-6 py-12 text-center backdrop-blur-xl">
          <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[color:var(--color-brand-500)]/[0.14] text-[color:var(--color-brand-800)]">
            <SearchX size={24} strokeWidth={1.75} aria-hidden />
          </span>
          <div>
            <div className="text-[1rem] font-extrabold text-[color:var(--text-primary)]">
              Nada por aqui
            </div>
            <div className="mt-1 text-[0.8125rem] text-[color:var(--text-muted)]">
              Nenhuma configuração com &ldquo;{query.trim()}&rdquo;. Tenta outra palavra.
            </div>
          </div>
        </div>
      ) : (
        filteredSections.map((section) => (
          <section key={section.title} className="flex flex-col gap-2">
            <h2 className="px-1 text-[0.6875rem] font-semibold uppercase tracking-wide text-[color:var(--text-muted)]">
              {section.title}
            </h2>
            <div className="flex flex-col gap-2">
              {section.items.map((item) => {
                const Icon = item.icon;
                if (item.disabled) {
                  return (
                    <div
                      key={item.label}
                      aria-disabled
                      className="flex items-center gap-3 rounded-2xl border border-[color:var(--border-soft)] bg-[color:var(--surface-3)] p-4 opacity-60"
                    >
                      <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[color:var(--color-brand-500)]/[0.10] text-[color:var(--color-brand-800)]">
                        <Icon size={18} strokeWidth={1.75} aria-hidden />
                      </span>
                      <div className="flex-1">
                        <div className="text-[0.875rem] font-semibold text-[color:var(--text-primary)]">
                          {item.label}
                        </div>
                        <div className="mt-0.5 text-[0.75rem] text-[color:var(--text-muted)]">
                          {item.description}
                        </div>
                      </div>
                    </div>
                  );
                }
                return (
                  <Link
                    key={item.label}
                    href={item.href}
                    className="focus-ring flex items-center gap-3 rounded-2xl border border-[color:var(--border-soft)] bg-[color:var(--surface-1)] p-4 backdrop-blur-xl transition-colors hover:bg-[color:var(--surface-1)]"
                  >
                    <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[color:var(--color-brand-500)]/[0.14] text-[color:var(--color-brand-800)]">
                      <Icon size={18} strokeWidth={1.75} aria-hidden />
                    </span>
                    <div className="flex-1">
                      <div className="text-[0.875rem] font-semibold text-[color:var(--text-primary)]">
                        {item.label}
                      </div>
                      <div className="mt-0.5 text-[0.75rem] text-[color:var(--text-secondary)]">
                        {item.description}
                      </div>
                    </div>
                    <ChevronRight
                      size={18}
                      strokeWidth={2}
                      className="text-[color:var(--color-brand-800)]"
                      aria-hidden
                    />
                  </Link>
                );
              })}
            </div>
          </section>
        ))
      )}
    </>
  );
}
