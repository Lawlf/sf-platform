import { createHmac, timingSafeEqual } from "node:crypto";

import { loadEnv } from "@/infrastructure/config/env";

export type EmailCategory = "all" | "monthly" | "promotions" | "newsletter" | "news";

export const EMAIL_CATEGORIES: ReadonlyArray<EmailCategory> = [
  "all",
  "monthly",
  "promotions",
  "newsletter",
  "news",
];

function isEmailCategory(value: string): value is EmailCategory {
  return (EMAIL_CATEGORIES as ReadonlyArray<string>).includes(value);
}

function sign(payload: string): string {
  return createHmac("sha256", loadEnv().SESSION_COOKIE_SECRET)
    .update(payload)
    .digest("base64url");
}

export function createUnsubscribeToken(userId: string, category: EmailCategory): string {
  const payload = `${userId}:${category}`;
  return `${userId}.${category}.${sign(payload)}`;
}

export function verifyUnsubscribeToken(
  token: string,
): { userId: string; category: EmailCategory } | null {
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  const [userId, category, sig] = parts;
  if (!userId || !category || !sig || !isEmailCategory(category)) return null;

  const expected = sign(`${userId}:${category}`);
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return null;
  try {
    if (!timingSafeEqual(a, b)) return null;
  } catch {
    return null;
  }
  return { userId, category };
}

export function buildUnsubscribeUrl(
  appUrl: string,
  userId: string,
  category: EmailCategory,
): string {
  const token = createUnsubscribeToken(userId, category);
  return `${appUrl.replace(/\/$/, "")}/email/unsubscribe?token=${encodeURIComponent(token)}`;
}

export function buildUnsubscribeHeaders(
  appUrl: string,
  userId: string,
  category: EmailCategory,
): Record<string, string> {
  const url = buildUnsubscribeUrl(appUrl, userId, category);
  return {
    "List-Unsubscribe": `<${url}>`,
    "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
  };
}
