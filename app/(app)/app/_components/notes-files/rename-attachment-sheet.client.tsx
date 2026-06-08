"use client";

import { useEffect, useState } from "react";

import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/app/components/ui/sheet";
import { Spinner } from "@/app/components/ui/spinner";

function splitBaseExt(fileName: string): { base: string; ext: string } {
  const m = /^(.*)\.([a-zA-Z0-9]+)$/.exec(fileName);
  if (m && m[1] !== undefined && m[2] !== undefined) {
    return { base: m[1], ext: m[2].toLowerCase() };
  }
  return { base: fileName, ext: "" };
}

interface Props {
  open: boolean;
  onClose: () => void;
  fileName: string;
  onSave: (baseName: string) => Promise<void>;
}

export function RenameAttachmentSheet({ open, onClose, fileName, onSave }: Props) {
  const { base, ext } = splitBaseExt(fileName);
  const [value, setValue] = useState(base);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setValue(base);
      setSaving(false);
    }
  }, [open, base]);

  const trimmed = value.trim();
  const canSave = trimmed.length > 0 && !saving;

  async function handleSave() {
    if (!canSave) return;
    setSaving(true);
    try {
      await onSave(trimmed);
      onClose();
    } finally {
      setSaving(false);
    }
  }

  return (
    <Sheet
      open={open}
      onOpenChange={(next) => {
        if (!next && !saving) onClose();
      }}
    >
      <SheetContent side="bottom" className="p-5">
        <SheetHeader className="mb-4 pr-8">
          <SheetTitle className="text-[1.0625rem]">Renomear arquivo</SheetTitle>
        </SheetHeader>

        <div className="flex flex-col gap-1.5">
          <input
            autoFocus
            value={value}
            onChange={(e) => setValue(e.target.value)}
            className="focus-ring w-full rounded-xl border-[1.5px] border-[color:var(--border-soft)] bg-[color:var(--surface-1)] px-3.5 py-3 text-[0.9375rem] text-[color:var(--text-primary)] outline-none"
          />
          {ext ? (
            <span className="px-1 text-[0.75rem] text-[color:var(--text-muted)]">.{ext}</span>
          ) : null}
        </div>

        <div className="mt-5 flex gap-2.5">
          <button
            type="button"
            disabled={saving}
            onClick={onClose}
            className="focus-ring flex-1 rounded-xl border-[1.5px] border-[color:var(--border-soft)] bg-[color:var(--surface-1)] px-4 py-3 text-[0.9375rem] font-semibold text-[color:var(--text-primary)] transition-colors hover:bg-[color:var(--surface-3)] disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            type="button"
            disabled={!canSave}
            aria-busy={saving || undefined}
            onClick={() => void handleSave()}
            className="focus-ring relative flex-1 rounded-xl bg-[color:var(--color-brand-500)] px-4 py-3 text-[0.9375rem] font-semibold text-white transition-colors hover:bg-[color:var(--color-brand-600)] disabled:opacity-50"
          >
            <span className={saving ? "opacity-0" : "opacity-100"}>Salvar</span>
            {saving ? (
              <span className="absolute inset-0 flex items-center justify-center">
                <Spinner size={18} className="text-white" />
              </span>
            ) : null}
          </button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
