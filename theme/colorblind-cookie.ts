"use server";

import { cookies } from "next/headers";

import type { ColorblindPreference } from "@/presentation/http/validators/theme.validators";

const COOKIE_NAME = "sf_cb";
const ONE_YEAR = 60 * 60 * 24 * 365;

export async function getColorblindPreference(): Promise<ColorblindPreference> {
  const store = await cookies();
  const value = store.get(COOKIE_NAME)?.value;
  if (value === "on") return "on";
  return "off";
}

export async function setColorblindPreference(value: ColorblindPreference): Promise<void> {
  const store = await cookies();
  store.set(COOKIE_NAME, value, {
    maxAge: ONE_YEAR,
    httpOnly: false,
    sameSite: "lax",
    path: "/",
  });
}
