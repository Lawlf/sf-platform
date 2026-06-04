import {
  AlertTriangle,
  ArrowRight,
  Award,
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

  const totalIncomeCents = sumCents(data.incomes);
  const totalOutflowCents = sumCents(data.expenses) + sumCents(data.payments);
  const freeBalanceCents = totalIncomeCents - totalOutflowCents;

  const entries: TimelineEntry[] = [
    ...data.incomes.map<TimelineEntry>((i) => ({ kind: "income", dateIso: i.dateIso, data: i })),
    ...data.expenses.map<TimelineEntry>((e) => ({ kind: "expense", dateIso: e.dateIso, data: e })),
    ...data.payments.map<TimelineEntry>((p) => ({ kind: "payment", dateIso: p.dateIso, data: p })),
    ...data.stories.map<TimelineEntry>((s) => ({ kind: "story", dateIso: s.dateIso, data: s })),
    ...data.events.map<TimelineEntry>((e) => ({ kind: "event", dateIso: e.dateIso, data: e })),
  ];
  entries.sort((a, b) => b.dateIso.localeCompare(a.dateIso));

  const grouped = new Map<string, TimelineEntry[]>();
  for (const entry of entries) {
    const key = dayKey(entry.dateIso);
    const list = grouped.get(key) ?? [];
    list.push(entry);
    grouped.set(key, list);
  }
  const sortedDays = Array.from(grouped.keys()).sort((a, b) => b.localeCompare(a));

  return (
    <PageShell
      title={monthLabel}
      description="Tudo que entrou, saiu e ficou nesse mês."
      backHref={"/app/linha-do-tempo" as Route}
    >
      <section className="rounded-[18px] border border-[color:var(--border-soft)] bg-[color:var(--surface-1)] p-4 backdrop-blur-xl md:p-5">
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <Kpi
            label="Saldo livre"
            value={formatBrl(freeBalanceCents)}
            tone={freeBalanceCents < 0n ? "negative" : "positive"}
          />
          <Kpi label="Renda" value={formatBrl(totalIncomeCents)} tone="positive" />
          <Kpi label="Saídas" value={formatBrl(totalOutflowCents)} tone="negative" />
          <Kpi
            label="Patrimônio"
            value={data.patrimony.current.netWorth.formatted}
            tone={patrimonyTone(data.patrimony)}
          />
        </div>
      </section>

      {entries.length === 0 ? (
        <p className="py-6 text-center text-[0.8125rem] text-[color:var(--text-muted)]">
          Nenhuma movimentação registrada nesse mês.
        </p>
      ) : (
        <div className="flex flex-col gap-4">
          {sortedDays.map((day) => {
            const dayEntries = grouped.get(day) ?? [];
            const date = new Date(`${day}T00:00:00Z`);
            const label = DAY_FMT.format(date).replace(",", "").toUpperCase();
            return (
              <section key={day} className="flex flex-col gap-2">
                <header className="px-1">
                  <span className="text-[0.6875rem] font-bold uppercase tracking-[0.5px] text-[color:var(--text-secondary)]">
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
      )}
    </PageShell>
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

function Kpi({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: "positive" | "negative" | "brand" | "muted";
}) {
  const color =
    tone === "positive"
      ? "text-[color:var(--semantic-positive)]"
      : tone === "negative"
        ? "text-[color:var(--semantic-negative)]"
        : tone === "muted"
          ? "text-[color:var(--text-muted)]"
          : "text-[color:var(--color-brand-800)]";
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-[0.5625rem] font-bold uppercase tracking-[0.5px] text-[color:var(--text-muted)]">
        {label}
      </span>
      <span className={`text-[0.9375rem] font-extrabold ${color}`}>{value}</span>
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
  value,
}: {
  href: Route;
  icon: LucideIcon;
  tone: "positive" | "negative" | "neutral";
  label: string;
  meta: string;
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
        <div className="truncate text-[0.875rem] font-bold text-[color:var(--text-primary)]">
          {label}
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
