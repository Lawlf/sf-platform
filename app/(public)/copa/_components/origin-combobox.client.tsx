"use client";

import { Check, Loader2, LocateFixed, MapPin } from "lucide-react";
import { useEffect, useId, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { toast } from "sonner";

import { haversineKm } from "@/domain/services/geo-distance";

import { BR_AIRPORTS, searchAirports, type BrAirport } from "../_lib/br-airports";

type Rect = { top: number; left: number; width: number };

function airportLabel(a: BrAirport): string {
  return `${a.city}${a.name ? ` · ${a.name}` : ""} (${a.iata})`;
}

export function OriginCombobox({
  value,
  onSelect,
}: {
  value: BrAirport | null;
  onSelect: (airport: BrAirport) => void;
}) {
  const listId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [mounted, setMounted] = useState(false);
  const [query, setQuery] = useState(() => (value ? airportLabel(value) : ""));
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const [rect, setRect] = useState<Rect | null>(null);
  const [locating, setLocating] = useState(false);

  useEffect(() => setMounted(true), []);

  function locateMe() {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      toast.error("Seu navegador não suporta localização. Digite sua cidade.");
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const me = { lat: pos.coords.latitude, lon: pos.coords.longitude };
        let best: BrAirport | undefined;
        let bestKm = Infinity;
        for (const a of BR_AIRPORTS) {
          const km = haversineKm(me, a);
          if (km < bestKm) {
            bestKm = km;
            best = a;
          }
        }
        if (best) {
          onSelect(best);
          setQuery(airportLabel(best));
        }
        setOpen(false);
        setLocating(false);
      },
      (err) => {
        setLocating(false);
        toast.error(
          err.code === err.PERMISSION_DENIED
            ? "Permissão de localização negada. Digite sua cidade."
            : "Não consegui te localizar agora. Digite sua cidade.",
        );
      },
      { timeout: 10000, maximumAge: 300000 },
    );
  }

  const results = useMemo(
    () => (query.trim() ? searchAirports(query) : [...BR_AIRPORTS]),
    [query],
  );

  useEffect(() => {
    if (!open) return;
    function measure() {
      const el = inputRef.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      setRect({ top: r.bottom + 6, left: r.left, width: r.width });
    }
    measure();
    window.addEventListener("scroll", measure, true);
    window.addEventListener("resize", measure);
    return () => {
      window.removeEventListener("scroll", measure, true);
      window.removeEventListener("resize", measure);
    };
  }, [open]);

  function choose(airport: BrAirport) {
    onSelect(airport);
    setQuery(airportLabel(airport));
    setOpen(false);
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setOpen(true);
      setActiveIndex((i) => Math.min(results.length - 1, i + 1));
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex((i) => Math.max(0, i - 1));
    } else if (event.key === "Enter") {
      const pick = results[activeIndex];
      if (pick) {
        event.preventDefault();
        choose(pick);
      }
    } else if (event.key === "Escape") {
      setOpen(false);
    }
  }

  const showList = mounted && open && rect !== null && results.length > 0;

  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-[0.8125rem] font-semibold text-[color:var(--text-primary)]">
        Aeroporto mais próximo de você
      </span>
      <div className="relative flex items-center gap-2 rounded-xl border border-[color:var(--border-soft)] bg-[color:var(--surface-1)] px-3 backdrop-blur-xl focus-within:border-[color:var(--color-brand-500)]">
        <MapPin size={16} strokeWidth={1.75} className="shrink-0 text-[color:var(--text-muted)]" aria-hidden />
        <input
          ref={inputRef}
          value={query}
          role="combobox"
          aria-expanded={showList}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-label="Aeroporto mais próximo de você"
          placeholder="Digite sua cidade pra achar o aeroporto mais perto"
          className="h-11 w-full bg-transparent text-[0.9375rem] text-[color:var(--text-primary)] outline-none placeholder:text-[color:var(--text-muted)]"
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
            setActiveIndex(0);
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => setOpen(false)}
          onKeyDown={handleKeyDown}
        />
      </div>

      <button
        type="button"
        onClick={locateMe}
        disabled={locating}
        className="focus-ring inline-flex items-center gap-1.5 self-start rounded-lg text-[0.75rem] font-semibold text-[color:var(--color-brand-700)] transition-opacity disabled:opacity-50"
      >
        {locating ? (
          <Loader2 size={14} strokeWidth={2} className="animate-spin" aria-hidden />
        ) : (
          <LocateFixed size={14} strokeWidth={2} aria-hidden />
        )}
        Usar minha localização
      </button>

      {showList
        ? createPortal(
            <ul
              id={listId}
              role="listbox"
              onMouseDown={(e) => e.preventDefault()}
              style={{ position: "fixed", top: rect.top, left: rect.left, width: rect.width, zIndex: 60 }}
              className="max-h-64 overflow-auto rounded-xl border border-[color:var(--border-soft)] bg-[color:var(--surface-solid)] p-1 shadow-[0_12px_40px_rgba(31,29,28,0.18)]"
            >
              {results.map((a, i) => {
                const isSelected = value?.iata === a.iata;
                const isActive = i === activeIndex;
                return (
                  <li key={a.iata} role="option" aria-selected={isSelected}>
                    <button
                      type="button"
                      onClick={() => choose(a)}
                      onMouseEnter={() => setActiveIndex(i)}
                      className={`focus-ring flex w-full items-center justify-between gap-3 rounded-lg px-3 py-2 text-left text-[0.875rem] transition-colors ${
                        isActive
                          ? "bg-[color:var(--surface-2)] text-[color:var(--text-primary)]"
                          : "text-[color:var(--text-primary)]"
                      }`}
                    >
                      <span className="flex min-w-0 items-center gap-2">
                        {isSelected ? (
                          <Check size={14} strokeWidth={2.5} className="shrink-0 text-[color:var(--color-brand-500)]" aria-hidden />
                        ) : null}
                        <span className="truncate">{a.city}</span>
                        {a.name ? (
                          <span className="shrink-0 text-[0.75rem] text-[color:var(--text-muted)]">{a.name}</span>
                        ) : null}
                      </span>
                      <span className="shrink-0 text-[0.75rem] font-semibold text-[color:var(--text-muted)]">
                        {a.iata} · {a.uf}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>,
            document.body,
          )
        : null}
    </div>
  );
}
