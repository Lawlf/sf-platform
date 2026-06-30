"use client";

import { ChevronDown } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

import { BRAZILIAN_BANKS, filterBankOptions } from "../_lib/brazilian-banks";

import { wizardInputClass } from "@/ui/wizard-field";

export interface BankComboboxProps {
  id?: string;
  value: string;
  onChange: (bank: string) => void;
  placeholder?: string;
  ariaInvalid?: boolean | undefined;
}

interface Rect {
  top: number;
  left: number;
  width: number;
}

export function BankCombobox({
  id,
  value,
  onChange,
  placeholder,
  ariaInvalid,
}: BankComboboxProps) {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [rect, setRect] = useState<Rect | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const listRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => setMounted(true), []);

  function updateRect() {
    const el = inputRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    setRect({ top: r.bottom + 4, left: r.left, width: r.width });
  }

  useEffect(() => {
    if (!open) return;
    updateRect();
    function onMove() {
      updateRect();
    }
    function onDocClick(e: MouseEvent) {
      const t = e.target as Node;
      if (inputRef.current?.contains(t)) return;
      if (listRef.current?.contains(t)) return;
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

  const query = value.trim();
  const matches = query === "" ? [...BRAZILIAN_BANKS] : filterBankOptions(BRAZILIAN_BANKS, query);

  return (
    <div className="relative">
      <div className="relative">
        <input
          ref={inputRef}
          id={id}
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => setOpen(true)}
          placeholder={placeholder}
          autoComplete="off"
          spellCheck={false}
          aria-autocomplete="list"
          aria-invalid={ariaInvalid}
          className={`${wizardInputClass} pr-9`}
        />
        <span
          className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[color:var(--text-secondary)]"
          aria-hidden
        >
          <ChevronDown size={16} strokeWidth={2} />
        </span>
      </div>
      {open && mounted && rect
        ? createPortal(
            <div
              ref={listRef}
              role="listbox"
              style={{
                position: "fixed",
                top: rect.top,
                left: rect.left,
                width: rect.width,
                zIndex: 100,
              }}
              className="max-h-64 overflow-auto rounded-xl border border-[color:var(--border-soft)] bg-[color:var(--surface-1)] p-1 shadow-lg backdrop-blur-md"
            >
              {matches.length > 0 ? (
                matches.map((bank) => (
                  <button
                    type="button"
                    key={bank}
                    role="option"
                    aria-selected={false}
                    onClick={() => {
                      onChange(bank);
                      setOpen(false);
                    }}
                    className="focus-ring flex w-full items-center rounded-lg px-3 py-2 text-left text-[0.8125rem] font-medium text-[color:var(--text-primary)] transition-colors hover:bg-[color:var(--color-brand-500)]/10"
                  >
                    {bank}
                  </button>
                ))
              ) : (
                <p className="px-3 py-2 text-[0.75rem] leading-snug text-[color:var(--text-secondary)]">
                  Não está na lista. Vamos usar{" "}
                  <span className="font-semibold text-[color:var(--text-primary)]">{query}</span>{" "}
                  mesmo.
                </p>
              )}
            </div>,
            document.body,
          )
        : null}
    </div>
  );
}
