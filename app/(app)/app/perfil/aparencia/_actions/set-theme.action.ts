"use server";

import { revalidatePath } from "next/cache";

import { themeSchema } from "@/presentation/http/validators/theme.validators";
import { setThemePreference } from "@/theme/theme-cookie";

export async function setThemeAction(formData: FormData): Promise<void> {
  const raw = formData.get("theme");
  const parsed = themeSchema.parse(raw);
  await setThemePreference(parsed);
  revalidatePath("/app/perfil/aparencia");
}
