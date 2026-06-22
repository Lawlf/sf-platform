import { requireUser } from "@/presentation/http/middleware/cached-current-user";

import { OverdraftEntry } from "./_components/overdraft-entry.client";

export default async function ChequeEspecialPage() {
  const user = await requireUser();
  return <OverdraftEntry defaultCurrency={user.baseCurrency} />;
}
