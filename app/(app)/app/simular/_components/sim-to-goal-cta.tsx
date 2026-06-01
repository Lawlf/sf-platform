"use client";

import { Target } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";

import { buildGoalSeedQuery, type GoalSeed } from "../_lib/goal-seed";

export function SimToGoalCta({ seed }: { seed: GoalSeed }) {
  const href = `/app/metas/nova?${buildGoalSeedQuery(seed)}` as Route;
  return (
    <Link
      href={href}
      className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[color:var(--color-brand-500)] px-4 py-3 text-sm font-semibold text-white"
    >
      <Target size={18} strokeWidth={2} aria-hidden />
      Acompanhar como meta
    </Link>
  );
}
