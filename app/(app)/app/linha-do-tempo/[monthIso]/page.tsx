import {
  AlertTriangle,
  ArrowRight,
  Award,
  CalendarRange,
  ChevronRight,
  Flame,
  Package,
  Sparkles,
  Star,
  Target,
  TrendingDown,
  TrendingUp,
  Wallet,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { Metadata } from "next";
import type { Route } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";

import { MonthYear } from "@/domain/value-objects/month-year.vo";
import { requireUser } from "@/presentation/http/middleware/cached-current-user";
import { dateOnlyFormat } from "@/shared/format/date-only";

import { fetchMonthDetail } from "../../_actions/timeline-month-detail";
import type {
  SerializedExpenseRow,
  SerializedIncomeRow,
  SerializedPatrimony,
  SerializedPaymentRow,
  SerializedStoryRow,
  SerializedTimelineEvent,
  TimelineEventKind,
} from "../../_actions/timeline-month-detail";
import { PageShell } from "../../_components/page-shell";

export const metadata: Metadata = { title: "Detalhe do mês" };

interface PageProps {
  params: Promise<{ monthIso: string }>;
}

function isValidMonthIso(iso: string): boolean {
  return /^\d{4}-\d{2}$/.test(iso);
}

function sumCents(items: ReadonlyArray<{ amount: { cents: string } }>): bigint {
  return items.reduce((acc, it) => acc + BigInt(it.amount.cents), 0n);
}

function sumRealized(
  items: ReadonlyArray<{ amount: { cents: string }; dateIso: string }>,
  today: string,
): bigint {
  return items
    .filter((it) => it.dateIso.slice(0, 10) <= today)
    .reduce((acc, it) => acc + BigInt(it.amount.cents), 0n);
}

function formatBrl(cents: bigint): string {
  const negative = cents < 0n;
  const abs = negative ? -cents : cents;
  const reais = Number(abs) / 100;
  const fmt = reais.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  return `${negative ? "-" : ""}${fmt}`;
}

const DAY_FMT = dateOnlyFormat({ day: "2-digit", weekday: "short" });

type TimelineEntry =
  | { kind: "income"; dateIso: string; data: SerializedIncomeRow }
  | { kind: "expense"; dateIso: string; data: SerializedExpenseRow }
  | { kind: "payment"; dateIso: string; data: SerializedPaymentRow }
  | { kind: "story"; dateIso: string; data: SerializedStoryRow }
  | { kind: "event"; dateIso: string; data: SerializedTimelineEvent };

function dayKey(iso: string): string {
  return iso.slice(0, 10);
}

export default async function MonthDetailPage({ params }: PageProps) {
  await requireUser();
  const { monthIso } = await params;
  if (!isValidMonthIso(monthIso)) return notFound();

  let monthLabel: string;
  try {
    monthLabel = MonthYear.fromIso(monthIso).format();
  } catch {
    return notFound();
  }

  const data = await fetchMonthDetail({ monthIso });
  if (!data) return notFound();

  const now = new Date();
  const todayKey = now.toISOString().slice(0, 10);

  const target = MonthYear.fromIso(monthIso);
  const cur = MonthYear.fromDate(now);
  const isPast = target.isBefore(cur);
  const isFuture = cur.isBefore(target);
  const isCurrent = !isPast && !isFuture;

  const fullIncomeCents = sumCents(data.incomes);
  const fullOutflowCents = sumCents(data.expenses) + sumCents(data.payments);
  const fullFreeCents = fullIncomeCents - fullOutflowCents;

  const realizedIncomeCents = sumRealized(data.incomes, todayKey);
  const realizedOutflowCents =
    sumRealized(data.expenses, todayKey) + sumRealized(data.payments, todayKey);
  const realizedFreeCents = realizedIncomeCents - realizedOutflowCents;

  const remainingOutflowCents =
    fullOutflowCents - (sumRealized(data.expenses, todayKey) + sumRealized(data.payments, todayKey));

  const patrimonyDeltaCents = data.patrimony.previous
    ? BigInt(data.patrimony.current.netWorth.cents) - BigInt(data.patrimony.previous.netWorth.cents)
    : null;
  const patrimonySub =
    patrimonyDeltaCents !== null
      ? {
          label: `${patrimonyDeltaCents >= 0n ? "+" : "-"}${formatBrl(
            patrimonyDeltaCents < 0n ? -patrimonyDeltaCents : patrimonyDeltaCents,
          )} esse mês`,
          tone: (patrimonyDeltaCents >= 0n ? "positive" : "negative") as "positive" | "negative",
        }
      : null;

  const tiles = buildTiles({
    isCurrent,
    isPast,
    fullFreeCents,
    fullIncomeCents,
    fullOutflowCents,
    realizedIncomeCents,
    realizedFreeCents,
    remainingOutflowCents,
    netWorthFormatted: data.patrimony.current.netWorth.formatted,
    patrimonyTone: patrimonyTone(data.patrimony),
    patrimonySub,
  });

  // Fluxo de caixa do mês: renda, despesa recorrente, pagamento de dívida.
  // Eventos "Nova dívida" (`debt_added`, só dívidas reais após o dedup no
  // server) entram aqui também, pois uma dívida nova é movimentação do mês.
  const flowEntries: TimelineEntry[] = [
    ...data.incomes.map<TimelineEntry>((i) => ({ kind: "income", dateIso: i.dateIso, data: i })),
    ...data.expenses.map<TimelineEntry>((e) => ({ kind: "expense", dateIso: e.dateIso, data: e })),
    ...data.payments.map<TimelineEntry>((p) => ({ kind: "payment", dateIso: p.dateIso, data: p })),
    ...data.stories.map<TimelineEntry>((s) => ({ kind: "story", dateIso: s.dateIso, data: s })),
    ...data.events
      .filter((e) => e.kind === "debt_added")
      .map<TimelineEntry>((e) => ({ kind: "event", dateIso: e.dateIso, data: e })),
  ];

  const acquiredEntries: TimelineEntry[] = data.events
    .filter((e) => e.kind === "asset_added")
    .map<TimelineEntry>((e) => ({ kind: "event", dateIso: e.dateIso, data: e }));

  const revaluedEntries: TimelineEntry[] = data.events
    .filter((e) => e.kind === "asset_revalued")
    .map<TimelineEntry>((e) => ({ kind: "event", dateIso: e.dateIso, data: e }));

  const hasAnything =
    flowEntries.length > 0 || acquiredEntries.length > 0 || revaluedEntries.length > 0;

  return (
    <PageShell
      title={monthLabel}
      description={subtitleFor({ isCurrent, isPast })}
      backHref={"/app/linha-do-tempo" as Route}
    >
      <section className="rounded-[18px] border border-[color:var(--border-soft)] bg-[color:var(--surface-1)] p-4 backdrop-blur-xl md:p-5">
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {tiles.map((tile) => (
            <Kpi
              key={tile.key}
              label={tile.label}
              value={tile.value}
              tone={tile.tone}
              {...(tile.sub ? { sub: tile.sub } : {})}
            />
          ))}
        </div>
      </section>

      {!hasAnything ? (
        <p className="py-6 text-center text-[0.8125rem] text-[color:var(--text-muted)]">
          Nenhuma movimentação registrada nesse mês.
        </p>
      ) : (
        <div className="flex flex-col gap-8">
          {flowEntries.length > 0 ? (
            <Block heading="Dinheiro do mês">
              {isCurrent ? (
                <>
                  <SubSection
                    heading="Ainda vem"
                    entries={flowEntries.filter((e) => dayKey(e.dateIso) > todayKey)}
                  />
                  <SubSection
                    heading="Já rolou"
                    entries={flowEntries.filter((e) => dayKey(e.dateIso) <= todayKey)}
                  />
                </>
              ) : (
                <SubSection heading={null} entries={flowEntries} />
              )}
            </Block>
          ) : null}

          {acquiredEntries.length > 0 ? (
            <Block heading="Virou patrimônio">
              <SubSection heading={null} entries={acquiredEntries} />
            </Block>
          ) : null}

          {revaluedEntries.length > 0 ? (
            <Block heading="Mudou de valor">
              <SubSection heading={null} entries={revaluedEntries} />
            </Block>
          ) : null}
        </div>
      )}

      <Link
        href={"/app/linha-do-tempo" as Route}
        className="focus-ring flex items-center gap-3 rounded-xl border border-[color:var(--border-soft)] bg-[color:var(--surface-1)] px-4 py-3 transition-colors hover:bg-[color:var(--surface-2)]"
      >
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[color:var(--color-brand-500)]/[0.14] text-[color:var(--color-brand-800)]">
          <CalendarRange size={16} strokeWidth={2} aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <div className="truncate text-[0.875rem] font-bold text-[color:var(--text-primary)]">
            Ver os outros meses
          </div>
          <div className="mt-0.5 text-[0.6875rem] text-[color:var(--text-muted)]">
            Sua trajetória, mês a mês.
          </div>
        </div>
        <ChevronRight
          size={16}
          strokeWidth={2}
          className="shrink-0 text-[color:var(--text-muted)]"
          aria-hidden
        />
      </Link>
    </PageShell>
  );
}

function subtitleFor({ isCurrent, isPast }: { isCurrent: boolean; isPast: boolean }): string {
  if (isCurrent) return "O que entrou, o que ainda vem e como o mês fecha.";
  if (isPast) return "O que entrou, o que saiu e como o mês fechou.";
  return "O que deve entrar e sair nesse mês.";
}

interface TileSpec {
  key: string;
  label: string;
  value: string;
  tone: "positive" | "negative" | "brand" | "muted";
  sub?: KpiSub;
}

function buildTiles(args: {
  isCurrent: boolean;
  isPast: boolean;
  fullFreeCents: bigint;
  fullIncomeCents: bigint;
  fullOutflowCents: bigint;
  realizedIncomeCents: bigint;
  realizedFreeCents: bigint;
  remainingOutflowCents: bigint;
  netWorthFormatted: string;
  patrimonyTone: "positive" | "negative" | "muted";
  patrimonySub: { label: string; tone: "positive" | "negative" } | null;
}): TileSpec[] {
  const {
    isCurrent,
    isPast,
    fullFreeCents,
    fullIncomeCents,
    fullOutflowCents,
    realizedIncomeCents,
    realizedFreeCents,
    remainingOutflowCents,
    netWorthFormatted,
    patrimonyTone: pTone,
    patrimonySub,
  } = args;

  const absFullFree = fullFreeCents < 0n ? -fullFreeCents : fullFreeCents;
  const heroTone: "positive" | "negative" = fullFreeCents >= 0n ? "positive" : "negative";

  // Mês sem renda registrada: renda R$0 aqui significa "sem dado", não
  // "ganhou R$0". Não mostramos déficit vermelho nem zero oco; estado neutro.
  const noIncome = fullIncomeCents === 0n;

  const heroTile: TileSpec = noIncome
    ? {
        key: "hero",
        label: "Saldo do mês",
        value: "Sem renda registrada",
        tone: "muted",
      }
    : isCurrent
      ? {
          key: "hero",
          label: fullFreeCents >= 0n ? "Sobra do mês" : "Falta do mês",
          value: formatBrl(absFullFree),
          tone: heroTone,
          sub: { label: `hoje ${formatBrl(realizedFreeCents)}`, tone: "muted" },
        }
      : isPast
        ? {
            key: "hero",
            label: fullFreeCents >= 0n ? "Sobrou" : "Faltou",
            value: formatBrl(absFullFree),
            tone: heroTone,
          }
        : {
            key: "hero",
            label: fullFreeCents >= 0n ? "Sobra projetada" : "Falta projetada",
            value: formatBrl(absFullFree),
            tone: heroTone,
          };

  const patrimonyTile: TileSpec = {
    key: "patrimony",
    label: "Patrimônio",
    value: netWorthFormatted,
    tone: pTone,
    ...(patrimonySub
      ? { sub: { label: patrimonySub.label, tone: patrimonySub.tone } }
      : {}),
  };

  const incomeLabel = isCurrent ? "Entrou" : isPast ? "Entrou" : "Vai entrar";
  const incomeValueCents = isCurrent ? realizedIncomeCents : fullIncomeCents;
  const incomeTile: TileSpec = noIncome
    ? { key: "in", label: incomeLabel, value: "Sem registro", tone: "muted" }
    : { key: "in", label: incomeLabel, value: formatBrl(incomeValueCents), tone: "positive" };

  if (isCurrent) {
    return [
      heroTile,
      incomeTile,
      { key: "out", label: "Vai sair", value: formatBrl(remainingOutflowCents), tone: "negative" },
      patrimonyTile,
    ];
  }

  if (isPast) {
    return [
      heroTile,
      incomeTile,
      { key: "out", label: "Saiu", value: formatBrl(fullOutflowCents), tone: "negative" },
      patrimonyTile,
    ];
  }

  return [
    heroTile,
    incomeTile,
    { key: "out", label: "Vai sair", value: formatBrl(fullOutflowCents), tone: "negative" },
    patrimonyTile,
  ];
}

function groupByDay(items: TimelineEntry[]): { day: string; entries: TimelineEntry[] }[] {
  const map = new Map<string, TimelineEntry[]>();
  for (const entry of items) {
    const key = dayKey(entry.dateIso);
    const list = map.get(key) ?? [];
    list.push(entry);
    map.set(key, list);
  }
  return Array.from(map.keys())
    .sort((a, b) => b.localeCompare(a))
    .map((day) => ({ day, entries: (map.get(day) ?? []).slice() }));
}

function Block({ heading, children }: { heading: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-4">
      <header className="flex items-center gap-3 px-1">
        <span className="text-[0.75rem] font-extrabold uppercase tracking-[1px] text-[color:var(--text-secondary)]">
          {heading}
        </span>
        <span aria-hidden className="h-px flex-1 bg-[color:var(--border-soft)]" />
      </header>
      {children}
    </div>
  );
}

function SubSection({
  heading,
  entries,
}: {
  heading: string | null;
  entries: TimelineEntry[];
}) {
  if (entries.length === 0) return null;
  const days = groupByDay(entries);
  return (
    <div className="flex flex-col gap-4">
      {heading ? (
        <header className="px-1">
          <span className="text-[0.6875rem] font-bold uppercase tracking-[0.5px] text-[color:var(--text-secondary)]">
            {heading}
          </span>
        </header>
      ) : null}
      {days.map(({ day, entries: dayEntries }) => {
        const date = new Date(`${day}T00:00:00Z`);
        const label = DAY_FMT.format(date).replace(",", "").toUpperCase();
        return (
          <section key={day} className="flex flex-col gap-2">
            <header className="px-1">
              <span className="text-[0.6875rem] font-bold uppercase tracking-[0.5px] text-[color:var(--text-muted)]">
                {label}
              </span>
            </header>
            <div className="flex flex-col gap-2">
              {dayEntries.map((entry) => (
                <TimelineRow key={`${entry.kind}-${rowKey(entry)}`} entry={entry} />
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}

function rowKey(entry: TimelineEntry): string {
  if (entry.kind === "story") return `story-${entry.data.kind}-${entry.dateIso}`;
  if (entry.kind === "event") return `event-${entry.data.id}`;
  return entry.data.id;
}

function patrimonyTone(patrimony: SerializedPatrimony): "positive" | "negative" | "muted" {
  if (!patrimony.previous) return "muted";
  const delta = BigInt(patrimony.current.netWorth.cents) - BigInt(patrimony.previous.netWorth.cents);
  if (delta > 0n) return "positive";
  if (delta < 0n) return "negative";
  return "muted";
}

interface KpiSub {
  label: string;
  tone: "positive" | "negative" | "muted";
}

function Kpi({
  label,
  value,
  tone,
  sub,
}: {
  label: string;
  value: string;
  tone: "positive" | "negative" | "brand" | "muted";
  sub?: KpiSub;
}) {
  const color =
    tone === "positive"
      ? "text-[color:var(--semantic-positive)]"
      : tone === "negative"
        ? "text-[color:var(--semantic-negative)]"
        : tone === "muted"
          ? "text-[color:var(--text-muted)]"
          : "text-[color:var(--color-brand-800)]";
  const subColor =
    sub?.tone === "positive"
      ? "text-[color:var(--semantic-positive)]"
      : sub?.tone === "negative"
        ? "text-[color:var(--semantic-negative)]"
        : "text-[color:var(--text-muted)]";
  const valueClass =
    tone === "muted"
      ? `text-[0.8125rem] font-semibold leading-snug ${color}`
      : `text-[0.9375rem] font-extrabold ${color}`;
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-[0.5625rem] font-bold uppercase tracking-[0.5px] text-[color:var(--text-muted)]">
        {label}
      </span>
      <span className={valueClass}>{value}</span>
      {sub ? (
        <span className={`mt-0.5 text-[0.625rem] font-bold tabular-nums ${subColor}`}>
          {sub.label}
        </span>
      ) : null}
    </div>
  );
}

function frequencyLabel(freq: "monthly" | "weekly" | "one_off" | "annual"): string {
  switch (freq) {
    case "monthly":
      return "Mensal";
    case "weekly":
      return "Semanal";
    case "one_off":
      return "Pontual";
    case "annual":
      return "Anual";
  }
}

const EVENT_LABEL: Record<TimelineEventKind, string> = {
  asset_added: "Novo patrimônio",
  income_added: "Nova renda",
  debt_added: "Nova dívida",
  asset_revalued: "Revalorização",
};

const EVENT_ICON: Record<TimelineEventKind, LucideIcon> = {
  asset_added: Package,
  income_added: TrendingUp,
  debt_added: Wallet,
  asset_revalued: Package,
};

function TimelineRow({ entry }: { entry: TimelineEntry }) {
  if (entry.kind === "income") {
    return (
      <RowLink
        href={"/app/renda" as Route}
        icon={TrendingUp}
        tone="positive"
        label={entry.data.label}
        meta={
          entry.data.isNew
            ? `${frequencyLabel(entry.data.frequency)} · Nova renda`
            : frequencyLabel(entry.data.frequency)
        }
        value={`+${entry.data.amount.formatted}`}
      />
    );
  }
  if (entry.kind === "expense") {
    return (
      <RowLink
        href={`/app/dividas/${entry.data.id}` as Route}
        icon={TrendingDown}
        tone="negative"
        label={entry.data.label}
        meta={frequencyLabel(entry.data.frequency)}
        {...(entry.data.isNew ? { tag: "Conta fixa nova" } : {})}
        value={`-${entry.data.amount.formatted}`}
      />
    );
  }
  if (entry.kind === "payment") {
    return (
      <RowLink
        href={`/app/dividas/${entry.data.debtId}` as Route}
        icon={TrendingDown}
        tone="negative"
        label={entry.data.debtLabel}
        meta={entry.data.isClosingPayment ? "Quitação" : "Pagamento"}
        value={`-${entry.data.amount.formatted}`}
      />
    );
  }
  if (entry.kind === "event") {
    if (entry.data.kind === "asset_added" && entry.data.amount) {
      return (
        <RowLink
          href={entry.data.href as Route}
          icon={EVENT_ICON[entry.data.kind]}
          tone="positive"
          label={entry.data.label}
          meta={`Novo patrimônio · ${entry.data.detail}`}
          value={`+${entry.data.amount.formatted}`}
        />
      );
    }
    if (entry.data.kind === "asset_revalued" && entry.data.amount) {
      const isUp = entry.data.direction === "positive";
      return (
        <RowLink
          href={entry.data.href as Route}
          icon={isUp ? TrendingUp : TrendingDown}
          tone={isUp ? "positive" : "negative"}
          label={entry.data.label}
          meta={entry.data.detail}
          value={`${isUp ? "+" : "-"}${entry.data.amount.formatted}`}
        />
      );
    }
    return (
      <RowLink
        href={entry.data.href as Route}
        icon={EVENT_ICON[entry.data.kind]}
        tone="neutral"
        label={entry.data.label}
        meta={entry.data.detail}
        value={EVENT_LABEL[entry.data.kind]}
      />
    );
  }
  return <StoryRow story={entry.data} />;
}

function RowLink({
  href,
  icon: Icon,
  tone,
  label,
  meta,
  tag,
  value,
}: {
  href: Route;
  icon: LucideIcon;
  tone: "positive" | "negative" | "neutral";
  label: string;
  meta: string;
  tag?: string;
  value: string;
}) {
  const valueColor =
    tone === "positive"
      ? "text-[color:var(--semantic-positive)]"
      : tone === "negative"
        ? "text-[color:var(--semantic-negative)]"
        : "text-[color:var(--color-brand-800)]";
  const iconBg =
    tone === "positive"
      ? "bg-[color:var(--semantic-positive)]/[0.14] text-[color:var(--semantic-positive)]"
      : tone === "negative"
        ? "bg-[color:var(--semantic-negative)]/[0.14] text-[color:var(--semantic-negative)]"
        : "bg-[color:var(--color-brand-500)]/[0.14] text-[color:var(--color-brand-800)]";
  const valueClass =
    tone === "neutral"
      ? `rounded-full bg-[color:var(--color-brand-500)]/[0.12] px-2.5 py-0.5 text-[0.6875rem] font-bold uppercase tracking-[0.4px] ${valueColor}`
      : `text-[0.9375rem] font-extrabold ${valueColor}`;
  return (
    <Link
      href={href}
      className="focus-ring flex items-center gap-3 rounded-xl border border-[color:var(--border-soft)] bg-[color:var(--surface-1)] px-4 py-3 transition-colors hover:bg-[color:var(--surface-2)]"
    >
      <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${iconBg}`}>
        <Icon size={16} strokeWidth={2} aria-hidden />
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex min-w-0 items-center gap-2">
          <span className="truncate text-[0.875rem] font-bold text-[color:var(--text-primary)]">
            {label}
          </span>
          {tag ? (
            <span className="shrink-0 rounded-full bg-[color:var(--color-brand-500)]/[0.12] px-2 py-0.5 text-[0.5625rem] font-bold uppercase tracking-[0.4px] text-[color:var(--color-brand-800)]">
              {tag}
            </span>
          ) : null}
        </div>
        <div className="mt-0.5 text-[0.6875rem] text-[color:var(--text-muted)]">{meta}</div>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <span className={valueClass}>{value}</span>
        <ArrowRight
          size={14}
          strokeWidth={2}
          className="text-[color:var(--text-muted)]"
          aria-hidden
        />
      </div>
    </Link>
  );
}

const STORY_ICON_MAP: Record<string, LucideIcon> = {
  Target,
  AlertTriangle,
  Flame,
  Star,
  TrendingUp,
  Award,
};

function renderStoryLine(line: string) {
  const parts = line.split(/(\[\[[^\]]+\]\])/g);
  return parts.map((part, i) => {
    if (part.startsWith("[[") && part.endsWith("]]")) {
      return <strong key={i}>{part.slice(2, -2)}</strong>;
    }
    return <span key={i}>{part}</span>;
  });
}

function StoryRow({ story }: { story: SerializedStoryRow }) {
  const Icon = STORY_ICON_MAP[story.iconName] ?? Sparkles;
  const isAchievement = story.kind === "achievement";
  const isWarning = story.kind === "warning";

  const wrapperClass = isAchievement
    ? "relative overflow-hidden bg-[linear-gradient(135deg,#ef7a1a,#f28e25,#f4a13a)] text-white"
    : isWarning
      ? "border border-[color:var(--semantic-negative)]/20 bg-[color:var(--semantic-negative)]/[0.08]"
      : "border border-[color:var(--border-soft)] bg-[color:var(--surface-1)]";

  const iconBg = isAchievement
    ? "bg-white/20 text-white"
    : isWarning
      ? "bg-[color:var(--semantic-negative)]/[0.14] text-[color:var(--semantic-negative)]"
      : "bg-[color:var(--color-brand-500)]/[0.14] text-[color:var(--color-brand-800)]";

  const eyebrowColor = isAchievement
    ? "text-white/90"
    : isWarning
      ? "text-[color:var(--semantic-negative)]"
      : "text-[color:var(--color-brand-800)]";

  const lineColor = isAchievement ? "text-white" : "text-[color:var(--text-primary)]";

  return (
    <article className={`flex items-start gap-3 rounded-xl p-4 ${wrapperClass}`}>
      <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${iconBg}`}>
        <Icon size={16} strokeWidth={2} aria-hidden />
      </span>
      <div className="min-w-0 flex-1">
        <div className={`text-[0.625rem] font-bold uppercase tracking-[0.5px] ${eyebrowColor}`}>
          {story.eyebrow}
        </div>
        <p className={`mt-1 text-[0.8125rem] font-semibold ${lineColor}`}>
          {renderStoryLine(story.line)}
        </p>
      </div>
    </article>
  );
}
