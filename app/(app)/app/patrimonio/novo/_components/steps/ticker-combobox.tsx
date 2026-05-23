"use client";

import { Search } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import {
  searchStockCatalogAction,
  type StockCatalogSearchResult,
} from "../../../../_actions/search-stock-catalog.action";
import { wizardInputClass } from "../../../../dividas/nova/_components/wizard-field";

export interface TickerComboboxProps {
  id?: string;
  value: string;
  onSelect: (ticker: string, lastPriceCents: bigint | null, companyName: string | null) => void;
  onChangeText: (text: string) => void;
  ariaInvalid?: boolean;
}

function formatPrice(cents: string | null): string | null {
  if (cents === null) return null;
  try {
    const reais = Number(BigInt(cents)) / 100;
    return reais.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  } catch {
    return null;
  }
}

export function TickerCombobox({
  id,
  value,
  onSelect,
  onChangeText,
  ariaInvalid,
}: TickerComboboxProps) {
  const [results, setResults] = useState<StockCatalogSearchResult[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const wrapperRef = useRef<HTMLDivElement | null>(null);

  // Debounced search whenever the input text changes.
  useEffect(() => {
    const q = value.trim();
    if (q.length < 1) {
      setResults([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    let cancelled = false;
    const handle = window.setTimeout(() => {
      searchStockCatalogAction(q)
        .then((rows) => {
          if (cancelled) return;
          setResults(rows);
          setOpen(true);
        })
        .catch(() => {
          if (cancelled) return;
          setResults([]);
        })
        .finally(() => {
          if (!cancelled) setLoading(false);
        });
    }, 300);
    return () => {
      cancelled = true;
      window.clearTimeout(handle);
    };
  }, [value]);

  // Click-outside dismissal of dropdown.
  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (!wrapperRef.current) return;
      if (!wrapperRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  return (
    <div ref={wrapperRef} className="relative">
      <div className="relative">
        <input
          id={id}
          type="text"
          value={value}
          onChange={(e) => {
            const next = e.target.value.toUpperCase();
            onChangeText(next);
          }}
          onFocus={() => {
            if (results.length > 0) setOpen(true);
          }}
          placeholder="Ex: PETR4 ou Petrobras"
          autoCapitalize="characters"
          spellCheck={false}
          autoComplete="off"
          aria-autocomplete="list"
          aria-invalid={ariaInvalid}
          className={`${wizardInputClass} pr-9 uppercase`}
        />
        <span
          className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[color:var(--text-secondary)]"
          aria-hidden
        >
          <Search size={16} strokeWidth={2} />
        </span>
      </div>
      {open ? (
        <div
          role="listbox"
          className="absolute z-30 mt-1 max-h-72 w-full overflow-auto rounded-xl border border-[color:var(--border-soft)] bg-[color:var(--surface-1)] p-1 shadow-lg backdrop-blur-md"
        >
          {loading ? (
            <div className="px-3 py-2 text-[0.75rem] text-[color:var(--text-secondary)]">
              Buscando...
            </div>
          ) : results.length > 0 ? (
            <>
              {results.map((r) => {
                const price = formatPrice(r.lastPriceCents);
                return (
                  <button
                    type="button"
                    key={r.ticker}
                    role="option"
                    aria-selected={r.ticker === value.trim().toUpperCase()}
                    onClick={() => {
                      onSelect(
                        r.ticker,
                        r.lastPriceCents !== null ? BigInt(r.lastPriceCents) : null,
                        r.companyName,
                      );
                      setOpen(false);
                    }}
                    className="focus-ring flex w-full items-center justify-between gap-2 rounded-lg px-3 py-2 text-left transition-colors hover:bg-[color:var(--color-brand-500)]/10"
                  >
                    <span className="flex flex-col">
                      <span className="text-[0.8125rem] font-bold text-[color:var(--text-primary)]">
                        {r.ticker}
                      </span>
                      {r.companyName ? (
                        <span className="text-[0.6875rem] text-[color:var(--text-secondary)]">
                          {r.companyName}
                        </span>
                      ) : null}
                    </span>
                    {price ? (
                      <span className="shrink-0 text-[0.75rem] font-semibold text-[color:var(--color-brand-800)]">
                        {price}
                      </span>
                    ) : null}
                  </button>
                );
              })}
              <p className="px-3 pb-2 pt-1 text-[0.6875rem] leading-snug text-[color:var(--text-secondary)]">
                Os tickers mais populares da B3 são listados aqui. Pode usar qualquer ticker mesmo
                que não esteja na lista.
              </p>
            </>
          ) : value.trim().length > 0 ? (
            <div className="flex flex-col gap-2 px-3 py-3">
              <p className="text-[0.75rem] leading-snug text-[color:var(--text-secondary)]">
                Nenhum ticker encontrado. Use{" "}
                <span className="font-semibold text-[color:var(--text-primary)]">
                  {value.trim().toUpperCase()}
                </span>{" "}
                mesmo assim?
              </p>
              <button
                type="button"
                onClick={() => {
                  onSelect(value.trim().toUpperCase(), null, null);
                  setOpen(false);
                }}
                className="focus-ring inline-flex w-full items-center justify-center rounded-lg border border-[color:var(--border-soft)] bg-[color:var(--surface-1)] px-3 py-2 text-[0.75rem] font-semibold text-[color:var(--text-primary)] transition-colors hover:bg-[color:var(--color-brand-500)]/10"
              >
                Usar ticker {value.trim().toUpperCase()}
              </button>
              <p className="text-[0.6875rem] leading-snug text-[color:var(--text-secondary)]">
                Os tickers mais populares da B3 são listados aqui. Pode usar qualquer ticker mesmo
                que não esteja na lista.
              </p>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
