"use client";

import { Check, ChevronDown, Plus, Search, Wallet } from "lucide-react";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { createPortal } from "react-dom";
import { toast } from "sonner";

import { Button } from "@/app/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/app/components/ui/sheet";
import { wizardInputClass } from "@/ui/wizard-field";

import { createCashAccount } from "../_actions/create-cash-account.action";
import type { CashAccountOption } from "../_actions/list-cash-accounts.action";

interface Rect {
  top: number;
  left: number;
  width: number;
}

const DEFAULT_ACCOUNT_VALUE = "__default__";

export interface AccountComboboxProps {
  ariaLabelledBy?: string;
  value: string;
  onChange: (accountId: string) => void;
  options: CashAccountOption[];
  onCreated?: (account: CashAccountOption) => void;
}

export function AccountCombobox({
  ariaLabelledBy,
  value,
  onChange,
  options,
  onCreated,
}: AccountComboboxProps) {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [query, setQuery] = useState("");
  const [rect, setRect] = useState<Rect | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [newLabel, setNewLabel] = useState("");
  const [createPending, startCreate] = useTransition();
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const searchRef = useRef<HTMLInputElement | null>(null);
  const popoverRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => setMounted(true), []);

  function updateRect() {
    const el = triggerRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    setRect({ top: r.bottom + 4, left: r.left, width: r.width });
  }

  useEffect(() => {
    if (!open) return;
    updateRect();
    setQuery("");
    searchRef.current?.focus();
    function onMove() {
      updateRect();
    }
    function onDocClick(e: MouseEvent) {
      const t = e.target as Node;
      if (triggerRef.current?.contains(t)) return;
      if (popoverRef.current?.contains(t)) return;
      setOpen(false);
    }
    window.addEventListener("scroll", onMove, true);
    window.addEventListener("resize", onMove);
    document.addEventListener("mousedown", onDocClick);
    return () => {
      window.removeEventListener("scroll", onMove, true);
      window.removeEventListener("resize", onMove);
      document.removeEventListener("mousedown", onDocClick);
    };
  }, [open]);

  const items: CashAccountOption[] = useMemo(
    () =>
      options.length > 0
        ? options
        : [
            {
              id: DEFAULT_ACCOUNT_VALUE,
              label: "Carteira",
              currency: "BRL",
              isReserve: false,
              isBase: true,
            },
          ],
    [options],
  );

  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return items;
    return items.filter((o) => o.label.toLowerCase().includes(term));
  }, [items, query]);

  const selected = items.find((o) => o.id === value) ?? null;

  function createAccount() {
    const label = newLabel.trim();
    if (label.length === 0) return;
    startCreate(async () => {
      const r = await createCashAccount({ label });
      if (!r.ok) {
        toast.error(r.message);
        return;
      }
      onCreated?.(r.data.account);
      onChange(r.data.account.id);
      setNewLabel("");
      setShowCreate(false);
      setOpen(false);
    });
  }

  return (
    <div className="relative">
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-labelledby={ariaLabelledBy}
        className="focus-ring flex h-11 w-full items-center gap-2 rounded-xl border-[1.5px] border-[color:var(--border-soft)] bg-[color:var(--surface-1)] px-3.5 text-left text-[0.875rem] text-[color:var(--text-primary)] transition-colors hover:border-[color:var(--border-strong)]"
      >
        <Wallet
          size={16}
          strokeWidth={2}
          className="shrink-0 text-[color:var(--text-secondary)]"
          aria-hidden
        />
        <span className="flex-1 truncate">{selected ? selected.label : "Carteira"}</span>
        {selected && selected.currency !== "BRL" ? (
          <span className="shrink-0 rounded-md bg-[color:var(--surface-2)] px-1.5 py-0.5 text-[0.625rem] font-bold uppercase tracking-[0.5px] text-[color:var(--text-secondary)]">
            {selected.currency}
          </span>
        ) : null}
        <ChevronDown
          size={16}
          strokeWidth={2}
          className="shrink-0 text-[color:var(--text-secondary)]"
          aria-hidden
        />
      </button>

      {open && mounted && rect
        ? createPortal(
            <div
              ref={popoverRef}
              style={{ position: "fixed", top: rect.top, left: rect.left, width: rect.width, zIndex: 100 }}
              className="glass-floating flex max-h-80 flex-col overflow-hidden"
            >
              <div className="flex items-center gap-2 border-b border-[color:var(--border-soft)] px-3 py-2">
                <Search
                  size={14}
                  strokeWidth={2}
                  className="shrink-0 text-[color:var(--text-muted)]"
                  aria-hidden
                />
                <input
                  ref={searchRef}
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Buscar conta"
                  className="w-full bg-transparent text-[0.8125rem] text-[color:var(--text-primary)] outline-none placeholder:text-[color:var(--text-muted)]"
                />
              </div>
              <div role="listbox" className="overflow-auto p-1">
                {filtered.length === 0 ? (
                  <p className="px-3 py-2 text-[0.75rem] text-[color:var(--text-secondary)]">
                    Nada encontrado.
                  </p>
                ) : (
                  filtered.map((a) => {
                    const isSelected = a.id === value;
                    return (
                      <button
                        key={a.id}
                        type="button"
                        role="option"
                        aria-selected={isSelected}
                        onClick={() => {
                          onChange(a.id);
                          setOpen(false);
                        }}
                        className="focus-ring flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-[0.8125rem] font-medium text-[color:var(--text-primary)] transition-colors hover:bg-[color:var(--color-brand-500)]/10"
                      >
                        {isSelected ? (
                          <Check
                            size={14}
                            strokeWidth={2.5}
                            className="shrink-0 text-[color:var(--color-brand-500)]"
                            aria-hidden
                          />
                        ) : (
                          <Wallet
                            size={14}
                            strokeWidth={2}
                            className="shrink-0 text-[color:var(--text-secondary)]"
                            aria-hidden
                          />
                        )}
                        <span className="flex-1 truncate">{a.label}</span>
                        {a.currency !== "BRL" ? (
                          <span className="shrink-0 rounded-md bg-[color:var(--surface-2)] px-1.5 py-0.5 text-[0.625rem] font-bold uppercase tracking-[0.5px] text-[color:var(--text-secondary)]">
                            {a.currency}
                          </span>
                        ) : null}
                      </button>
                    );
                  })
                )}
              </div>
              <div className="border-t border-[color:var(--border-soft)] p-1">
                <button
                  type="button"
                  onClick={() => {
                    setShowCreate(true);
                    setOpen(false);
                  }}
                  className="focus-ring flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-[0.8125rem] font-semibold text-[color:var(--color-brand-500)] transition-colors hover:bg-[color:var(--color-brand-500)]/10"
                >
                  <Plus size={14} strokeWidth={2.5} aria-hidden />
                  Nova conta
                </button>
              </div>
            </div>,
            document.body,
          )
        : null}

      <Sheet
        open={showCreate}
        onOpenChange={(o) => {
          setShowCreate(o);
          if (!o) setNewLabel("");
        }}
      >
        <SheetContent side="bottom" className="flex flex-col gap-4">
          <SheetHeader>
            <SheetTitle>Nova conta</SheetTitle>
            <SheetDescription>
              Um lugar pra guardar e movimentar dinheiro: Nubank, poupança, dinheiro vivo.
            </SheetDescription>
          </SheetHeader>
          <input
            type="text"
            autoComplete="off"
            value={newLabel}
            onChange={(e) => setNewLabel(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                createAccount();
              }
            }}
            placeholder="Nome da conta, ex: Nubank"
            className={wizardInputClass}
          />
          <Button type="button" variant="brand" loading={createPending} onClick={createAccount}>
            Criar conta
          </Button>
        </SheetContent>
      </Sheet>
    </div>
  );
}
