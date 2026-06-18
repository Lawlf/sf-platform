"use client";

import {
  Building2,
  Check,
  ChevronsUpDown,
  Coins,
  HomeIcon,
  LineChart,
  Loader2,
  PanelRightClose,
  PanelRightOpen,
  PlusCircle,
  Search,
  Settings,
  Target,
  TrendingUp,
  UserPlus,
  UserRound,
  Wallet,
} from "lucide-react";
import type { Route } from "next";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { type FormEvent, useEffect, useRef, useState, useTransition } from "react";

import { SimpleTooltip } from "@/app/components/ui/tooltip";

import { createMeiProfileAction } from "../perfil/_actions/create-mei-profile.action";
import { createProfileAction } from "../_actions/create-profile.action";
import { switchProfileAction } from "../_actions/switch-profile.action";
import type { SerializedProfile } from "../_actions/profile-queries";
import { ImmersiveSidebar } from "../conteudo/_components/immersive-sidebar";

import { openSearch } from "./command-palette.client";
import { UserAvatar } from "./user-avatar";

interface NavItem {
  href: Route;
  label: string;
  icon: typeof HomeIcon;
  exact?: boolean;
}

interface NavGroup {
  label: string;
  items: NavItem[];
}

const BASE_NAV_GROUPS: NavGroup[] = [
  {
    label: "",
    items: [{ href: "/app" as Route, label: "Início", icon: HomeIcon, exact: true }],
  },
  {
    label: "Minhas finanças",
    items: [
      { href: "/app/renda" as Route, label: "Renda", icon: TrendingUp },
      { href: "/app/dividas" as Route, label: "Dívidas", icon: Wallet },
      { href: "/app/patrimonio" as Route, label: "Patrimônio", icon: Coins },
      { href: "/app/metas" as Route, label: "Metas", icon: Target },
    ],
  },
  {
    label: "Ferramentas",
    items: [
      { href: "/app/linha-do-tempo" as Route, label: "Linha do tempo", icon: LineChart },
      { href: "/app/simular" as Route, label: "Simular", icon: PlusCircle },
    ],
  },
];

const MEI_NAV_ITEM: NavItem = {
  href: "/app/mei" as Route,
  label: "Meu salário real",
  icon: Building2,
};

function buildNavGroups(hasPj: boolean): NavGroup[] {
  if (!hasPj) return BASE_NAV_GROUPS;
  return BASE_NAV_GROUPS.map((group, i) => {
    if (i !== 1) return group;
    return { label: group.label, items: [...group.items, MEI_NAV_ITEM] };
  });
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
}

