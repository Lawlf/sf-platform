import type { Metadata } from "next";

import { PageShell } from "../_components/page-shell";

import { SimulatorBrowser } from "./_components/simulator-browser.client";
import { SIM_CATEGORIES, type SimCategoryId } from "./_lib/simulators";

export const metadata: Metadata = { title: "Simular" };

interface PageProps {
  searchParams: Promise<{ category?: string }>;
}

export default async function SimularHubPage({ searchParams }: PageProps) {
  const sp = await searchParams;
  const initialCategory = SIM_CATEGORIES.find((c) => c.id === sp.category)?.id as
    | SimCategoryId
    | undefined;

  return (
    <PageShell title="Simular" description="Compare cenários, planeje e decida com clareza.">
      <SimulatorBrowser initialCategory={initialCategory} />
    </PageShell>
  );
}
