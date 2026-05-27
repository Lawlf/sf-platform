import type { ReactNode } from "react";

export const mdxComponents = {
  h2: (p: { children?: ReactNode }) => (
    <h2 className="mt-7 font-serif text-[1.375rem] font-bold leading-[1.25] tracking-[-0.015em] text-[color:var(--text-primary)]">
      {p.children}
    </h2>
  ),
  h3: (p: { children?: ReactNode }) => (
    <h3 className="mt-5 font-serif text-[1.0625rem] font-semibold leading-[1.3] text-[color:var(--text-primary)]">
      {p.children}
    </h3>
  ),
  p: (p: { children?: ReactNode }) => (
    <p className="mt-3 text-[0.9375rem] leading-[1.6] text-[color:var(--text-secondary)]">
      {p.children}
    </p>
  ),
  ul: (p: { children?: ReactNode }) => (
    <ul className="mt-3 flex list-disc flex-col gap-1.5 pl-5 text-[0.9375rem] leading-[1.55] text-[color:var(--text-secondary)]">
      {p.children}
    </ul>
  ),
  li: (p: { children?: ReactNode }) => <li>{p.children}</li>,
  strong: (p: { children?: ReactNode }) => (
    <strong className="font-bold text-[color:var(--text-primary)]">{p.children}</strong>
  ),
  blockquote: (p: { children?: ReactNode }) => (
    <blockquote className="mt-4 border-l-2 border-[color:var(--color-brand-500)] pl-4 text-[0.9375rem] italic leading-[1.55] text-[color:var(--text-secondary)]">
      {p.children}
    </blockquote>
  ),
};
