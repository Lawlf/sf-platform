import type { Route } from "next";
import { notFound } from "next/navigation";

import { getAssetDetail } from "@/application/use-cases/asset/get-asset-detail.use-case";
import { repos } from "@/infrastructure/container";
import { getActiveProfileId } from "@/presentation/http/middleware/active-profile";
import { requireUser } from "@/presentation/http/middleware/cached-current-user";
import { isOk } from "@/shared/errors/result";

import { EntityNotesAndFiles } from "../../../_components/notes-files/entity-notes-and-files";
import { PageShell } from "../../../_components/page-shell";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function AssetAnotacoesPage({ params }: PageProps) {
  const user = await requireUser();
  const { id } = await params;
  const profileId = await getActiveProfileId();

  const detail = await getAssetDetail(
    { assets: repos.assets, allocations: repos.assetDebtAllocations, debts: repos.debts },
    { profileId, assetId: id },
  );
  if (!isOk(detail)) notFound();

  return (
    <PageShell
      title={`Documentos e anotações · ${detail.value.asset.label}`}
      backHref={`/app/patrimonio/${id}` as Route}
    >
      <EntityNotesAndFiles entityType="account" entityId={id} userId={user.id} isPro={user.isPro} />
    </PageShell>
  );
}