export function Sidebar({ displayName, avatarUrl, isPro, profiles, activeProfileId }: SidebarProps) {
  const pathname = usePathname();
  const isOnConteudoImmersive =
    pathname.startsWith("/app/conteudo/trilha") ||
    pathname.startsWith("/app/conteudo/livros") ||
    pathname.startsWith("/app/conteudo/ritmo");
  const [collapsed, setCollapsed] = useState(false);
  const hasPj = profiles.some((p) => p.type === "PJ_MEI");
  const navGroups = buildNavGroups(hasPj);

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
      className="hidden md:fixed md:inset-y-0 md:left-0 md:z-30 md:flex md:w-[var(--sidebar-w)] md:flex-col md:overflow-hidden md:border-r md:border-[color:var(--border-soft)] md:bg-[color:var(--surface-3)] md:px-3 md:py-6 md:[backdrop-filter:blur(24px)_saturate(180%)] md:transition-[width] md:duration-200"
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
  const [createOpen, setCreateOpen] = useState(false);
  const [createName, setCreateName] = useState("");
  const [createType, setCreateType] = useState<"PF" | "PJ_MEI">("PJ_MEI");
  const [pending, startTransition] = useTransition();
  const ref = useRef<HTMLDivElement>(null);

  const activeProfile = profiles.find((p) => p.id === activeProfileId) ?? profiles[0];
  const hasPj = profiles.some((p) => p.type === "PJ_MEI");

  function profileLabel(type: SerializedProfile["type"]): string {
    return type === "PJ_MEI" ? "MEI" : "PF";
  }

  function profileSubtitle(type: SerializedProfile["type"]): string {
    return type === "PJ_MEI" ? "Empresa (MEI)" : "Pessoa física";
  }

  function handleSwitch(profileId: string) {
    startTransition(async () => {
      await switchProfileAction({ profileId });
      setOpen(false);
      router.refresh();
    });
  }

  function handleCreateProfile(e: FormEvent) {
    e.preventDefault();
    if (!createName.trim()) return;
    startTransition(async () => {
      const result = await createProfileAction({ type: createType, displayName: createName.trim() });
      if (result.ok) {
        setCreateOpen(false);
        setCreateName("");
        setCreateType("PJ_MEI");
        setOpen(false);
        router.refresh();
      }
    });
  }

  function handleCreateMei() {
    startTransition(async () => {
      const result = await createMeiProfileAction({});
      if (result.ok) {
        setOpen(false);
        router.refresh();
      }
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
          {activeProfile ? profileSubtitle(activeProfile.type) : "Conta pessoal"}
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

  return (
    <div
      ref={ref}
      className="relative mt-2 flex-none border-t border-[color:var(--border-soft)] pt-4"
    >
      {open ? (
        <div
          role="menu"
          className="absolute bottom-[calc(100%+0.5rem)] left-0 right-0 z-40 rounded-2xl border border-[color:var(--border-strong)] bg-[color:var(--surface-solid)] p-1.5 shadow-[0_24px_50px_-16px_rgba(31,29,28,0.4)]"
        >
          <p className="px-2.5 pb-1.5 pt-2 text-[0.625rem] font-bold uppercase tracking-[0.1em] text-[color:var(--text-muted)]">
            Perfil ativo
          </p>

          {profiles.map((profile) => {
            const isActive = profile.id === activeProfileId;
            const label = profileLabel(profile.type);
            const subtitle = profileSubtitle(profile.type);
            return (
              <button
                key={profile.id}
                type="button"
                role="menuitemradio"
                aria-checked={isActive}
                disabled={pending || isActive}
                onClick={() => handleSwitch(profile.id)}
                className={`focus-ring flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 transition-colors ${isActive ? "bg-[color:var(--surface-2)]" : "hover:bg-[color:var(--color-brand-500)]/[0.10]"}`}
              >
                <UserAvatar
                  dataUrl={isActive ? avatarUrl : undefined}
                  displayName={displayName}
                  className="flex h-6 w-6 flex-none items-center justify-center rounded-md bg-[linear-gradient(135deg,#f28e25,#ef7a1a)] text-[0.5625rem] font-bold text-white"
                />
                <span className="flex min-w-0 flex-1 flex-col items-start">
                  <span className="truncate text-[0.8125rem] font-semibold text-[color:var(--text-primary)]">
                    {displayName}
                  </span>
                  <span className="text-[0.6875rem] text-[color:var(--text-muted)]">{subtitle}</span>
                </span>
                <span className="flex-none rounded bg-[color:var(--surface-2)] px-1.5 py-px text-[0.625rem] font-bold text-[color:var(--text-muted)]">
                  {label}
                </span>
                {isActive ? (
                  <Check size={15} strokeWidth={2.25} aria-hidden className="flex-none text-[color:var(--color-brand-800)]" />
                ) : null}
              </button>
            );
          })}

          {!hasPj ? (
            <button
              type="button"
              role="menuitem"
              disabled={pending}
              onClick={handleCreateMei}
              className="focus-ring mt-0.5 flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-[0.8125rem] font-medium text-[color:var(--text-secondary)] transition-colors hover:bg-[color:var(--color-brand-500)]/[0.10] disabled:opacity-60"
            >
              {pending ? (
                <Loader2 size={16} strokeWidth={1.75} aria-hidden className="flex-none animate-spin text-[color:var(--text-muted)]" />
              ) : (
                <Building2 size={16} strokeWidth={1.75} aria-hidden className="flex-none text-[color:var(--text-muted)]" />
              )}
              <span className="flex-1 text-left">Sou MEI / tenho CNPJ</span>
            </button>
          ) : null}

          {!createOpen ? (
            <button
              type="button"
              role="menuitem"
              disabled={pending}
              onClick={() => setCreateOpen(true)}
              className="focus-ring mt-0.5 flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-[0.8125rem] font-medium text-[color:var(--text-secondary)] transition-colors hover:bg-[color:var(--color-brand-500)]/[0.10] disabled:opacity-60"
            >
              <UserPlus size={16} strokeWidth={1.75} aria-hidden className="flex-none text-[color:var(--text-muted)]" />
              <span className="flex-1 text-left">Criar perfil</span>
            </button>
          ) : (
            <form onSubmit={handleCreateProfile} className="mt-1 flex flex-col gap-2 px-1">
              <input
                autoFocus
                type="text"
                placeholder="Nome do perfil"
                value={createName}
                onChange={(e) => setCreateName(e.target.value)}
                maxLength={60}
                disabled={pending}
                className="w-full rounded-lg border border-[color:var(--border-strong)] bg-[color:var(--surface-2)] px-2.5 py-1.5 text-[0.8125rem] text-[color:var(--text-primary)] placeholder:text-[color:var(--text-muted)] focus:outline-none focus:ring-1 focus:ring-[color:var(--color-brand-500)] disabled:opacity-60"
              />
              <select
                value={createType}
                onChange={(e) => setCreateType(e.target.value as "PF" | "PJ_MEI")}
                disabled={pending}
                className="w-full rounded-lg border border-[color:var(--border-strong)] bg-[color:var(--surface-2)] px-2.5 py-1.5 text-[0.8125rem] text-[color:var(--text-primary)] focus:outline-none focus:ring-1 focus:ring-[color:var(--color-brand-500)] disabled:opacity-60"
              >
                <option value="PJ_MEI">Empresa (PJ / MEI)</option>
                <option value="PF">Pessoa física</option>
              </select>
              <div className="flex gap-1.5">
                <button
                  type="submit"
                  disabled={pending || !createName.trim()}
                  className="focus-ring flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-[color:var(--color-brand-500)] px-3 py-1.5 text-[0.8125rem] font-semibold text-white transition-colors hover:bg-[color:var(--color-brand-600)] disabled:opacity-60"
                >
                  {pending ? (
                    <Loader2 size={14} strokeWidth={1.75} aria-hidden className="animate-spin" />
                  ) : null}
                  Criar
                </button>
                <button
                  type="button"
                  disabled={pending}
                  onClick={() => { setCreateOpen(false); setCreateName(""); }}
                  className="focus-ring rounded-lg border border-[color:var(--border-strong)] px-3 py-1.5 text-[0.8125rem] font-medium text-[color:var(--text-secondary)] transition-colors hover:bg-[color:var(--surface-2)] disabled:opacity-60"
                >
                  Cancelar
                </button>
              </div>
            </form>
          )}

          <div className="my-1.5 h-px bg-[color:var(--border-soft)]" />
          <Link
            href={"/app/perfil" as Route}
            role="menuitem"
            onClick={() => setOpen(false)}
            className="focus-ring flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-[0.8125rem] font-medium text-[color:var(--text-primary)] transition-colors hover:bg-[color:var(--color-brand-500)]/[0.10]"
          >
            <UserRound size={16} strokeWidth={1.75} aria-hidden className="text-[color:var(--text-muted)]" />
            Perfil e conta
          </Link>
          <Link
            href={"/app/configuracoes" as Route}
            role="menuitem"
            onClick={() => setOpen(false)}
            className="focus-ring flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-[0.8125rem] font-medium text-[color:var(--text-primary)] transition-colors hover:bg-[color:var(--color-brand-500)]/[0.10]"
          >
            <Settings size={16} strokeWidth={1.75} aria-hidden className="text-[color:var(--text-muted)]" />
            Configurações
          </Link>
        </div>
      ) : null}

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
