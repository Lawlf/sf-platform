"use server";

import { cookies } from "next/headers";

import type { A11yKey, A11yPrefs } from "@/presentation/http/validators/theme.validators";
import {
  contrastSchema,
  densitySchema,
  motionSchema,
  textSizeSchema,
} from "@/presentation/http/validators/theme.validators";

const ONE_YEAR = 60 * 60 * 24 * 365;

const CONFIG = {
  textsize: { cookie: "sf_textsize", schema: textSizeSchema, fallback: "16" },
  density: { cookie: "sf_density", schema: densitySchema, fallback: "cozy" },
  motion: { cookie: "sf_motion", schema: motionSchema, fallback: "full" },
  contrast: { cookie: "sf_contrast", schema: contrastSchema, fallback: "normal" },
} as const;

export async function getA11yPrefs(): Promise<A11yPrefs> {
  const store = await cookies();
  const read = (key: A11yKey) => {
    const cfg = CONFIG[key];
    const parsed = cfg.schema.safeParse(store.get(cfg.cookie)?.value);
    return parsed.success ? parsed.data : cfg.fallback;
  };
  return {
    textsize: read("textsize") as A11yPrefs["textsize"],
    density: read("density") as A11yPrefs["density"],
    motion: read("motion") as A11yPrefs["motion"],
    contrast: read("contrast") as A11yPrefs["contrast"],
  };
}

export async function setA11yPref(key: A11yKey, value: string): Promise<void> {
  const cfg = CONFIG[key];
  const parsed = cfg.schema.parse(value);
  const store = await cookies();
  store.set(cfg.cookie, parsed, {
    maxAge: ONE_YEAR,
    httpOnly: false,
    sameSite: "lax",
    path: "/",
  });
}
