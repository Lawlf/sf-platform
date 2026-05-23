"use server";

import { revalidatePath } from "next/cache";

import { a11yKeySchema, colorblindSchema } from "@/presentation/http/validators/theme.validators";
import { setA11yPref } from "@/theme/a11y-cookie";
import { setColorblindPreference } from "@/theme/colorblind-cookie";

export async function savePrefAction(key: string, value: string): Promise<void> {
  if (key === "colorblind") {
    await setColorblindPreference(colorblindSchema.parse(value));
  } else {
    await setA11yPref(a11yKeySchema.parse(key), value);
  }
  revalidatePath("/app/perfil/acessibilidade");
}
