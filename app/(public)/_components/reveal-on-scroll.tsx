"use client";

import { useEffect, useRef, type ReactNode } from "react";

import { cn } from "@/lib/utils";

interface RevealOnScrollProps {
  children: ReactNode;
  className?: string;
  stagger?: boolean;
  rootMargin?: string;
  threshold?: number;
  as?: "div" | "section" | "ol" | "ul";
}

export function RevealOnScroll({
  children,
  className,
  stagger = false,
  rootMargin = "0px 0px -10% 0px",
  threshold = 0.1,
  as: Tag = "div",
}: RevealOnScrollProps) {
  const ref = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;

    const reduced =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (reduced) {
      node.setAttribute("data-revealed", "true");
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            (entry.target as HTMLElement).setAttribute("data-revealed", "true");
            observer.unobserve(entry.target);
          }
        });
      },
      { rootMargin, threshold },
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [rootMargin, threshold]);

  return (
    <Tag
      ref={ref as never}
      className={cn(stagger ? "sf-stagger" : "sf-reveal", className)}
    >
      {children}
    </Tag>
  );
}
