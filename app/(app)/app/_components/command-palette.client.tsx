"use client";

import {
  ArrowDownUp,
  Bell,
  ChevronRight,
  Coins,
  Files,
  HomeIcon,
  LineChart,
  PiggyBank,
  PlusCircle,
  Search,
  Settings,
  Target,
  TrendingUp,
  UserRound,
  Wallet,
} from "lucide-react";
import type { Route } from "next";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

import { isOfflineRoute } from "../_lib/offline/offline-routes";
import { useOnline } from "../_lib/offline/use-online";
import { SETTINGS_ADVANCED_SECTIONS, SETTINGS_SECTIONS } from "../_lib/settings-items";
import { SIMULATORS } from "../simular/_lib/simulators";

import { OFFLINE_BLOCKED_MESSAGE } from "./offline-nav-guard.client";

export const OPEN_SEARCH_EVENT = "sf:open-search";

export function openSearch(): void {
  window.dispatchEvent(new CustomEvent(OPEN_SEARCH_EVENT));
}

interface Command {
  href: Route;
  label: string;
  hint: string;
  icon: typeof HomeIcon;
  terms?: string;
  group?: string;
}

const BASE_COMMANDS: Command[] = [
  { href: "/app" as Route, label: "Início", hint: "Como está seu mês", icon: HomeIcon, terms: "home resumo painel dashboard saldo do mes movimento gap sobra inicio visao geral" },
  { href: "/app/lancar" as Route, label: "Registrar entrada ou saída", hint: "Um PIX, uma venda, um gasto avulso", icon: ArrowDownUp, terms: "pix venda vendi recebi paguei gasto compra dinheiro entrada saida custo transacao pagamento lancar lancamento avulso recebimento entrou saiu freela" },
  { href: "/app/renda" as Route, label: "Renda", hint: "Quanto entra todo mês", icon: TrendingUp, terms: "dinheiro que entra salario ganho receita faturamento entrada renda mensal pro labore" },
  { href: "/app/dividas" as Route, label: "Dívidas", hint: "O que você deve e quanto falta", icon: Wallet, terms: "quanto devo emprestimo financiamento cartao parcela conta a pagar boleto fatura deve dividas" },
  { href: "/app/patrimonio" as Route, label: "Patrimônio", hint: "O que você tem e investe", icon: Coins, terms: "investimentos bens ativos poupanca aplicacao quanto tenho reserva cripto carteira imovel" },
  { href: "/app/investir" as Route, label: "Onde investir", hint: "Pra onde mandar seu dinheiro", icon: PiggyBank, terms: "investir aplicar onde rende render rendimento cdb tesouro selic poupanca melhor investimento planejar" },
  { href: "/app/metas" as Route, label: "Metas", hint: "Seus objetivos e quanto falta", icon: Target, terms: "objetivo sonho guardar juntar planejar meta poupar" },
  { href: "/app/linha-do-tempo" as Route, label: "Linha do tempo", hint: "Seu dinheiro mês a mês", icon: LineChart, terms: "projecao futuro previsao timeline historico evolucao relatorio mes a mes planejar" },
  { href: "/app/simular" as Route, label: "Simular", hint: "Faça as contas antes de decidir", icon: PlusCircle, terms: "simulador calculadora calcular simulacao contas planejar" },
  { href: "/app/notificacoes" as Route, label: "Notificações", hint: "Avisos e lembretes", icon: Bell, terms: "alertas avisos lembretes notificacao conta" },
  { href: "/app/perfil" as Route, label: "Perfil e conta", hint: "Seus dados e sua conta", icon: UserRound, terms: "minha conta usuario perfil identidade badges" },
  { href: "/app/configuracoes" as Route, label: "Configurações", hint: "Ajustes do app", icon: Settings, terms: "ajustes config configuracao preferencias opcoes conta" },
  { href: "/app/configuracoes/documentos" as Route, label: "Meus documentos", hint: "Contratos e comprovantes", icon: Files, terms: "anexos comprovantes contratos arquivos documentos pdf" },
];

const SETTINGS_COMMANDS: Command[] = [...SETTINGS_SECTIONS, ...SETTINGS_ADVANCED_SECTIONS]
  .flatMap((section) => section.items)
  .filter((item) => !item.disabled)
  .map((item) => ({
    href: item.href,
    label: item.label,
    hint: item.description,
    icon: item.icon,
    terms: item.keywords?.join(" ") ?? "",
    group: "Configurações",
  }));

const SIMULATOR_COMMANDS: Command[] = SIMULATORS.map((sim) => ({
  href: sim.href,
  label: sim.title,
  hint: sim.desc,
  icon: sim.icon,
  terms: sim.keywords.join(" "),
  group: "Simular",
}));

// Índice de busca = seções, ajustes e simuladores. Nunca indexar transação ou
// linha de extrato: a busca segue o recorte macro do produto.
const SEARCHABLE: Command[] = (() => {
  const seen = new Set<string>(BASE_COMMANDS.map((c) => c.href));
  const extra = [...SETTINGS_COMMANDS, ...SIMULATOR_COMMANDS].filter((c) => {
    if (seen.has(c.href)) return false;
    seen.add(c.href);
    return true;
  });
  return [...BASE_COMMANDS, ...extra];
})();

function normalize(s: string): string {
  return s
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase();
}

