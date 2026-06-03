"use client";

import { Check, X, ZoomIn } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

const BOX = 256;
const OUTPUT = 256;

export interface AvatarEditModalProps {
  source: string;
  pending: boolean;
  onCancel: () => void;
  onConfirm: (dataUrl: string) => void;
}

function exportCanvas(canvas: HTMLCanvasElement): string {
  const webp = canvas.toDataURL("image/webp", 0.82);
  if (webp.startsWith("data:image/webp")) return webp;
  return canvas.toDataURL("image/jpeg", 0.82);
}

export function AvatarEditModal({ source, pending, onCancel, onConfirm }: AvatarEditModalProps) {
  const imgRef = useRef<HTMLImageElement | null>(null);
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);
  const [baseScale, setBaseScale] = useState(1);
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const drag = useRef<{ x: number; y: number } | null>(null);

  const effScale = baseScale * zoom;
  const dispW = ready ? imgRef.current!.naturalWidth * effScale : BOX;
  const dispH = ready ? imgRef.current!.naturalHeight * effScale : BOX;

  const clamp = useCallback(
    (next: { x: number; y: number }) => ({
      x: Math.min(0, Math.max(BOX - dispW, next.x)),
      y: Math.min(0, Math.max(BOX - dispH, next.y)),
    }),
    [dispW, dispH],
  );

  useEffect(() => {
    const img = new Image();
    img.onload = () => {
      imgRef.current = img;
      const base = BOX / Math.min(img.naturalWidth, img.naturalHeight);
      setBaseScale(base);
      setZoom(1);
      const w = img.naturalWidth * base;
      const h = img.naturalHeight * base;
      setOffset({ x: (BOX - w) / 2, y: (BOX - h) / 2 });
      setReady(true);
    };
    img.onerror = () => setFailed(true);
    img.src = source;
  }, [source]);

  useEffect(() => {
    if (ready) setOffset((prev) => clamp(prev));
  }, [zoom, ready, clamp]);

  function onPointerDown(e: React.PointerEvent) {
    if (!ready) return;
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    drag.current = { x: e.clientX - offset.x, y: e.clientY - offset.y };
  }

  function onPointerMove(e: React.PointerEvent) {
    if (!drag.current) return;
    setOffset(clamp({ x: e.clientX - drag.current.x, y: e.clientY - drag.current.y }));
  }

  function onPointerUp(e: React.PointerEvent) {
    drag.current = null;
    (e.target as HTMLElement).releasePointerCapture?.(e.pointerId);
  }

  function confirm() {
    const img = imgRef.current;
    if (!img) return;
    const canvas = document.createElement("canvas");
    canvas.width = OUTPUT;
    canvas.height = OUTPUT;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const sourceSize = BOX / effScale;
    const sx = -offset.x / effScale;
    const sy = -offset.y / effScale;
    ctx.drawImage(img, sx, sy, sourceSize, sourceSize, 0, 0, OUTPUT, OUTPUT);
    onConfirm(exportCanvas(canvas));
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Ajustar foto de perfil"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
    >
      <div className="w-full max-w-[320px] rounded-3xl border border-[color:var(--border-strong)] bg-[color:var(--surface-1)] p-5 shadow-[0_24px_60px_-20px_rgba(0,0,0,0.5)]">
        <h2 className="mb-4 text-center text-[0.9375rem] font-bold text-[color:var(--text-primary)]">
          Ajustar foto
        </h2>

        {failed ? (
          <p className="py-10 text-center text-[0.8125rem] text-[color:var(--semantic-negative)]">
            Não foi possível ler essa imagem. Tente outro arquivo.
          </p>
        ) : (
          <>
            <div
              onPointerDown={onPointerDown}
              onPointerMove={onPointerMove}
              onPointerUp={onPointerUp}
              style={{
                width: BOX,
                height: BOX,
                backgroundImage: ready ? `url(${source})` : undefined,
                backgroundRepeat: "no-repeat",
                backgroundSize: `${dispW}px ${dispH}px`,
                backgroundPosition: `${offset.x}px ${offset.y}px`,
                touchAction: "none",
              }}
              className="mx-auto cursor-grab touch-none overflow-hidden rounded-full bg-[color:var(--surface-2)] active:cursor-grabbing"
              aria-label="Arraste para posicionar"
            />

            <div className="mt-4 flex items-center gap-2">
              <ZoomIn
                size={16}
                strokeWidth={1.75}
                aria-hidden
                className="flex-none text-[color:var(--text-muted)]"
              />
              <input
                type="range"
                min={1}
                max={3}
                step={0.01}
                value={zoom}
                onChange={(e) => setZoom(Number(e.target.value))}
                aria-label="Zoom"
                disabled={!ready}
                className="w-full accent-[color:var(--color-brand-500)]"
              />
            </div>
          </>
        )}

        <div className="mt-5 flex gap-2">
          <button
            type="button"
            onClick={onCancel}
            disabled={pending}
            className="focus-ring flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-[color:var(--surface-2)] px-3 py-2.5 text-[0.8125rem] font-bold text-[color:var(--text-primary)] transition-colors hover:bg-[color:var(--surface-3)] disabled:opacity-50"
          >
            <X size={14} strokeWidth={2.25} aria-hidden />
            Cancelar
          </button>
          <button
            type="button"
            onClick={confirm}
            disabled={!ready || failed || pending}
            className="focus-ring flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-[color:var(--color-brand-500)] px-3 py-2.5 text-[0.8125rem] font-bold text-white transition-colors hover:bg-[color:var(--color-brand-600)] disabled:opacity-50"
          >
            <Check size={14} strokeWidth={2.25} aria-hidden />
            Salvar
          </button>
        </div>
      </div>
    </div>
  );
}
