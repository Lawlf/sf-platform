"use client";

import {
  Bell,
  Building2,
  ChevronsUpDown,
  Coins,
  FileText,
  HomeIcon,
  LineChart,
  LogOut,
  MessageCircle,
  PanelRightClose,
  PanelRightOpen,
  Plus,
  PlusCircle,
  Search,
  Settings,
  SlidersHorizontal,
  Target,
  TrendingUp,
  UserRound,
  Wallet,
} from "lucide-react";
import type { Route } from "next";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";

import { Button } from "@/app/components/ui/button";
import { SimpleTooltip } from "@/app/components/ui/tooltip";

import type { SerializedProfile } from "../_actions/profile-queries";
import { switchProfileAction } from "../_actions/switch-profile.action";
import { ImmersiveSidebar } from "../conteudo/_components/immersive-sidebar";

import { openSearch } from "./command-palette.client";
import { CreateProfileSheet } from "./create-profile-sheet.client";
import { InstallSidebarNudge } from "./pwa/install-sidebar-nudge.client";
import { UserAvatar } from "./user-avatar";

interface NavItem {
  href: Route;
  label: string;
  icon: typeof HomeIcon;
  exact?: boolean;
  badge?: number;
}

interface NavGroup {
  label: string;
  items: NavItem[];
}

function buildHomeGroup(notificationCount: number): NavGroup {
  return {
    label: "",
    items: [
      { href: "/app" as Route, label: "Início", icon: HomeIcon, exact: true },
      {
        href: "/app/notificacoes" as Route,
        label: "Notificações",
        icon: Bell,
        badge: notificationCount,
      },
    ],
  };
}

const TOOLS_GROUP: NavGroup = {
  label: "Ferramentas",
  items: [
    { href: "/app/linha-do-tempo" as Route, label: "Linha do tempo", icon: LineChart },
    { href: "/app/simular" as Route, label: "Simular", icon: PlusCircle },
  ],
};

const PF_FINANCE_GROUP: NavGroup = {
  label: "Minhas finanças",
  items: [
    { href: "/app/lancar" as Route, label: "Registrar gasto", icon: Plus },
    { href: "/app/renda" as Route, label: "Renda", icon: TrendingUp },
    { href: "/app/dividas" as Route, label: "Dívidas", icon: Wallet },
    { href: "/app/patrimonio" as Route, label: "Patrimônio", icon: Coins },
    { href: "/app/metas" as Route, label: "Metas", icon: Target },
  ],
};

const PJ_FINANCE_GROUP: NavGroup = {
  label: "Minha empresa",
  items: [
    { href: "/app/lancar" as Route, label: "Registrar gasto", icon: Plus },
    { href: "/app/renda" as Route, label: "Faturamento", icon: TrendingUp },
    { href: "/app/mei" as Route, label: "Minha retirada", icon: Building2 },
    { href: "/app/dividas" as Route, label: "Dívidas", icon: Wallet },
    { href: "/app/metas" as Route, label: "Metas", icon: Target },
  ],
};

const LAR_GROUP: NavGroup = {
  label: "Lar",
  items: [
    { href: "/app/lar" as Route, label: "Visão geral", icon: HomeIcon, exact: true },
    { href: "/app/lar/metas" as Route, label: "Metas da família", icon: Target },
  ],
};

function buildNavGroups(
  activeIsPj: boolean,
  hasHousehold: boolean,
  notificationCount: number,
): NavGroup[] {
  const groups: NavGroup[] = [
    buildHomeGroup(notificationCount),
    activeIsPj ? PJ_FINANCE_GROUP : PF_FINANCE_GROUP,
    TOOLS_GROUP,
  ];
  if (hasHousehold) groups.push(LAR_GROUP);
  return groups;
}

function isActive(pathname: string, item: NavItem): boolean {
  if (item.exact) return pathname === item.href;
  return pathname === item.href || pathname.startsWith(`${item.href}/`);
}

const STORAGE_KEY = "sf_sidebar_collapsed";

export interface SidebarProps {
  displayName: string;
  avatarUrl?: string | null | undefined;
  isPro: boolean;
  profiles: SerializedProfile[];
  activeProfileId: string;
  hasHousehold: boolean;
  notificationCount: number;
}

