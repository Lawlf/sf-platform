"use client";

import { useInfiniteQuery } from "@tanstack/react-query";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { HideableValue } from "@/app/(app)/app/_components/money-visibility/hideable-value.client";
import { Skeleton } from "@/app/components/ui/skeleton";

import {
  fetchAccountTransactionsPage,
  type AccountMonthSummary,
  type AccountTxnPagePayload,
  type SerializedAccountTxn,
} from "../../_actions/account-transactions-queries";
import { AccountTxnRow } from "../../_components/account-transaction-row";

type Cursor = { occurredAtIso: string; id: string } | null;

interface Props {
  accountId: string;
  framing: "extrato" | "lancamentos";
  initialPage: AccountTxnPagePayload | null;
  monthSummaries: AccountMonthSummary[];
}

const MONTHS_SHORT = [
  "jan",
  "fev",
  "mar",
  "abr",
  "mai",
  "jun",
  "jul",
  "ago",
  "set",
  "out",
  "nov",
  "dez",
];

const MONTHS_FULL = [
  "Janeiro",
  "Fevereiro",
  "Março",
  "Abril",
  "Maio",
  "Junho",
  "Julho",
  "Agosto",
  "Setembro",
  "Outubro",
  "Novembro",
  "Dezembro",
];

function monthKey(iso: string): string {
  return iso.slice(0, 7);
}

function parseKey(key: string): { year: number; month: number } {
  const [y, m] = key.split("-").map(Number);
  return { year: y ?? 1970, month: m ?? 1 };
}

function monthLabelFull(key: string): string {
  const { year, month } = parseKey(key);
  return `${MONTHS_FULL[month - 1] ?? ""} ${year}`;
}

function chipLabel(key: string, showYear: boolean): string {
  const { year, month } = parseKey(key);
  const m = (MONTHS_SHORT[month - 1] ?? "").replace(/^(.)/, (c) => c.toUpperCase());
  return showYear ? `${m} ${String(year).slice(2)}` : m;
}

function fmtMoney(cents: string, currency: string): string {
  return (Number(cents) / 100).toLocaleString("pt-BR", {
    style: "currency",
    currency: currency || "BRL",
  });
}

function MonthTotals({ summary }: { summary: AccountMonthSummary | undefined }) {
  if (!summary) return null;
  const hasIn = BigInt(summary.inCents) > 0n;
  const hasOut = BigInt(summary.outCents) > 0n;
  return (
    <div className="flex items-center gap-3 text-[0.6875rem] font-semibold">
      {hasIn ? (
        <span className="text-[color:var(--semantic-positive)]">
          Entrou <HideableValue>{fmtMoney(summary.inCents, summary.currency)}</HideableValue>
        </span>
      ) : null}
      {hasOut ? (
        <span className="text-[color:var(--text-secondary)]">
          Saiu <HideableValue>{fmtMoney(summary.outCents, summary.currency)}</HideableValue>
        </span>
      ) : null}
    </div>
  );
}

