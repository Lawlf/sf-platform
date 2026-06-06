import { requireUser } from "@/presentation/http/middleware/cached-current-user";

import { RecurringDebtForm } from "./_components/recurring-debt-form";

export default async function RecorrentePage() {
  const user = await requireUser();
  return <RecurringDebtForm defaultCurrency={user.baseCurrency} />;
}
