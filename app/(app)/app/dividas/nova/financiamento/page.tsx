import { requireUser } from "@/presentation/http/middleware/cached-current-user";

import { FinancingForm } from "./_components/financing-form";

interface PageProps {
  searchParams: Promise<{ existing?: string }>;
}

export default async function FinanciamentoPage({ searchParams }: PageProps) {
  const user = await requireUser();
  const sp = await searchParams;
  const initialScenario = sp.existing === "1" ? "ongoing" : "new";
  return <FinancingForm initialScenario={initialScenario} defaultCurrency={user.baseCurrency} />;
}
