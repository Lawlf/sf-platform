import { requireUser } from "@/presentation/http/middleware/cached-current-user";

import { AssetWizardClient } from "./_components/asset-wizard.client";

export default async function NovoAtivoPage() {
  await requireUser();

  return <AssetWizardClient />;
}