const STOPWORDS = new Set([
  "de", "da", "do", "das", "dos", "e", "ou", "a", "o", "as", "os", "um", "uma",
  "para", "pra", "por", "com", "no", "na", "em", "que", "meu", "minha",
]);

function tokenize(s: string): string[] {
  return normalize(s)
    .split(/\s+/)
    .filter((t) => t.length > 0 && !STOPWORDS.has(t));
}

export function CommandPalette() {
  const router = useRouter();
  const online = useOnline();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const results = useMemo(() => {
    const tokens = tokenize(query);
    if (!tokens.length) return BASE_COMMANDS;
    return SEARCHABLE.filter((c) => {
      const haystack = normalize(`${c.group ?? ""} ${c.label} ${c.hint} ${c.terms ?? ""}`);
      return tokens.every((token) => haystack.includes(token));
    });
  }, [query]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((v) => !v);
      }
    }
    function onOpen() {
      setOpen(true);
    }
    document.addEventListener("keydown", onKey);
    window.addEventListener(OPEN_SEARCH_EVENT, onOpen);
    return () => {
      document.removeEventListener("keydown", onKey);
      window.removeEventListener(OPEN_SEARCH_EVENT, onOpen);
    };
  }, []);

  useEffect(() => {
    if (open) {
      setQuery("");
      setActive(0);
      const id = window.setTimeout(() => inputRef.current?.focus(), 20);
      return () => window.clearTimeout(id);
    }
    return undefined;
  }, [open]);

  useEffect(() => {
    setActive(0);
  }, [query]);

  function go(href: Route) {
    setOpen(false);
    if (!online && !isOfflineRoute(href)) {
      toast(OFFLINE_BLOCKED_MESSAGE);
      return;
    }
    router.push(href);
  }

  function onInputKey(e: React.KeyboardEvent) {
    if (e.key === "Escape") {
      setOpen(false);
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((i) => (results.length ? (i + 1) % results.length : 0));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((i) => (results.length ? (i - 1 + results.length) % results.length : 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const item = results[active];
      if (item) go(item.href);
    }
  }

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Pesquisar"
      className="fixed inset-0 z-[60] flex items-end justify-center md:items-start md:p-4 md:pt-[12vh]"
      onMouseDown={() => setOpen(false)}
    >
      <div className="absolute inset-0 bg-[color:var(--bg-app)]/55 backdrop-blur-sm" aria-hidden />
      <div
        onMouseDown={(e) => e.stopPropagation()}
        className="relative w-full overflow-hidden rounded-t-2xl border border-[color:var(--border-strong)] bg-[color:var(--surface-1)] shadow-[0_32px_70px_-20px_rgba(31,29,28,0.5)] [backdrop-filter:blur(24px)_saturate(180%)] md:max-w-[34rem] md:rounded-2xl"
      >
        <div className="mx-auto mt-2 h-1 w-9 rounded-full bg-[color:var(--border-strong)] md:hidden" aria-hidden />
        <div className="flex items-center gap-2.5 border-b border-[color:var(--border-soft)] px-4">
          <Search size={18} strokeWidth={1.75} aria-hidden className="flex-none text-[color:var(--text-muted)]" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={onInputKey}
            placeholder="Buscar no app"
            className="flex-1 bg-transparent py-3.5 text-[0.9375rem] text-[color:var(--text-primary)] outline-none placeholder:text-[color:var(--text-muted)]"
          />
          <kbd className="hidden flex-none rounded border border-[color:var(--border-strong)] bg-[color:var(--surface-2)] px-1.5 py-0.5 text-[0.625rem] font-semibold text-[color:var(--text-muted)] md:block">
            Esc
          </kbd>
        </div>

        <div className="max-h-[min(60vh,24rem)] overflow-y-auto p-2 pb-[max(0.5rem,env(safe-area-inset-bottom))]">
          {results.length === 0 ? (
            <p className="px-3 py-6 text-center text-[0.8125rem] text-[color:var(--text-muted)]">
              Nada com esse nome. Tente uma seção, um simulador ou um ajuste.
            </p>
          ) : (
            results.map((c, i) => {
              const Icon = c.icon;
              const isActive = i === active;
              return (
                <button
                  key={c.href}
                  type="button"
                  onMouseEnter={() => setActive(i)}
                  onClick={() => go(c.href)}
                  className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors ${
                    isActive
                      ? "bg-[color:var(--color-brand-500)]/[0.12]"
                      : "hover:bg-[color:var(--surface-2)]"
                  }`}
                >
                  <Icon
                    size={18}
                    strokeWidth={1.75}
                    aria-hidden
                    className={`flex-none ${isActive ? "text-[color:var(--color-brand-800)]" : "text-[color:var(--text-muted)]"}`}
                  />
                  <span className="flex max-w-full flex-none items-center gap-1 text-[0.875rem]">
                    {c.group ? (
                      <span className="flex flex-none items-center gap-0.5 text-[color:var(--text-muted)]">
                        {c.group}
                        <ChevronRight size={13} strokeWidth={2} aria-hidden />
                      </span>
                    ) : null}
                    <span className="truncate font-medium text-[color:var(--text-primary)]">{c.label}</span>
                  </span>
                  <span className="hidden min-w-0 flex-1 truncate text-[0.6875rem] text-[color:var(--text-muted)] sm:block">
                    {c.hint}
                  </span>
                </button>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
