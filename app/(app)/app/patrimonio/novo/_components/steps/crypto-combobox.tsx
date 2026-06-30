"use client";

import { Search } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

import { Spinner } from "@/app/components/ui/spinner";

import { wizardInputClass } from "@/ui/wizard-field";
import { fetchCryptoPriceAction } from "../../../_actions/fetch-crypto-price.action";
import { searchCryptoAction } from "../../../_actions/search-crypto.action";

import { searchCryptoCatalog } from "./crypto-catalog";

interface CoinOption {
  id: string;
  symbol: string;
  name: string;
}

interface Placement {
  strategy: "fixed" | "absolute";
  left: number;
  top: number;
  width: number;
}

export interface CryptoComboboxProps {
  id?: string;
  value: string;
  /** sigla, coinId, preço unitário (centavos) ou null, nome da moeda. */
  onSelect: (
    symbol: string,
    coinId: string,
    unitPriceCents: bigint | null,
    name: string | null,
  ) => void;
  onChangeText: (text: string) => void;
  ariaInvalid?: boolean;
}

export function CryptoCombobox({
  id,
  value,
  onSelect,
  onChangeText,
  ariaInvalid,
}: CryptoComboboxProps) {
  const [open, setOpen] = useState(false);
  const [apiResults, setApiResults] = useState<CoinOption[]>([]);
  const [searching, setSearching] = useState(false);
  const [fetchingPrice, setFetchingPrice] = useState(false);
  const [placement, setPlacement] = useState<Placement | null>(null);
  const anchorRef = useRef<HTMLDivElement | null>(null);
  const targetRef = useRef<HTMLElement | null>(null);

  const local: CoinOption[] = searchCryptoCatalog(value).map((c) => ({
    id: c.id,
    symbol: c.symbol,
    name: c.name,
  }));
  const seen = new Set(local.map((c) => c.id));
  const results = [...local, ...apiResults.filter((c) => !seen.has(c.id))].slice(0, 10);

  function measure() {
    const el = anchorRef.current;
    const target = targetRef.current;
    if (!el || !target) return;
    const a = el.getBoundingClientRect();
    if (target === document.body) {
      setPlacement({ strategy: "fixed", left: a.left, top: a.bottom + 4, width: a.width });
      return;
    }
    const t = target.getBoundingClientRect();
    setPlacement({
      strategy: "absolute",
      left: a.left - t.left + target.scrollLeft,
      top: a.bottom - t.top + target.scrollTop + 4,
      width: a.width,
    });
  }

  useEffect(() => {
    const q = value.trim();
    if (q.length < 1 || searchCryptoCatalog(q).length >= 5) {
      setApiResults([]);
      setSearching(false);
      return;
    }
    setSearching(true);
    let cancelled = false;
    const handle = window.setTimeout(() => {
      searchCryptoAction(q)
        .then((rows) => {
          if (!cancelled) setApiResults(rows);
        })
        .catch(() => {
          if (!cancelled) setApiResults([]);
        })
        .finally(() => {
          if (!cancelled) setSearching(false);
        });
    }, 350);
    return () => {
      cancelled = true;
      window.clearTimeout(handle);
    };
  }, [value]);

  useEffect(() => {
    if (!open) return;
    targetRef.current =
      (anchorRef.current?.closest('[role="dialog"]') as HTMLElement | null) ?? document.body;
    measure();
    const onMove = () => measure();
    window.addEventListener("scroll", onMove, true);
    window.addEventListener("resize", onMove);
    return () => {
      window.removeEventListener("scroll", onMove, true);
      window.removeEventListener("resize", onMove);
    };
  }, [open]);

  async function pick(entry: CoinOption) {
    setOpen(false);
    onChangeText(entry.symbol);
    setFetchingPrice(true);
    try {
      const price = await fetchCryptoPriceAction(entry.id);
      onSelect(entry.symbol, entry.id, price ? BigInt(price.priceCents) : null, entry.name);
    } catch {
      onSelect(entry.symbol, entry.id, null, entry.name);
    } finally {
      setFetchingPrice(false);
    }
  }

  const showDropdown = open && (results.length > 0 || (searching && value.trim().length > 0));

  return (
    <div ref={anchorRef} className="relative">
      <input
        id={id}
        type="text"
        value={value}
        onChange={(e) => {
          onChangeText(e.target.value.toUpperCase());
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        placeholder="Ex: BTC, Worldcoin..."
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
        {fetchingPrice || searching ? <Spinner size={16} /> : <Search size={16} strokeWidth={2} />}
      </span>

      {showDropdown && placement && targetRef.current
        ? createPortal(
            <>
              <div
                className="fixed inset-0 z-40"
                style={{ pointerEvents: "auto" }}
                aria-hidden
                onMouseDown={() => setOpen(false)}
              />
              <div
                role="listbox"
                style={{
                  position: placement.strategy,
                  left: placement.left,
                  top: placement.top,
                  width: placement.width,
                  zIndex: 50,
                  pointerEvents: "auto",
                }}
                className="max-h-72 overflow-auto rounded-xl border border-[color:var(--border-soft)] bg-[color:var(--surface-solid)] p-1 shadow-lg"
              >
                {value.trim().length === 0 && results.length > 0 ? (
                  <div className="px-3 pb-1 pt-1.5 text-[0.625rem] font-semibold uppercase tracking-wide text-[color:var(--text-secondary)]">
                    Mais buscadas
                  </div>
                ) : null}
                {results.map((r) => (
                  <button
                    type="button"
                    key={r.id}
                    role="option"
                    aria-selected={r.symbol === value.trim().toUpperCase()}
                    onClick={() => {
                      void pick(r);
                    }}
                    className="focus-ring flex w-full items-center justify-between gap-2 rounded-lg px-3 py-2 text-left transition-colors hover:bg-[color:var(--color-brand-500)]/10"
                  >
                    <span className="flex flex-col">
                      <span className="text-[0.8125rem] font-bold text-[color:var(--text-primary)]">
                        {r.symbol}
                      </span>
                      <span className="text-[0.6875rem] text-[color:var(--text-secondary)]">
                        {r.name}
                      </span>
                    </span>
                  </button>
                ))}
                {results.length === 0 && searching ? (
                  <div className="flex justify-center py-3">
                    <Spinner size={16} />
                  </div>
                ) : null}
                {results.length > 0 && apiResults.length === 0 && !searching ? (
                  <div className="mt-1 border-t border-[color:var(--border-soft)] px-3 py-2 text-[0.6875rem] text-[color:var(--text-secondary)]">
                    Não achou? Digite o nome da sua moeda.
                  </div>
                ) : null}
              </div>
            </>,
            targetRef.current,
          )
        : null}
    </div>
  );
}
