"use client";

import { Download, Eye, FileText, Image as ImageIcon, MoreVertical, Plus } from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/app/components/ui/alert-dialog";
import { Spinner } from "@/app/components/ui/spinner";
import {
  ALLOWED_CONTENT_TYPES,
  MAX_FILE_BYTES,
  USER_QUOTA_BYTES,
} from "@/application/use-cases/attachments/attachment-limits";
import type { AttachableEntityType } from "@/domain/value-objects/attachable-entity-type";

import type { AttachmentDto } from "../../_actions/entity-attachments.action";
import {
  confirmAttachmentUploadAction,
  deleteAttachmentAction,
  getAttachmentDownloadUrlAction,
  renameAttachmentAction,
  requestAttachmentUploadAction,
} from "../../_actions/entity-attachments.action";

import { AttachmentActionsSheet } from "./attachment-actions-sheet.client";
import { FILES_COPY, usagePhrase } from "./copy";
import { ImageLightbox } from "./image-lightbox.client";
import { RenameAttachmentSheet } from "./rename-attachment-sheet.client";
import { useCanShare } from "./use-can-share";

function formatBytes(n: number): string {
  if (n >= 1024 * 1024) {
    const mb = n / (1024 * 1024);
    return `${mb >= 10 ? Math.round(mb) : Math.round(mb * 10) / 10} MB`;
  }
  return `${Math.max(1, Math.round(n / 1024))} KB`;
}

function isImage(contentType: string): boolean {
  return contentType.startsWith("image/");
}

type ActiveSheet = "actions" | "rename" | "lightbox" | "deleteConfirm";

interface Props {
  entityType: AttachableEntityType;
  entityId: string;
  initialItems: AttachmentDto[];
  initialTotalBytes: number;
}

