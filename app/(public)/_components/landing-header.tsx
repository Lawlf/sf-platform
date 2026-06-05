"use client";

import { ArrowRight, Menu, X } from "lucide-react";
import type { Route } from "next";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";

import { Button } from "@/app/components/ui/button";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "#produto", label: "Produto" },
  { href: "#como", label: "Como funciona" },
  { href: "/calculadora", label: "Calculadoras" },
  { href: "#privacidade", label: "Privacidade" },
  { href: "#precos", label: "Preços" },
  { href: "#faq", label: "Dúvidas" },
];

export function LandingHeader() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const toggleRef = useRef<HTMLButtonElement>(null);
  const prevOpen = useRef(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  // Move focus into the open menu, trap Tab inside it, and restore focus to the
  // toggle when it closes.
  useEffect(() => {
    if (!open) {
      if (prevOpen.current) toggleRef.current?.focus();
      prevOpen.current = open;
      return;
    }
    prevOpen.current = open;
    const menu = menuRef.current;
    if (!menu) return;
    const focusables = () =>
      Array.from(
        menu.querySelectorAll<HTMLElement>('a[href], button:not([disabled])'),
      ).filter((el) => el.tabIndex !== -1);
    focusables()[0]?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Tab") return;
      const items = focusables();
      const first = items[0];
      const last = items[items.length - 1];
      if (!first || !last) return;
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    menu.addEventListener("keydown", onKey);
    return () => menu.removeEventListener("keydown", onKey);
  }, [open]);

  const headerScrolled = scrolled || open;

  return (
    <>
      <header
        className={cn(
          "sticky top-0 z-50 w-full transition-[background-color,backdrop-filter,box-shadow,border-color] duration-200",
          headerScrolled
            ? "border-b border-[color:var(--border-soft)] bg-[color:var(--bg-app)]/90 backdrop-blur-md shadow-[0_4px_20px_-12px_rgba(31,29,28,0.18)]"
            : "border-b border-transparent bg-[color:var(--bg-app)]/40 backdrop-blur-[6px]",
        )}
      >
        <div className="mx-auto flex h-[72px] max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <Link
            href="/"
            className="focus-ring flex items-center gap-3 rounded-full"
            aria-label="Sabor Financeiro"
            onClick={() => setOpen(false)}
          >
            <Image
              src="/icons/icon-192.png"
              alt=""
              width={44}
              height={44}
              className="h-11 w-11 rounded-full object-contain"
              priority
            />
            <span
              className="text-[17px] font-extrabold tracking-tight text-[color:var(--text-primary)]"
              style={{ letterSpacing: "-0.02em" }}
            >
              Sabor Financeiro
            </span>
          </Link>

          <nav aria-label="Principal" className="hidden items-center gap-8 md:flex">
            {NAV.map((item) => (
              <Link
                key={item.href}
                href={item.href as Route}
                className="focus-ring rounded-md text-[15px] font-medium text-[color:var(--text-secondary)] transition-colors hover:text-[color:var(--text-primary)]"
              >
                {item.label}
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-2.5">
            <Button
              asChild
              variant="ghost"
              size="default"
              className="hidden sm:inline-flex"
            >
              <Link href="/entrar">Entrar</Link>
            </Button>
            <Button
              asChild
              variant="brand"
              size="default"
              className="sf-lift hidden md:inline-flex"
            >
              <Link href="/cadastrar">Começar grátis</Link>
            </Button>
            <button
              ref={toggleRef}
              type="button"
              onClick={() => setOpen((v) => !v)}
              aria-expanded={open}
              aria-controls="mobile-menu"
              aria-label={open ? "Fechar menu" : "Abrir menu"}
              className="focus-ring inline-flex h-11 w-11 items-center justify-center rounded-full border border-[color:var(--border-soft)] bg-[color:var(--surface-1)] text-[color:var(--text-primary)] md:hidden"
            >
              {open ? (
                <X className="h-5 w-5" strokeWidth={2.25} aria-hidden />
              ) : (
                <Menu className="h-5 w-5" strokeWidth={2.25} aria-hidden />
              )}
            </button>
          </div>
        </div>
      </header>

      <div
        ref={menuRef}
        id="mobile-menu"
        className={cn(
          "fixed inset-0 z-40 transition-opacity duration-200 md:hidden",
          open
            ? "pointer-events-auto opacity-100"
            : "pointer-events-none opacity-0",
        )}
        aria-hidden={!open}
        inert={!open}
      >
        <button
          type="button"
          aria-label="Fechar menu"
          onClick={() => setOpen(false)}
          className="absolute inset-0 cursor-default bg-[color:var(--bg-app)]/92 backdrop-blur-md"
          tabIndex={-1}
        />

        <nav
          aria-label="Navegação mobile"
          className={cn(
            "relative flex h-full flex-col px-5 pt-24 pb-10 transition-transform duration-200",
            open ? "translate-y-0" : "-translate-y-2",
          )}
        >
          <ul className="flex flex-col gap-1">
            {NAV.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href as Route}
                  onClick={() => setOpen(false)}
                  className="focus-ring flex items-center justify-between rounded-2xl px-4 py-4 text-[19px] font-bold text-[color:var(--text-primary)] transition-colors hover:bg-[color:var(--surface-2)] active:bg-[color:var(--surface-2)]"
                >
                  <span style={{ letterSpacing: "-0.02em" }}>{item.label}</span>
                  <ArrowRight
                    className="h-5 w-5 text-[color:var(--text-muted)]"
                    strokeWidth={2}
                    aria-hidden
                  />
                </Link>
              </li>
            ))}
          </ul>

          <div className="mt-auto flex flex-col gap-3 pt-8">
            <Link
              href="/entrar"
              onClick={() => setOpen(false)}
              className="focus-ring inline-flex h-14 items-center justify-center rounded-full border border-[color:var(--border-strong)] bg-[color:var(--surface-2)] text-base font-bold text-[color:var(--text-primary)] backdrop-blur"
            >
              Entrar
            </Link>
            <Link
              href="/cadastrar"
              onClick={() => setOpen(false)}
              className="sf-lift focus-ring inline-flex h-14 items-center justify-center gap-2 rounded-full bg-[linear-gradient(135deg,#f28e25,#ef7a1a)] text-base font-bold text-white shadow-[0_16px_36px_-10px_rgba(239,122,26,0.55)]"
            >
              Começar grátis
              <ArrowRight className="h-4 w-4" strokeWidth={2.5} aria-hidden />
            </Link>
          </div>
        </nav>
      </div>
    </>
  );
}
