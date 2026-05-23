/**
 * Vercel appends the actual client IP as the LAST hop in `x-forwarded-for`.
 * Taking `.split(",")[0]` trusts whatever the upstream client sends — an
 * attacker rotates that header to bypass per-IP rate limits.
 *
 * Order of trust (Vercel runtime):
 *  1. `x-real-ip` — set by Vercel edge to the connecting peer
 *  2. last segment of `x-forwarded-for`
 *  3. null (caller must treat as untrusted bucket)
 */
export function getClientIp(req: { headers: Headers }): string | null {
  const real = req.headers.get("x-real-ip");
  if (real && real.length > 0) return real.trim();

  const xff = req.headers.get("x-forwarded-for");
  if (!xff) return null;
  const parts = xff.split(",");
  const last = parts[parts.length - 1]?.trim();
  return last && last.length > 0 ? last : null;
}
