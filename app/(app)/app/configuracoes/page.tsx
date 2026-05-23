import {
  Accessibility,
  Bell,
  ChevronRight,
  Crown,
  Globe,
  HelpCircle,
  KeyRound,
  LogOut,
  Palette,
  ScrollText,
  ShieldCheck,
  UserCog,
} from "lucide-react";
import type { Metadata } from "next";
import type { Route } from "next";
import Link from "next/link";

import { requireUser } from "@/presentation/http/middleware/cached-current-user";

import { PageShell } from "../_components/page-shell";

export const metadata: Metadata = { title: "Configurações" };

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
        href: "/app/configuracoes" as Route,
        label: "Idioma e região",
        description: "Em breve. Português (Brasil), moeda Real.",
        icon: Globe,
        disabled: true,
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

export default async function ConfiguracoesPage() {
  const user = await requireUser();

  const displayName = user.displayName ?? user.email.split("@")[0] ?? user.email;
  const initials = displayName.slice(0, 2).toUpperCase();

  return (
    <PageShell title="Configurações" description="Ajuste a plataforma do seu jeito.">
      <section className="flex items-center gap-4 rounded-2xl border border-[color:var(--border-soft)] bg-[color:var(--surface-1)] p-4 backdrop-blur-xl">
        <span className="flex h-12 w-12 items-center justify-center rounded-full bg-[linear-gradient(135deg,#f28e25,#ef7a1a)] text-sm font-bold text-white">
          {initials}
        </span>
        <div className="min-w-0 flex-1">
          <div className="truncate text-[0.9375rem] font-bold text-[color:var(--text-primary)]">
            {user.displayName ?? "Sem nome"}
          </div>
          <div className="truncate text-[0.75rem] text-[color:var(--text-secondary)]">
            {user.email}
          </div>
        </div>
      </section>

      {SECTIONS.map((section) => (
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
      ))}

      <form action="/api/auth/sign-out" method="post" className="mt-4">
        <button
          type="submit"
          className="focus-ring flex w-full items-center justify-center gap-2 rounded-2xl border border-[color:var(--semantic-negative)]/30 bg-[color:var(--semantic-negative)]/[0.08] px-4 py-3 text-[0.875rem] font-bold text-[color:var(--semantic-negative)] transition-colors hover:bg-[color:var(--semantic-negative)]/[0.14]"
        >
          <LogOut size={16} strokeWidth={1.75} aria-hidden />
          Sair da conta
        </button>
      </form>
    </PageShell>
  );
}