export function AttachmentsList({ entityType, entityId, initialItems, initialTotalBytes }: Props) {
  const [items, setItems] = useState<AttachmentDto[]>(initialItems);
  const [totalBytes, setTotalBytes] = useState(initialTotalBytes);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [activeSheet, setActiveSheet] = useState<ActiveSheet | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const canShare = useCanShare();
  const inputRef = useRef<HTMLInputElement>(null);

  const activeItem = activeId ? items.find((i) => i.id === activeId) ?? null : null;

  function openSheet(item: AttachmentDto, sheet: ActiveSheet) {
    setActiveId(item.id);
    setActiveSheet(sheet);
  }

  function closeSheet() {
    setActiveSheet(null);
  }

  async function handleFile(file: File) {
    setError(null);

    if (!(ALLOWED_CONTENT_TYPES as readonly string[]).includes(file.type)) {
      setError(FILES_COPY.errorType);
      return;
    }
    if (file.size > MAX_FILE_BYTES) {
      setError(FILES_COPY.errorTooLarge);
      return;
    }

    setUploading(true);
    try {
      const req = await requestAttachmentUploadAction({
        entityType,
        entityId,
        fileName: file.name,
        contentType: file.type,
        sizeBytes: file.size,
      });
      if (!req.ok) {
        setError(req.reason === "quota" ? FILES_COPY.errorQuota : req.reason === "type" ? FILES_COPY.errorType : FILES_COPY.errorTooLarge);
        return;
      }

      const res = await fetch(req.uploadUrl, {
        method: "PUT",
        body: file,
        headers: { "Content-Type": file.type },
      });
      if (!res.ok) {
        setError(FILES_COPY.errorTooLarge);
        return;
      }

      const confirmed = await confirmAttachmentUploadAction({
        entityType,
        entityId,
        attachmentId: req.attachmentId,
        storageKey: req.storageKey,
        fileName: file.name,
        contentType: file.type,
        sizeBytes: file.size,
      });
      if (!confirmed.ok) {
        setError(FILES_COPY.errorTooLarge);
        return;
      }

      setItems((prev) => [
        {
          id: req.attachmentId,
          fileName: file.name,
          contentType: file.type,
          sizeBytes: file.size,
          createdAt: new Date().toISOString(),
        },
        ...prev,
      ]);
      setTotalBytes((prev) => prev + file.size);
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  async function handleDownload(attachmentId: string) {
    setDownloadingId(attachmentId);
    try {
      const { url } = await getAttachmentDownloadUrlAction({ attachmentId });
      if (url) window.open(url, "_blank");
    } finally {
      setDownloadingId(null);
    }
  }

  async function handleShare(item: AttachmentDto) {
    const { url } = await getAttachmentDownloadUrlAction({ attachmentId: item.id });
    if (!url) return;
    let file: File | null = null;
    try {
      const res = await fetch(url);
      const blob = await res.blob();
      file = new File([blob], item.fileName, { type: item.contentType });
    } catch {
      file = null;
    }
    try {
      if (file && navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title: item.fileName });
      } else if (navigator.share) {
        await navigator.share({ title: item.fileName, url });
      } else {
        window.open(url, "_blank");
        return;
      }
      toast.success("Compartilhado");
    } catch (e) {
      if (e instanceof Error && e.name === "AbortError") return;
      window.open(url, "_blank");
    }
  }

  async function handleRename(baseName: string) {
    if (!activeId) return;
    const id = activeId;
    const res = await renameAttachmentAction({ attachmentId: id, newName: baseName });
    if (res.ok) {
      setItems((prev) => prev.map((i) => (i.id === id ? { ...i, fileName: res.fileName } : i)));
      toast.success("Renomeado");
    }
  }

  async function handleDelete() {
    if (!activeId) return;
    const id = activeId;
    const target = items.find((i) => i.id === id);
    setDeleting(true);
    try {
      const result = await deleteAttachmentAction({ attachmentId: id });
      if (result.ok) {
        setItems((prev) => prev.filter((i) => i.id !== id));
        if (target) setTotalBytes((prev) => Math.max(0, prev - target.sizeBytes));
      }
    } finally {
      setDeleting(false);
      closeSheet();
    }
  }

  const nearLimit = totalBytes > 0.8 * USER_QUOTA_BYTES;

  return (
    <div>
      <input
        ref={inputRef}
        type="file"
        accept="application/pdf,image/*"
        className="sr-only"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) void handleFile(file);
        }}
      />

      {items.length === 0 ? (
        <p className="text-[0.8125rem] text-[color:var(--text-secondary)]">{FILES_COPY.emptyList}</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {items.map((item) => {
            const image = isImage(item.contentType);
            return (
              <li
                key={item.id}
                className="flex items-center gap-2.5 rounded-xl border border-[color:var(--border-soft)] bg-[color:var(--surface-1)] px-3 py-2.5"
              >
                <span className="shrink-0 text-[color:var(--text-secondary)]">
                  {image ? (
                    <ImageIcon size={18} strokeWidth={1.75} aria-hidden />
                  ) : (
                    <FileText size={18} strokeWidth={1.75} aria-hidden />
                  )}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[0.8125rem] font-medium text-[color:var(--text-primary)]">
                    {item.fileName}
                  </span>
                  <span className="block text-[0.6875rem] text-[color:var(--text-muted)]">
                    {formatBytes(item.sizeBytes)}
                  </span>
                </span>
                {image ? (
                  <button
                    type="button"
                    aria-label={`Ver ${item.fileName}`}
                    onClick={() => openSheet(item, "lightbox")}
                    className="focus-ring inline-flex h-9 items-center gap-1.5 rounded-lg border-[1.5px] border-[color:var(--border-soft)] bg-[color:var(--surface-1)] px-3 text-[0.8125rem] font-semibold text-[color:var(--text-primary)] transition-colors hover:bg-[color:var(--surface-3)]"
                  >
                    <Eye size={15} strokeWidth={2} aria-hidden />
                    Ver
                  </button>
                ) : (
                  <button
                    type="button"
                    aria-label={`${FILES_COPY.download} ${item.fileName}`}
                    disabled={downloadingId === item.id}
                    onClick={() => void handleDownload(item.id)}
                    className="focus-ring inline-flex h-9 items-center gap-1.5 rounded-lg border-[1.5px] border-[color:var(--border-soft)] bg-[color:var(--surface-1)] px-3 text-[0.8125rem] font-semibold text-[color:var(--text-primary)] transition-colors hover:bg-[color:var(--surface-3)] disabled:opacity-60"
                  >
                    {downloadingId === item.id ? (
                      <Spinner size={15} className="text-[color:var(--text-secondary)]" />
                    ) : (
                      <Download size={15} strokeWidth={2} aria-hidden />
                    )}
                    {FILES_COPY.download}
                  </button>
                )}
                <button
                  type="button"
                  aria-label={`Mais ações para ${item.fileName}`}
                  onClick={() => openSheet(item, "actions")}
                  className="focus-ring inline-flex h-9 w-9 items-center justify-center rounded-lg text-[color:var(--text-secondary)] transition-colors hover:bg-[color:var(--surface-3)] hover:text-[color:var(--text-primary)]"
                >
                  <MoreVertical size={16} strokeWidth={2} aria-hidden />
                </button>
              </li>
            );
          })}
        </ul>
      )}

      <div className="mt-3 flex items-center gap-3">
        <button
          type="button"
          disabled={uploading}
          onClick={() => inputRef.current?.click()}
          className="focus-ring inline-flex items-center gap-2 rounded-xl border-[1.5px] border-[color:var(--border-soft)] bg-[color:var(--surface-1)] px-4 py-2.5 text-[0.84375rem] font-semibold text-[color:var(--text-primary)] transition-colors hover:bg-[color:var(--surface-3)] disabled:opacity-50"
        >
          <Plus size={15} strokeWidth={2.5} aria-hidden />
          {FILES_COPY.attachButton}
        </button>
        {uploading ? <Spinner size={18} className="text-[color:var(--color-brand-500)]" /> : null}
      </div>

      <p className="mt-2 text-[0.6875rem] text-[color:var(--text-muted)]">{FILES_COPY.fileHint}</p>

      {error ? (
        <p role="alert" className="mt-2 text-[0.75rem] text-[color:var(--semantic-negative)]">
          {error}
        </p>
      ) : null}

      {totalBytes > 0 ? (
        <p className="mt-3 text-[0.6875rem] text-[color:var(--text-muted)]">
          {usagePhrase(totalBytes)}
        </p>
      ) : null}
      {nearLimit ? (
        <p className="mt-1 text-[0.6875rem] text-[color:var(--semantic-warning)]">
          {FILES_COPY.nearLimit}
        </p>
      ) : null}

      {activeItem ? (
        <AttachmentActionsSheet
          open={activeSheet === "actions"}
          onClose={closeSheet}
          fileName={activeItem.fileName}
          canShare={canShare}
          onShare={() => void handleShare(activeItem)}
          onDownload={() => void handleDownload(activeItem.id)}
          onRename={() => setActiveSheet("rename")}
          onDelete={() => setActiveSheet("deleteConfirm")}
        />
      ) : null}

      {activeItem ? (
        <RenameAttachmentSheet
          open={activeSheet === "rename"}
          onClose={closeSheet}
          fileName={activeItem.fileName}
          onSave={handleRename}
        />
      ) : null}

      {activeItem ? (
        <ImageLightbox
          attachmentId={activeItem.id}
          fileName={activeItem.fileName}
          contentType={activeItem.contentType}
          sizeBytes={activeItem.sizeBytes}
          createdAtIso={activeItem.createdAt}
          open={activeSheet === "lightbox"}
          onClose={closeSheet}
        />
      ) : null}

      <AlertDialog
        open={activeSheet === "deleteConfirm"}
        onOpenChange={(open) => {
          if (!open) closeSheet();
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{FILES_COPY.deleteTitle}</AlertDialogTitle>
            <AlertDialogDescription>{FILES_COPY.deleteBody}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>{FILES_COPY.deleteCancel}</AlertDialogCancel>
            <AlertDialogAction
              disabled={deleting}
              aria-busy={deleting || undefined}
              onClick={(e) => {
                e.preventDefault();
                void handleDelete();
              }}
              className="relative"
            >
              <span className={deleting ? "opacity-0" : "opacity-100"}>{FILES_COPY.deleteConfirm}</span>
              {deleting ? (
                <span className="absolute inset-0 flex items-center justify-center">
                  <Spinner size={16} />
                </span>
              ) : null}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
