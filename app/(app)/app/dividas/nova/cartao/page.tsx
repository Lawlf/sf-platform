import { requireUser } from "@/presentation/http/middleware/cached-current-user";

import { CardEntry } from "./_components/card-entry.client";

interface PageProps {
  searchParams: Promise<{ existing?: string; linkAssetId?: string }>;
}

export default async function CartaoPage({ searchParams }: PageProps) {
  const user = await requireUser();
  const sp = await searchParams;
  return (
    <CardEntry
      existing={sp.existing === "1"}
      defaultCurrency={user.baseCurrency}
      initialLinkAssetId={sp.linkAssetId ?? null}
    />
  );
}
