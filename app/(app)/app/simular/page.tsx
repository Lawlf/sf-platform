import type { Metadata } from "next";

import { PageShell } from "../_components/page-shell";

import { SimulatorBrowser } from "./_components/simulator-browser.client";

export const metadata: Metadata = { title: "Simular" };

export default function SimularHubPage() {
  return (
    <PageShell title="Simular" description="Compare cenários, planeje e decida com clareza.">
      <SimulatorBrowser />
    </PageShell>
  );
}
