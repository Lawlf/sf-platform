import type { Metadata } from "next";
import type { Route } from "next";

import { getThemePreference } from "@/theme/theme-cookie";

import { PageShell } from "../../_components/page-shell";

import { ThemeSwitcher } from "./_components/theme-switcher";

export const metadata: Metadata = { title: "Aparência" };

export default async function AparenciaPage() {
  const current = await getThemePreference();
  return (
    <PageShell
      title="Aparência"
      description="Como o Sabor Financeiro deve se apresentar pra você."
      backHref={"/app/configuracoes" as Route}
    >
      <ThemeSwitcher current={current} />
    </PageShell>
  );
}
