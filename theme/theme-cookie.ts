"use server";

import { cookies } from "next/headers";

import type { ThemePreference } from "@/presentation/http/validators/theme.validators";

const COOKIE_NAME = "sf_theme";
const ONE_YEAR = 60 * 60 * 24 * 365;

export async function getThemePreference(): Promise<ThemePreference> {
  const store = await cookies();
  const value = store.get(COOKIE_NAME)?.value;
  if (value === "light" || value === "dark" || value === "system") return value;
  return "system";
}

export async function setThemePreference(value: ThemePreference): Promise<void> {
  const store = await cookies();
  store.set(COOKIE_NAME, value, {
    maxAge: ONE_YEAR,
    httpOnly: false,
    sameSite: "lax",
    path: "/",
  });
}