export function AccountMovementsView({ accountId, framing, initialPage, monthSummaries }: Props) {
  const { data, fetchNextPage, hasNextPage, isFetchingNextPage } = useInfiniteQuery<
    AccountTxnPagePayload | null,
    Error,
    { pages: (AccountTxnPagePayload | null)[]; pageParams: Cursor[] },
    [string, string],
    Cursor
  >({
    queryKey: ["account-txns", accountId],
    queryFn: ({ pageParam }) =>
      fetchAccountTransactionsPage({
        accountId,
        ...(pageParam
          ? { beforeOccurredAtIso: pageParam.occurredAtIso, beforeId: pageParam.id }
          : {}),
      }),
    initialPageParam: null,
    getNextPageParam: (last) => last?.nextCursor ?? null,
    ...(initialPage
      ? { initialData: { pages: [initialPage], pageParams: [null] as Cursor[] } }
      : {}),
    staleTime: 60 * 1000,
  });

  const items = useMemo(
    () => (data?.pages ?? []).flatMap((p) => p?.items ?? []),
    [data?.pages],
  );

  const summaryByKey = useMemo(() => {
    const m = new Map<string, AccountMonthSummary>();
    for (const s of monthSummaries) m.set(s.key, s);
    return m;
  }, [monthSummaries]);

  const groups = useMemo(() => {
    const map = new Map<string, SerializedAccountTxn[]>();
    for (const t of items) {
      const key = monthKey(t.occurredAtIso);
      const arr = map.get(key);
      if (arr) arr.push(t);
      else map.set(key, [t]);
    }
    return [...map.entries()];
  }, [items]);

  const loadedKeys = useMemo(() => new Set(groups.map(([k]) => k)), [groups]);

  // Jump-to-month: paga até o mês alvo carregar, então rola até a âncora.
  const [targetKey, setTargetKey] = useState<string | null>(null);
  useEffect(() => {
    if (!targetKey) return;
    if (loadedKeys.has(targetKey)) {
      const el = document.getElementById(`m-${targetKey}`);
      if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
      setTargetKey(null);
      return;
    }
    if (hasNextPage && !isFetchingNextPage) void fetchNextPage();
  }, [targetKey, loadedKeys, hasNextPage, isFetchingNextPage, fetchNextPage]);

  const jumpTo = useCallback((key: string) => setTargetKey(key), []);

  const sentinelRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel || !hasNextPage || isFetchingNextPage || targetKey) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) void fetchNextPage();
      },
      { rootMargin: "300px" },
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage, targetKey]);

  if (monthSummaries.length === 0) {
    return (
      <p className="rounded-2xl border border-[color:var(--border-soft)] bg-[color:var(--surface-1)] p-6 text-center text-[0.8125rem] text-[color:var(--text-muted)]">
        {framing === "extrato"
          ? "Nenhuma movimentação importada nesta conta."
          : "Você ainda não lançou nada nesta conta."}
      </p>
    );
  }

  const newest = monthSummaries[0]!.key;
  const oldest = monthSummaries[monthSummaries.length - 1]!.key;
  const rangeText =
    monthSummaries.length === 1
      ? `1 mês (${monthLabelFull(newest)})`
      : `${monthSummaries.length} meses, de ${monthLabelFull(oldest)} a ${monthLabelFull(newest)}`;

  return (
    <div className="flex flex-col pb-12">
      <p className="text-[0.75rem] text-[color:var(--text-muted)]">
        {framing === "extrato" ? "Importado do extrato · " : "Seus lançamentos · "}
        {rangeText}.
      </p>

      <div className="sticky top-[58px] z-20 -mx-4 mt-3 bg-[color:var(--surface-1)]/90 px-4 py-2 backdrop-blur-md md:top-[56px]">
        <div className="flex gap-1.5 overflow-x-auto pb-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {monthSummaries.map((s, i) => {
            const { year } = parseKey(s.key);
            const prevYear = i > 0 ? parseKey(monthSummaries[i - 1]!.key).year : year;
            const showYear = i === 0 || year !== prevYear;
            return (
              <button
                key={s.key}
                type="button"
                onClick={() => jumpTo(s.key)}
                className="focus-ring shrink-0 rounded-full border border-[color:var(--border-soft)] bg-[color:var(--surface-2)] px-2.5 py-1 text-[0.6875rem] font-bold text-[color:var(--text-secondary)] transition-colors hover:bg-[color:var(--surface-1)] hover:text-[color:var(--text-primary)]"
              >
                {chipLabel(s.key, showYear)}
              </button>
            );
          })}
        </div>
      </div>

      <div className="mt-3 flex flex-col gap-6">
        {groups.map(([key, rows]) => (
          <section key={key} id={`m-${key}`} className="scroll-mt-[112px] md:scroll-mt-[108px]">
            <div className="sticky top-[104px] z-10 -mx-4 flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5 bg-[color:var(--surface-1)]/90 px-4 py-1.5 backdrop-blur-md md:top-[100px]">
              <h2 className="text-sm font-bold text-[color:var(--text-primary)]">
                {monthLabelFull(key)}
              </h2>
              <MonthTotals summary={summaryByKey.get(key)} />
            </div>
            <ul className="mt-2 flex flex-col gap-2">
              {rows.map((t) => (
                <AccountTxnRow key={t.id} txn={t} />
              ))}
            </ul>
          </section>
        ))}

        <div ref={sentinelRef} aria-hidden />

        {isFetchingNextPage ? (
          <div className="flex flex-col gap-2">
            <Skeleton className="h-14 rounded-xl" />
            <Skeleton className="h-14 rounded-xl" />
          </div>
        ) : null}

        {!hasNextPage ? (
          <p className="py-2 text-center text-[0.75rem] text-[color:var(--text-muted)]">
            Você chegou ao começo desta conta.
          </p>
        ) : null}
      </div>
    </div>
  );
}
