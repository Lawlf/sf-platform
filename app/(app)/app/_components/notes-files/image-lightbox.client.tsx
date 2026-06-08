"use client";

import { useEffect, useState } from "react";

import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/app/components/ui/dialog";
import { Spinner } from "@/app/components/ui/spinner";

import { getAttachmentDownloadUrlAction } from "../../_actions/entity-attachments.action";

interface Props {
  attachmentId: string;
  fileName: string;
  open: boolean;
  onClose: () => void;
}

export function ImageLightbox({ attachmentId, fileName, open, onClose }: Props) {
  const [url, setUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!open) {
      setUrl(null);
      setFailed(false);
      return;
    }
    let active = true;
    setLoading(true);
    setFailed(false);
    void (async () => {
      try {
        const res = await getAttachmentDownloadUrlAction({ attachmentId });
        if (!active) return;
        if (res.url) {
          setUrl(res.url);
        } else {
          setFailed(true);
        }
      } catch {
        if (active) setFailed(true);
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [open, attachmentId]);

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) onClose();
      }}
    >
      <DialogContent className="max-w-[92vw] gap-3 border-[color:var(--border-soft)] bg-[color:var(--bg-app)] p-4 sm:max-w-[640px]">
        <DialogTitle className="truncate pr-8 text-[0.9375rem] font-semibold text-[color:var(--text-primary)]">
          {fileName}
        </DialogTitle>
        <div className="flex min-h-[200px] items-center justify-center">
          {loading ? (
            <Spinner size={28} className="text-[color:var(--color-brand-500)]" />
          ) : failed ? (
            <p className="px-4 py-8 text-center text-[0.875rem] text-[color:var(--text-secondary)]">
              Não foi possível abrir a imagem.
            </p>
          ) : url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={url}
              alt={fileName}
              className="max-h-[72vh] max-w-full rounded-xl object-contain"
            />
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  );
}