export function Sidebar({ displayName, avatarUrl, isPro, profiles, activeProfileId, hasHousehold, notificationCount }: SidebarProps) {
  const pathname = usePathname();
  const isOnConteudoImmersive =
    pathname.startsWith("/app/conteudo/trilha") ||
    pathname.startsWith("/app/conteudo/livros") ||
    pathname.startsWith("/app/conteudo/ritmo");
  const [collapsed, setCollapsed] = useState(false);
  const activeProfile = profiles.find((p) => p.id === activeProfileId) ?? profiles[0];
  const activeIsPj = activeProfile?.type === "PJ_MEI";
  const navGroups = buildNavGroups(activeIsPj, hasHousehold, notificationCount);

  useEffect(() => {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    const next = stored === "1";
    setCollapsed(next);
    document.documentElement.dataset.sidebar = next ? "collapsed" : "expanded";
  }, []);

  function toggle() {
    setCollapsed((prev) => {
      const next = !prev;
      window.localStorage.setItem(STORAGE_KEY, next ? "1" : "0");
      document.documentElement.dataset.sidebar = next ? "collapsed" : "expanded";
      return next;
    });
  }

  const toggleButton = (
    <SimpleTooltip
      label={collapsed ? "Expandir menu" : "Minimizar menu"}
      side={collapsed ? "right" : "bottom"}
    >
      <button
        type="button"
        onClick={toggle}
        aria-label={collapsed ? "Expandir menu" : "Minimizar menu"}
        className="focus-ring flex h-7 w-7 items-center justify-center rounded-md text-[color:var(--text-secondary)] transition-colors hover:bg-[color:var(--surface-2)] hover:text-[color:var(--text-primary)]"
      >
        {collapsed ? (
          <PanelRightClose size={16} strokeWidth={1.75} aria-hidden />
        ) : (
          <PanelRightOpen size={16} strokeWidth={1.75} aria-hidden />
        )}
      </button>
    </SimpleTooltip>
  );

  return (
    <aside
      aria-label="Navegação principal"
      data-collapsed={collapsed ? "true" : "false"}
      className="hidden md:fixed md:inset-y-0 md:left-0 md:z-30 md:flex md:w-[var(--sidebar-w)] md:flex-col md:border-r md:border-[color:var(--border-soft)] md:bg-[color:var(--surface-3)] md:px-3 md:py-6 md:[backdrop-filter:blur(24px)_saturate(180%)] md:transition-[width] md:duration-200"
    >
      <div
        className={`mb-6 flex items-center ${collapsed ? "flex-col gap-3" : "justify-between gap-2 px-2"}`}
      >
        <Link
          href={"/app" as Route}
          aria-label="Sabor Financeiro"
          className="flex items-center gap-2"
        >
          <Image
            src="/icons/icon-512.png"
            alt=""
            width={32}
            height={32}
            priority
            className="h-8 w-8 flex-none rounded-full shadow-[0_2px_8px_rgba(239,122,26,0.35)]"
          />
          {!collapsed ? (
            <span className="text-[0.875rem] font-bold tracking-tight text-[color:var(--color-brand-800)]">
              Sabor Financeiro
            </span>
          ) : null}
        </Link>
        {toggleButton}
      </div>

      <div className="mb-5">
        {collapsed ? (
          <SimpleTooltip label="Pesquisar" side="right">
            <button
              type="button"
              onClick={openSearch}
              aria-label="Pesquisar"
              className="focus-ring flex w-full items-center justify-center rounded-lg px-2 py-2.5 text-[color:var(--text-secondary)] transition-colors hover:bg-[color:var(--color-brand-500)]/[0.08] hover:text-[color:var(--text-primary)]"
            >
              <Search size={18} strokeWidth={1.75} aria-hidden />
            </button>
          </SimpleTooltip>
        ) : (
          <button
            type="button"
            onClick={openSearch}
            className="focus-ring flex w-full items-center gap-2 rounded-xl border border-[color:var(--border-soft)] bg-[color:var(--surface-1)] px-3 py-2 text-left transition-colors hover:border-[color:var(--color-brand-500)]/40"
          >
            <Search
              size={15}
              strokeWidth={1.75}
              aria-hidden
              className="flex-none text-[color:var(--text-muted)]"
            />
            <span className="flex-1 text-[0.8125rem] text-[color:var(--text-muted)]">Pesquisar</span>
            <kbd className="flex-none rounded border border-[color:var(--border-strong)] bg-[color:var(--surface-2)] px-1.5 py-px text-[0.625rem] font-semibold text-[color:var(--text-muted)]">
              Ctrl K
            </kbd>
          </button>
        )}
      </div>

      <div className="-mr-1 flex min-h-0 flex-1 flex-col overflow-y-auto pr-1 [scrollbar-width:thin]">
        {isOnConteudoImmersive && !collapsed ? (
          <ImmersiveSidebar activeTrilha={null} />
        ) : (
          <nav className="flex flex-col gap-5">
            {navGroups.map((group) => (
            <div key={group.label || "main"} className="flex flex-col gap-1">
              {!collapsed && group.label ? (
                <span className="px-3 pb-1 text-[0.625rem] font-bold uppercase tracking-[0.1em] text-[color:var(--text-muted)]">
                  {group.label}
                </span>
              ) : null}
              {group.items.map((item) => {
                const Icon = item.icon;
                const active = isActive(pathname, item);
                const cls = active
                  ? "bg-[color:var(--color-brand-500)]/[0.14] text-[color:var(--color-brand-800)]"
                  : "text-[color:var(--text-primary)] hover:bg-[color:var(--color-brand-500)]/[0.08]";
                const link = (
                  <Link
                    href={item.href}
                    aria-current={active ? "page" : undefined}
                    aria-label={item.label}
                    className={`focus-ring relative flex items-center rounded-lg text-[0.875rem] font-medium transition-colors ${cls} ${
                      collapsed ? "justify-center px-2 py-2.5" : "gap-2.5 px-3 py-2.5"
                    }`}
                  >
                    <Icon size={18} strokeWidth={active ? 2.25 : 1.75} aria-hidden />
                    {!collapsed ? <span className="flex-1">{item.label}</span> : null}
                    {!collapsed && item.badge ? (
                      <span className="flex-none rounded-full bg-[color:var(--semantic-negative)] px-1.5 py-px text-[0.625rem] font-bold text-white">
                        {item.badge > 99 ? "99+" : item.badge}
                      </span>
                    ) : null}
                    {collapsed && item.badge ? (
                      <span
                        aria-hidden
                        className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-[color:var(--semantic-negative)] ring-2 ring-[color:var(--surface-3)]"
                      />
                    ) : null}
                  </Link>
                );
                return collapsed ? (
                  <SimpleTooltip key={item.href} label={item.label} side="right">
                    {link}
                  </SimpleTooltip>
                ) : (
                  <div key={item.href}>{link}</div>
                );
              })}
            </div>
          ))}
          </nav>
        )}
      </div>

      <InstallSidebarNudge collapsed={collapsed} />

      <AccountZone
        displayName={displayName}
        avatarUrl={avatarUrl}
        isPro={isPro}
        collapsed={collapsed}
        profiles={profiles}
        activeProfileId={activeProfileId}
      />
    </aside>
  );
}

