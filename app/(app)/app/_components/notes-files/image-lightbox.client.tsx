"use client";

import { Download, Minus, Plus, RotateCcw } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { TransformComponent, TransformWrapper } from "react-zoom-pan-pinch";

import { Dialog, DialogContent, DialogTitle } from "@/app/components/ui/dialog";
import { Spinner } from "@/app/components/ui/spinner";

import { getAttachmentDownloadUrlAction } from "../../_actions/entity-attachments.action";

interface Props {
  attachmentId: string;
  fileName: string;
  open: boolean;
  onClose: () => void;
  contentType?: string;
  sizeBytes?: number;
  createdAtIso?: string;
}

function formatBytes(n: number): string {
  if (n >= 1024 * 1024) {
    const mb = n / (1024 * 1024);
    return `${mb >= 10 ? Math.round(mb) : Math.round(mb * 10) / 10} MB`;
  }
  return `${Math.max(1, Math.round(n / 1024))} KB`;
}

function typeLabel(contentType?: string): string | null {
  if (!contentType) return null;
  const sub = contentType.split("/")[1];
  return sub ? sub.toUpperCase() : null;
}

function formatDate(iso?: string): string | null {
  if (!iso) return null;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" });
}

export function ImageLightbox({
  attachmentId,
  fileName,
  open,
  onClose,
  contentType,
  sizeBytes,
  createdAtIso,
}: Props) {
  const [objectUrl, setObjectUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(false);
  const [dimensions, setDimensions] = useState<{ w: number; h: number } | null>(null);
  const objectUrlRef = useRef<string | null>(null);

  useEffect(() => {
    if (!open) {
      setObjectUrl(null);
      setFailed(false);
      setDimensions(null);
      return;
    }
    let active = true;
    setLoading(true);
    setFailed(false);
    void (async () => {
      try {
        const res = await getAttachmentDownloadUrlAction({ attachmentId });
        if (!active) return;
        if (!res.url) {
          setFailed(true);
          return;
        }
        const blobRes = await fetch(res.url);
        if (!active) return;
        const blob = await blobRes.blob();
        if (!active) return;
        const obj = URL.createObjectURL(blob);
        objectUrlRef.current = obj;
        setObjectUrl(obj);
      } catch {
        if (active) setFailed(true);
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
      if (objectUrlRef.current) {
        URL.revokeObjectURL(objectUrlRef.current);
        objectUrlRef.current = null;
      }
    };
  }, [open, attachmentId]);

  const meta = [
    dimensions ? `${dimensions.w} x ${dimensions.h}` : null,
    typeLabel(contentType),
    sizeBytes ? formatBytes(sizeBytes) : null,
    formatDate(createdAtIso),
  ].filter(Boolean) as string[];

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) onClose();
      }}
    >
      <DialogContent className="flex h-[88vh] max-w-[96vw] flex-col gap-3 border-[color:var(--border-soft)] bg-[color:var(--bg-app)] p-4 sm:max-w-[860px]">
        <DialogTitle className="truncate pr-8 text-[0.9375rem] font-semibold text-[color:var(--text-primary)]">
          {fileName}
        </DialogTitle>

        <div className="relative flex min-h-0 flex-1 items-center justify-center overflow-hidden rounded-xl bg-[color:var(--surface-3)]">
          {loading ? (
            <Spinner size={28} className="text-[color:var(--color-brand-500)]" />
          ) : failed ? (
            <p className="px-4 py-8 text-center text-[0.875rem] text-[color:var(--text-secondary)]">
              Não foi possível abrir a imagem.
            </p>
          ) : objectUrl ? (
            <TransformWrapper
              doubleClick={{ mode: "toggle", step: 1.4 }}
              wheel={{ step: 0.12 }}
              pinch={{ step: 6 }}
              minScale={1}
              maxScale={6}
            >
              {({ zoomIn, zoomOut, resetTransform }) => (
                <>
                  <TransformComponent
                    wrapperClass="!h-full !w-full flex items-center justify-center"
                    contentClass="!h-full !w-full flex items-center justify-center"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={objectUrl}
                      alt={fileName}
                      onLoad={(e) =>
                        setDimensions({
                          w: e.currentTarget.naturalWidth,
                          h: e.currentTarget.naturalHeight,
                        })
                      }
                      className="max-h-full max-w-full object-contain"
                      draggable={false}
                    />
                  </TransformComponent>

                  <div className="absolute bottom-3 left-1/2 flex -translate-x-1/2 items-center gap-1 rounded-full border border-[color:var(--border-soft)] bg-[color:var(--surface-1)]/90 p-1 backdrop-blur">
                    <button
                      type="button"
                      aria-label="Diminuir zoom"
                      onClick={() => zoomOut()}
                      className="focus-ring inline-flex h-8 w-8 items-center justify-center rounded-full text-[color:var(--text-secondary)] transition-colors hover:bg-[color:var(--surface-3)] hover:text-[color:var(--text-primary)]"
                    >
                      <Minus size={16} strokeWidth={2} aria-hidden />
                    </button>
                    <button
                      type="button"
                      aria-label="Tamanho original"
                      onClick={() => resetTransform()}
                      className="focus-ring inline-flex h-8 w-8 items-center justify-center rounded-full text-[color:var(--text-secondary)] transition-colors hover:bg-[color:var(--surface-3)] hover:text-[color:var(--text-primary)]"
                    >
                      <RotateCcw size={15} strokeWidth={2} aria-hidden />
                    </button>
                    <button
                      type="button"
                      aria-label="Aumentar zoom"
                      onClick={() => zoomIn()}
                      className="focus-ring inline-flex h-8 w-8 items-center justify-center rounded-full text-[color:var(--text-secondary)] transition-colors hover:bg-[color:var(--surface-3)] hover:text-[color:var(--text-primary)]"
                    >
                      <Plus size={16} strokeWidth={2} aria-hidden />
                    </button>
                  </div>
                </>
              )}
            </TransformWrapper>
          ) : null}
        </div>

        <div className="flex items-center justify-between gap-3">
          {meta.length > 0 ? (
            <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[0.75rem] text-[color:var(--text-muted)]">
              {meta.map((m, i) => (
                <span key={m} className="inline-flex items-center gap-2">
                  {i > 0 ? <span aria-hidden>·</span> : null}
                  {m}
                </span>
              ))}
            </p>
          ) : (
            <span />
          )}
          {objectUrl ? (
            <a
              href={objectUrl}
              download={fileName}
              className="focus-ring inline-flex shrink-0 items-center gap-1.5 rounded-xl border-[1.5px] border-[color:var(--border-soft)] bg-[color:var(--surface-1)] px-3 py-2 text-[0.8125rem] font-semibold text-[color:var(--text-primary)] transition-colors hover:bg-[color:var(--surface-3)]"
            >
              <Download size={15} strokeWidth={2} aria-hidden />
              Baixar
            </a>
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  );
}
