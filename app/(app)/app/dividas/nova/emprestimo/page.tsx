import { requireUser } from "@/presentation/http/middleware/cached-current-user";

import { PersonalLoanForm } from "./_components/personal-loan-form";

interface PageProps {
  searchParams: Promise<{ existing?: string }>;
}

export default async function EmprestimoPage({ searchParams }: PageProps) {
  const user = await requireUser();
  const sp = await searchParams;
  const initialScenario = sp.existing === "1" ? "ongoing" : "new";
  return <PersonalLoanForm initialScenario={initialScenario} defaultCurrency={user.baseCurrency} />;
}
