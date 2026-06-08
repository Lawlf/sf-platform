export type GoalSeed =
  | { type: "emergency_fund"; targetMonths: number; monthlyCostCents: string }
  | {
      type: "savings";
      targetCents: string;
      savedCents: string;
      deadlineIso: string | null;
      fundingMode?: "linked" | "manual";
      linkedAssetId?: string;
    }
  | { type: "financial_independence"; monthlyCostCents: string; realReturnPct: number }
  | { type: "debt_payoff"; debtId: string; monthlyContributionCents?: string };

export type SearchParamsLike = Record<string, string | string[] | undefined>;

function first(v: string | string[] | undefined): string | null {
  if (Array.isArray(v)) return v[0] ?? null;
  return v ?? null;
}

function centsOrNull(v: string | null): string | null {
  return v !== null && /^\d+$/.test(v) ? v : null;
}

function intOrNull(v: string | null): number | null {
  if (v === null || !/^-?\d+$/.test(v)) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function numOrNull(v: string | null): number | null {
  if (v === null) return null;
  const n = Number(v.replace(",", "."));
  return Number.isFinite(n) ? n : null;
}

export function buildGoalSeedQuery(seed: GoalSeed): string {
  const p = new URLSearchParams();
  p.set("from", "sim");
  p.set("type", seed.type);
  switch (seed.type) {
    case "emergency_fund":
      p.set("months", String(seed.targetMonths));
      p.set("costCents", seed.monthlyCostCents);
      break;
    case "savings":
      p.set("targetCents", seed.targetCents);
      p.set("savedCents", seed.savedCents);
      if (seed.deadlineIso) p.set("deadlineIso", seed.deadlineIso);
      if (seed.fundingMode) p.set("fundingMode", seed.fundingMode);
      if (seed.linkedAssetId) p.set("assetId", seed.linkedAssetId);
      break;
    case "financial_independence":
      p.set("costCents", seed.monthlyCostCents);
      p.set("realReturnPct", String(seed.realReturnPct));
      break;
    case "debt_payoff":
      p.set("debtId", seed.debtId);
      if (seed.monthlyContributionCents) p.set("ritmoCents", seed.monthlyContributionCents);
      break;
  }
  return p.toString();
}

export function parseGoalSeed(sp: SearchParamsLike): GoalSeed | null {
  if (first(sp.from) !== "sim") return null;
  const type = first(sp.type);

  if (type === "emergency_fund") {
    const months = intOrNull(first(sp.months));
    const cost = centsOrNull(first(sp.costCents));
    if (months === null || months < 1 || cost === null) return null;
    return { type, targetMonths: months, monthlyCostCents: cost };
  }
  if (type === "savings") {
    const target = centsOrNull(first(sp.targetCents));
    if (target === null) return null;
    const saved = centsOrNull(first(sp.savedCents)) ?? "0";
    const deadline = first(sp.deadlineIso);
    const deadlineIso = deadline && /^\d{4}-\d{2}-\d{2}$/.test(deadline) ? deadline : null;
    const fm = first(sp.fundingMode);
    const fundingMode = fm === "linked" || fm === "manual" ? fm : undefined;
    const assetId = first(sp.assetId) ?? undefined;
    const base = { type, targetCents: target, savedCents: saved, deadlineIso } as const;
    return {
      ...base,
      ...(fundingMode ? { fundingMode } : {}),
      ...(fundingMode === "linked" && assetId ? { linkedAssetId: assetId } : {}),
    };
  }
  if (type === "financial_independence") {
    const cost = centsOrNull(first(sp.costCents));
    const rr = numOrNull(first(sp.realReturnPct));
    if (cost === null || rr === null) return null;
    return { type, monthlyCostCents: cost, realReturnPct: rr };
  }
  if (type === "debt_payoff") {
    const debtId = first(sp.debtId);
    if (!debtId) return null;
    const ritmo = centsOrNull(first(sp.ritmoCents));
    return ritmo !== null ? { type, debtId, monthlyContributionCents: ritmo } : { type, debtId };
  }
  return null;
}
