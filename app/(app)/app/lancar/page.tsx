import type { Metadata } from "next";
import type { Route } from "next";

import { requireUser } from "@/presentation/http/middleware/cached-current-user";

import { PageShell } from "../_components/page-shell";
import { LogTransactionForm } from "../linha-do-tempo/_components/log-transaction-form.client";

export const metadata: Metadata = { title: "Lançar" };

export default async function LancarPage() {
  await requireUser();

  return (
    <PageShell
      title="Lançar"
      description="Registre uma entrada ou saída avulsa."
      backHref={"/app" as Route}
    >
      <LogTransactionForm />
    </PageShell>
  );
}
