"use client";

import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";

import type { CatalogEntry } from "./catalog";
import { QUICK_ACCESS_ICONS } from "./icons";
import { QUICK_ACCESS_DRAWER_KEYS, QuickAccessDrawer } from "./quick-access-drawer.client";

export function QuickAccessScroller({ items }: { items: CatalogEntry[] }) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [showRight, setShowRight] = useState(false);
  const [showLeft, setShowLeft] = useState(false);
  const [drawerKey, setDrawerKey] = useState<string | null>(null);

  const update = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const remaining = el.scrollWidth - el.clientWidth - el.scrollLeft;
    setShowRight(remaining > 8);
    setShowLeft(el.scrollLeft > 8);
  }, []);

  useEffect(() => {
    update();
    const el = scrollRef.current;
    if (!el) return;
    el.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    return () => {
      el.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, [update]);

  function nudge(dir: 1 | -1) {
    scrollRef.current?.scrollBy({ left: 160 * dir, behavior: "smooth" });
  }

  return (
    <div className="relative min-w-0">
      <div
        ref={scrollRef}
        className="flex min-w-0 gap-4 overflow-x-auto pb-1 [scrollbar-width:none] [scroll-snap-type:x_proximity] [&::-webkit-scrollbar]:hidden"
      >
        {items.map((item) => {
          const Icon = QUICK_ACCESS_ICONS[item.icon];
          const isAdd = item.category === "adicionar";
          const inner = (
            <>
              <span className="relative flex h-16 w-16 items-center justify-center rounded-full bg-[color:var(--color-brand-500)]/[0.14] text-[color:var(--color-brand-800)]">
                {Icon ? <Icon size={26} strokeWidth={1.75} aria-hidden /> : null}
                {isAdd ? (
                  <span className="absolute -bottom-0.5 -right-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-[linear-gradient(135deg,#f28e25,#ef7a1a)] text-white ring-2 ring-[color:var(--bg-app)]">
                    <Plus size={13} strokeWidth={3} aria-hidden />
                  </span>
                ) : null}
              </span>
              <span className="text-center text-[0.75rem] font-semibold text-[color:var(--text-primary)]">
                {item.shortLabel}
              </span>
            </>
          );
          const className =
            "focus-ring flex w-[82px] shrink-0 flex-col items-center gap-2 [scroll-snap-align:start]";

          if (QUICK_ACCESS_DRAWER_KEYS.has(item.key)) {
            return (
              <button
                key={item.key}
                type="button"
                onClick={() => setDrawerKey(item.key)}
                aria-label={item.label}
                aria-haspopup="dialog"
                className={className}
              >
                {inner}
              </button>
            );
          }

          return (
            <Link key={item.key} href={item.href as Route} aria-label={item.label} className={className}>
              {inner}
            </Link>
          );
        })}
      </div>

      <div
        aria-hidden
        className={`pointer-events-none absolute inset-y-0 left-0 flex w-16 items-start justify-start bg-gradient-to-r from-[color:var(--bg-app)] via-[color:var(--bg-app)] to-transparent pt-4 transition-opacity duration-200 ${
          showLeft ? "opacity-100" : "opacity-0"
        }`}
      >
        <button
          type="button"
          onClick={() => nudge(-1)}
          aria-label="Acessos anteriores"
          className="focus-ring pointer-events-auto flex h-8 w-8 items-center justify-center rounded-full border border-[color:var(--border-soft)] bg-[color:var(--surface-2)] text-[color:var(--text-secondary)] shadow-sm"
        >
          <ChevronLeft size={18} strokeWidth={2.25} aria-hidden />
        </button>
      </div>

      <div
        aria-hidden
        className={`pointer-events-none absolute inset-y-0 right-0 flex w-16 items-start justify-end bg-gradient-to-l from-[color:var(--bg-app)] via-[color:var(--bg-app)] to-transparent pt-4 transition-opacity duration-200 ${
          showRight ? "opacity-100" : "opacity-0"
        }`}
      >
        <button
          type="button"
          onClick={() => nudge(1)}
          aria-label="Ver mais acessos"
          className="focus-ring pointer-events-auto flex h-8 w-8 items-center justify-center rounded-full border border-[color:var(--border-soft)] bg-[color:var(--surface-2)] text-[color:var(--text-secondary)] shadow-sm"
        >
          <ChevronRight size={18} strokeWidth={2.25} aria-hidden />
        </button>
      </div>

      <QuickAccessDrawer itemKey={drawerKey} onClose={() => setDrawerKey(null)} />
    </div>
  );
}
