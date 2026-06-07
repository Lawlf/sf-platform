export const DEFAULT_QUICK_ACCESS: string[] = ["add_debt", "add_income", "add_asset", "add_transaction", "sim_hub", "metas"];
export const MAX_QUICK_ACCESS = 8;

export function normalizeQuickAccess(keys: string[], allowedKeys: string[], max: number): string[] {
  const allowed = new Set(allowedKeys);
  const seen = new Set<string>();
  const out: string[] = [];
  for (const k of keys) {
    if (!allowed.has(k) || seen.has(k)) continue;
    seen.add(k);
    out.push(k);
    if (out.length >= max) break;
  }
  return out;
}
