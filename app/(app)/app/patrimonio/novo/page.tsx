import { requireUser } from "@/presentation/http/middleware/cached-current-user";

import { AssetWizardClient, CATEGORIES, type Category } from "./_components/asset-wizard.client";

export default async function NovoAtivoPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireUser();
  const sp = await searchParams;
  const raw = typeof sp.category === "string" ? sp.category : undefined;
  const initialCategory = CATEGORIES.includes(raw as Category) ? (raw as Category) : undefined;

  return <AssetWizardClient initialCategory={initialCategory} />;
}
