"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

import type { ProfileBadge } from "@/domain/services/profile-identity.service";

import { getProfileBadgeIcon } from "../../_components/profile-badge-icons";

export function ProfileBadges({
  badges,
  tone = "onGradient",
}: {
  badges: ProfileBadge[];
  tone?: "light" | "onGradient";
}) {
  const [openId, setOpenId] = useState<string | null>(null);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);
  const [mounted, setMounted] = useState(false);
  const popRef = useRef<HTMLDivElement>(null);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      const t = e.target as Node;
      if (popRef.current && !popRef.current.contains(t)) setOpenId(null);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpenId(null);
    }
    if (openId) {
      document.addEventListener("mousedown", onDoc);
      document.addEventListener("keydown", onKey);
    }
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [openId]);

  if (badges.length === 0) return null;

  const chipCls =
    tone === "onGradient"
      ? "bg-black/[0.24] text-white"
      : "bg-[color:var(--surface-3)] text-[color:var(--text-muted)]";

  const open = badges.find((b) => b.id === openId) ?? null;
  const OpenIcon = open ? getProfileBadgeIcon(open.iconName) : null;

  return (
    <div className="mt-3 flex flex-wrap gap-1.5">
      {badges.map((b) => {
        const Icon = getProfileBadgeIcon(b.iconName);
        return (
          <button
            key={b.id}
            type="button"
            aria-label={b.label}
            title={b.label}
            onClick={(e) => {
              if (openId === b.id) {
                setOpenId(null);
                return;
              }
              const r = e.currentTarget.getBoundingClientRect();
              setPos({ top: r.bottom + 8, left: Math.min(r.left, window.innerWidth - 250 - 8) });
              setOpenId(b.id);
            }}
            className={`focus-ring flex h-7 w-7 items-center justify-center rounded-[9px] ${chipCls}`}
          >
            <Icon size={15} strokeWidth={2} aria-hidden />
          </button>
        );
      })}
      {mounted && open && pos && OpenIcon
        ? createPortal(
            <div
              ref={popRef}
              role="dialog"
              aria-label={open.label}
              style={{ position: "fixed", top: pos.top, left: pos.left, zIndex: 60 }}
              className="w-[250px] rounded-2xl border border-[color:var(--border-strong)] bg-[color:var(--surface-1)] p-3.5 shadow-[0_12px_32px_rgba(0,0,0,0.4)] backdrop-blur-xl"
            >
              <div className="flex items-center gap-2.5">
                <span className="flex h-8 w-8 items-center justify-center rounded-[10px] bg-[color:var(--color-brand-500)]/[0.16] text-[color:var(--color-brand-800)]">
                  <OpenIcon size={16} strokeWidth={2} aria-hidden />
                </span>
                <span className="text-[0.9rem] font-extrabold text-[color:var(--text-primary)]">
                  {open.label}
                </span>
              </div>
              <p className="mt-2 text-[0.75rem] leading-relaxed text-[color:var(--text-muted)]">
                {open.description}
              </p>
              {open.howTo ? (
                <p className="mt-2.5 border-t border-[color:var(--border-soft)] pt-2.5 text-[0.72rem] text-[color:var(--text-primary)]">
                  <span className="font-semibold text-[color:var(--color-brand-800)]">
                    Como conseguir:{" "}
                  </span>
                  {open.howTo}
                </p>
              ) : null}
            </div>,
            document.body,
          )
        : null}
    </div>
  );
}
