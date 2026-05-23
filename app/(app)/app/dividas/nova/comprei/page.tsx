import { requireUser } from "@/presentation/http/middleware/cached-current-user";

import { NewPurchaseWizard } from "./_components/new-purchase-wizard.client";

export default async function NewPurchasePage() {
  // Garante autenticação. O wizard em si não precisa do user, mas a rota é protegida.
  await requireUser();
  return <NewPurchaseWizard />;
}