function profileSubtitle(profile: SerializedProfile): string {
  if (profile.type === "PF") return "Pessoal";
  if (profile.taxClassification === "mei") return "Empresa · MEI";
  return "Empresa";
}

function AccountZone({
  displayName,
  avatarUrl,
  isPro,
  collapsed,
  profiles,
  activeProfileId,
}: {
  displayName: string;
  avatarUrl?: string | null | undefined;
  isPro: boolean;
  collapsed: boolean;
  profiles: SerializedProfile[];
  activeProfileId: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const ref = useRef<HTMLDivElement>(null);

  const activeProfile = profiles.find((p) => p.id === activeProfileId) ?? profiles[0];

  function handleSwitch(profileId: string) {
    startTransition(async () => {
      await switchProfileAction({ profileId });
      setOpen(false);
      router.refresh();
    });
  }

  useEffect(() => {
    if (!open) return;
    function onPointer(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const avatar = (
    <UserAvatar
      dataUrl={avatarUrl}
      displayName={displayName}
      className="flex h-8 w-8 flex-none items-center justify-center rounded-lg bg-[linear-gradient(135deg,#f28e25,#ef7a1a)] text-[0.6875rem] font-bold text-white shadow-[0_2px_8px_rgba(239,122,26,0.35)]"
    />
  );

  const collapsedCard = (
    <button
      type="button"
      onClick={() => setOpen((v) => !v)}
      aria-haspopup="menu"
      aria-expanded={open}
      aria-label="Conta"
      className="focus-ring flex w-full items-center justify-center rounded-xl border border-[color:var(--border-soft)] bg-[color:var(--surface-1)] p-1.5 shadow-[0_8px_20px_-12px_rgba(31,29,28,0.25)] transition-colors hover:border-[color:var(--color-brand-500)]/40"
    >
      {avatar}
    </button>
  );

  const expandedCard = (
    <button
      type="button"
      onClick={() => setOpen((v) => !v)}
      aria-haspopup="menu"
      aria-expanded={open}
      aria-label="Conta e configurações"
      className="focus-ring flex w-full items-center gap-2.5 rounded-xl border border-[color:var(--border-soft)] bg-[color:var(--surface-1)] p-2 shadow-[0_8px_20px_-12px_rgba(31,29,28,0.25)] transition-colors hover:border-[color:var(--color-brand-500)]/40"
    >
      {avatar}
      <span className="flex min-w-0 flex-1 flex-col items-start">
        <span className="flex w-full items-center gap-1.5">
          <span className="truncate text-[0.8125rem] font-semibold text-[color:var(--text-primary)]">
            {displayName}
          </span>
          {isPro ? (
            <span className="flex-none rounded bg-[color:var(--color-brand-500)]/[0.16] px-1.5 py-px text-[0.5625rem] font-bold uppercase tracking-wide text-[color:var(--color-brand-800)]">
              Pro
            </span>
          ) : null}
        </span>
        <span className="text-[0.6875rem] text-[color:var(--text-muted)]">
          {activeProfile ? profileSubtitle(activeProfile) : "Conta pessoal"}
        </span>
      </span>
      <ChevronsUpDown
        size={15}
        strokeWidth={1.75}
        aria-hidden
        className="flex-none text-[color:var(--text-muted)]"
      />
    </button>
  );

  const single = profiles.length <= 1;

  const menuLinkClass =
    "focus-ring flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-[0.8125rem] font-medium text-[color:var(--text-primary)] transition-colors hover:bg-[color:var(--color-brand-500)]/[0.10]";

  const criarRow = (
    <button
      type="button"
      role="menuitem"
      onClick={() => { setOpen(false); setSheetOpen(true); }}
      className="focus-ring flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left transition-colors hover:bg-[color:var(--surface-2)]"
    >
      <span className="flex h-7 w-7 flex-none items-center justify-center rounded-md border border-dashed border-[color:var(--border-strong)] text-[color:var(--text-muted)]">
        <Plus size={15} strokeWidth={2} aria-hidden />
      </span>
      <span className="flex min-w-0 flex-1 flex-col items-start">
        <span className="text-[0.8125rem] font-semibold text-[color:var(--text-primary)]">Criar perfil</span>
        <span className="text-[0.6875rem] text-[color:var(--text-muted)]">Separe o dinheiro de uma empresa MEI do seu pessoal.</span>
      </span>
    </button>
  );

  const accountLinks = (
    <>
      <Link href={"/app/perfil" as Route} role="menuitem" onClick={() => setOpen(false)} className={menuLinkClass}>
        <UserRound size={16} strokeWidth={1.75} aria-hidden className="text-[color:var(--text-muted)]" />
        Perfil e conta
      </Link>
      <Link href={"/app/configuracoes" as Route} role="menuitem" onClick={() => setOpen(false)} className={menuLinkClass}>
        <Settings size={16} strokeWidth={1.75} aria-hidden className="text-[color:var(--text-muted)]" />
        Configurações
      </Link>
      <Link href={"/app/configuracoes/documentos" as Route} role="menuitem" onClick={() => setOpen(false)} className={menuLinkClass}>
        <FileText size={16} strokeWidth={1.75} aria-hidden className="text-[color:var(--text-muted)]" />
        Meus documentos
      </Link>
      <Link href={"/app/falar-com-a-gente" as Route} role="menuitem" onClick={() => setOpen(false)} className={menuLinkClass}>
        <MessageCircle size={16} strokeWidth={1.75} aria-hidden className="text-[color:var(--text-muted)]" />
        Falar com a gente
      </Link>
    </>
  );

  const sairForm = (
    <form action="/api/auth/sign-out" method="post">
      <button
        type="submit"
        role="menuitem"
        className="focus-ring flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-[0.8125rem] font-medium text-[color:var(--semantic-negative)] transition-colors hover:bg-[color:var(--semantic-negative)]/[0.10]"
      >
        <LogOut size={16} strokeWidth={1.75} aria-hidden />
        Sair
      </button>
    </form>
  );

  return (
    <div
      ref={ref}
      className="relative mt-2 flex-none border-t border-[color:var(--border-soft)] pt-4"
    >
      {open ? (
        <div
          role="menu"
          className={`absolute bottom-[calc(100%+0.5rem)] left-0 z-40 rounded-2xl border border-[color:var(--border-strong)] bg-[color:var(--surface-solid)] p-1.5 shadow-[0_24px_50px_-16px_rgba(31,29,28,0.4)] ${
            collapsed ? "w-64" : "right-0"
          }`}
        >
          {single ? (
            <>
              {accountLinks}
              <div className="my-1 h-px bg-[color:var(--border-soft)]" />
              {criarRow}
              <div className="my-1 h-px bg-[color:var(--border-soft)]" />
              {sairForm}
            </>
          ) : (
            <>
              <p className="px-2.5 pb-1.5 pt-2 text-[0.625rem] font-bold uppercase tracking-[0.1em] text-[color:var(--text-muted)]">
                Perfil ativo
              </p>

              {profiles.map((profile) => {
                const active = profile.id === activeProfileId;
                const subtitle = profileSubtitle(profile);
                return (
                  <button
                    key={profile.id}
                    type="button"
                    role="menuitemradio"
                    aria-checked={active}
                    disabled={pending || active}
                    onClick={() => handleSwitch(profile.id)}
                    className={`focus-ring flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 transition-colors ${active ? "bg-[color:var(--color-brand-500)]/[0.10] ring-1 ring-[color:var(--color-brand-500)]/30" : "hover:bg-[color:var(--surface-2)]"}`}
                  >
                    <UserAvatar
                      dataUrl={active ? avatarUrl : undefined}
                      displayName={displayName}
                      className={`flex h-7 w-7 flex-none items-center justify-center rounded-md bg-[linear-gradient(135deg,#f28e25,#ef7a1a)] text-[0.625rem] font-bold text-white ${active ? "ring-2 ring-[color:var(--color-brand-500)] ring-offset-2 ring-offset-[var(--surface-solid)]" : ""}`}
                    />
                    <span className="flex min-w-0 flex-1 flex-col items-start">
                      <span className="truncate text-[0.8125rem] font-semibold text-[color:var(--text-primary)]">
                        {profile.displayName ?? displayName}
                      </span>
                      <span className="text-[0.6875rem] text-[color:var(--text-muted)]">{subtitle}</span>
                    </span>
                  </button>
                );
              })}

              {criarRow}

              <div className="my-1 h-px bg-[color:var(--border-soft)]" />

              <Button asChild variant="glass" size="sm" className="w-full gap-2">
                <Link href={"/app/configuracoes/perfis" as Route} role="menuitem" onClick={() => setOpen(false)}>
                  <SlidersHorizontal size={15} strokeWidth={1.75} aria-hidden />
                  Gerenciar perfis
                </Link>
              </Button>

              <div className="my-1 h-px bg-[color:var(--border-soft)]" />

              {accountLinks}

              <div className="my-1 h-px bg-[color:var(--border-soft)]" />

              {sairForm}
            </>
          )}
        </div>
      ) : null}

      <CreateProfileSheet open={sheetOpen} onOpenChange={setSheetOpen} />

      {collapsed ? (
        <SimpleTooltip label="Conta" side="right">
          {collapsedCard}
        </SimpleTooltip>
      ) : (
        expandedCard
      )}
    </div>
  );
}
