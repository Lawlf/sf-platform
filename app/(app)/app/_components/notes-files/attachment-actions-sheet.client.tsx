"use client";

import { Download, Pencil, Share2, Trash2 } from "lucide-react";
import type { LucideIcon } from "lucide-react";

import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/app/components/ui/sheet";

interface Props {
  open: boolean;
  onClose: () => void;
  fileName: string;
  canShare: boolean;
  onShare: () => void;
  onDownload: () => void;
  onRename: () => void;
  onDelete: () => void;
}

interface Row {
  key: string;
  label: string;
  icon: LucideIcon;
  onSelect: () => void;
  closeOnSelect: boolean;
  destructive?: boolean;
}

export function AttachmentActionsSheet({
  open,
  onClose,
  fileName,
  canShare,
  onShare,
  onDownload,
  onRename,
  onDelete,
}: Props) {
  const rows: Row[] = [
    ...(canShare
      ? [
          {
            key: "share",
            label: "Compartilhar",
            icon: Share2,
            onSelect: onShare,
            closeOnSelect: true,
          },
        ]
      : []),
    { key: "download", label: "Baixar", icon: Download, onSelect: onDownload, closeOnSelect: true },
    { key: "rename", label: "Renomear", icon: Pencil, onSelect: onRename, closeOnSelect: false },
    { key: "delete", label: "Apagar", icon: Trash2, onSelect: onDelete, closeOnSelect: false, destructive: true },
  ];

  return (
    <Sheet
      open={open}
      onOpenChange={(next) => {
        if (!next) onClose();
      }}
    >
      <SheetContent side="bottom" className="p-5">
        <SheetHeader className="mb-3 pr-8">
          <SheetTitle className="truncate text-[1rem]">{fileName}</SheetTitle>
        </SheetHeader>
        <ul className="flex flex-col gap-1">
          {rows.map((row) => {
            const Icon = row.icon;
            return (
              <li key={row.key}>
                <button
                  type="button"
                  onClick={() => {
                    row.onSelect();
                    if (row.closeOnSelect) onClose();
                  }}
                  className={`focus-ring flex min-h-[48px] w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-[0.9375rem] font-medium transition-colors ${
                    row.destructive
                      ? "text-[color:var(--semantic-negative)] hover:bg-[color:var(--semantic-negative)]/[0.1]"
                      : "text-[color:var(--text-primary)] hover:bg-[color:var(--surface-2)]"
                  }`}
                >
                  <Icon size={19} strokeWidth={1.85} aria-hidden />
                  {row.label}
                </button>
              </li>
            );
          })}
        </ul>
      </SheetContent>
    </Sheet>
  );
}
