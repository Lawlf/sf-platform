import type { Metadata } from "next";

import { requireUser } from "@/presentation/http/middleware/cached-current-user";

import { loadSimPrefill } from "../simular/_lib/sim-prefill";

import { Decisor } from "./_components/decisor.client";
import { getMarketRates } from "./_lib/market-rates";

export const metadata: Metadata = { title: "Onde investir" };

export default async function InvestirPage() {
  const user = await requireUser();
  const [prefill, rates] = await Promise.all([loadSimPrefill(user.id), getMarketRates()]);

  return (
    <Decisor
      initialAmountCents={prefill.cashReserveCents.toString()}
      cdiAnnualPct={rates.cdiAnnualPct}
    />
  );
}
