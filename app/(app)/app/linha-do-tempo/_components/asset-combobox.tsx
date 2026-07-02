"use client";

import { Car, Check, ChevronDown, Home, Landmark, Package, Plus, Search } from "lucide-react";
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

import { createQuickAssetAction } from "../_actions/create-quick-asset.action";
import type { AttributableAssetOption } from "../_actions/list-attributable-assets.action";

interface Rect {
  top: number;
  left: number;
  width: number;
}

function assetCategoryIcon(category: AttributableAssetOption["category"]) {
  if (category === "vehicle") return Car;
  if (category === "real_estate") return Home;
  if (category === "investment") return Landmark;
  return Package;
}

export interface AssetComboboxProps {
  ariaLabelledBy?: string;
  value: string;
  onChange: (assetId: string) => void;
  options: AttributableAssetOption[];
  onCreated?: (asset: AttributableAssetOption) => void;
}

export function AssetCombobox({
  ariaLabelledBy,
  value,
  onChange,
  options,
  onCreated,
}: AssetComboboxProps) {
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

  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return options;
    return options.filter((o) => o.label.toLowerCase().includes(term));
  }, [options, query]);

  const selected = options.find((o) => o.id === value) ?? null;
  const SelectedIcon = selected ? assetCategoryIcon(selected.category) : null;

  function createAsset() {
    const label = newLabel.trim();
    if (label.length === 0) return;
    startCreate(async () => {
      const r = await createQuickAssetAction({ label });
      if (!r.ok) {
        toast.error(r.message);
        return;
      }
      onCreated?.(r.data.asset);
      onChange(r.data.asset.id);
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
        {selected && SelectedIcon ? (
          <SelectedIcon
            size={16}
            strokeWidth={2}
            className="shrink-0 text-[color:var(--text-secondary)]"
            aria-hidden
          />
        ) : null}
        <span className={`flex-1 truncate ${selected ? "" : "text-[color:var(--text-muted)]"}`}>
          {selected ? selected.label : "Nenhum"}
        </span>
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
                  placeholder="Buscar bem"
                  className="w-full bg-transparent text-[0.8125rem] text-[color:var(--text-primary)] outline-none placeholder:text-[color:var(--text-muted)]"
                />
              </div>
              <div role="listbox" className="overflow-auto p-1">
                <button
                  type="button"
                  role="option"
                  aria-selected={value === ""}
                  onClick={() => {
                    onChange("");
                    setOpen(false);
                  }}
                  className="focus-ring flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-[0.8125rem] font-medium text-[color:var(--text-primary)] transition-colors hover:bg-[color:var(--color-brand-500)]/10"
                >
                  {value === "" ? (
                    <Check
                      size={14}
                      strokeWidth={2.5}
                      className="shrink-0 text-[color:var(--color-brand-500)]"
                      aria-hidden
                    />
                  ) : (
                    <span className="w-[14px] shrink-0" aria-hidden />
                  )}
                  Nenhum
                </button>
                {filtered.length === 0 ? (
                  <p className="px-3 py-2 text-[0.75rem] text-[color:var(--text-secondary)]">
                    Nada encontrado.
                  </p>
                ) : (
                  filtered.map((a) => {
                    const Icon = assetCategoryIcon(a.category);
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
                          <Icon
                            size={14}
                            strokeWidth={2}
                            className="shrink-0 text-[color:var(--text-secondary)]"
                            aria-hidden
                          />
                        )}
                        {a.label}
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
                  Novo bem
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
            <SheetTitle>Novo bem</SheetTitle>
            <SheetDescription>
              Só o nome por agora. Dá pra ajustar categoria e valor depois no Patrimônio.
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
                createAsset();
              }
            }}
            placeholder="Nome do bem, ex: Bicicleta"
            className={wizardInputClass}
          />
          <Button type="button" variant="brand" loading={createPending} onClick={createAsset}>
            Criar bem
          </Button>
        </SheetContent>
      </Sheet>
    </div>
  );
}
