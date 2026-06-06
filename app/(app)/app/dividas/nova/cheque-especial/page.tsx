import { requireUser } from "@/presentation/http/middleware/cached-current-user";

import { OverdraftForm } from "./_components/overdraft-form";

export default async function ChequeEspecialPage() {
  const user = await requireUser();
  return <OverdraftForm defaultCurrency={user.baseCurrency} />;
}
