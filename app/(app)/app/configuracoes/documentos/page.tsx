import { ArrowRight } from "lucide-react";
import type { Metadata } from "next";
import type { Route } from "next";
import Link from "next/link";

import {
  toUserDocuments,
  type UserDocument,
} from "@/application/use-cases/attachments/list-user-documents.use-case";
import type { AttachableEntityType } from "@/domain/value-objects/attachable-entity-type";
import { repos } from "@/infrastructure/container";
import { requireUser } from "@/presentation/http/middleware/cached-current-user";

import { PageShell } from "../../_components/page-shell";

import { DocumentsBrowser } from "./_components/documents-browser.client";

export const metadata: Metadata = { title: "Meus documentos" };

export default async function DocumentosPage() {
  const user = await requireUser();

  if (!user.isPro) {
    return (
      <PageShell
        title="Meus documentos"
        description="Tudo que você guardou, ligado a cada dívida, conta, meta ou renda. Ache pelo nome ou filtre por onde está."
        backHref={"/app/configuracoes" as Route}
      >
        <div className="rounded-2xl border border-[color:var(--color-brand-500)]/20 bg-[color:var(--surface-2)] p-5">
          <p className="text-[0.75rem] font-semibold text-[color:var(--color-brand-700)]">
            Disponível no Pro
          </p>
          <h3 className="mt-1 text-[1rem] font-bold tracking-[-0.01em] text-[color:var(--text-primary)]">
            Tenha contrato e comprovante sempre à mão
          </h3>
          <p className="mt-2 text-[0.84375rem] leading-[1.5] text-[color:var(--text-secondary)]">
            No Pro você guarda o contrato do financiamento, o comprovante do pagamento ou a foto do
            boleto, cada um ligado à sua dívida ou conta. Quando alguém pedir, você acha pelo nome
            em segundos.
          </p>
          <Link
            href={"/app/configuracoes/planos" as Route}
            className="focus-ring mt-4 inline-flex items-center justify-center gap-2 rounded-[14px] bg-[linear-gradient(135deg,#f28e25,#ef7a1a)] px-5 py-3 text-[0.84375rem] font-bold text-white"
            style={{ boxShadow: "0 10px 24px -8px rgba(239,122,26,0.5)" }}
          >
            Conhecer o Pro
            <ArrowRight size={14} strokeWidth={2.5} aria-hidden />
          </Link>
        </div>
      </PageShell>
    );
  }

  const attachments = await repos.entityAttachments.listAllForUser(user.id);

  const [debts, incomes, goals, assets] = await Promise.all([
    repos.debts.listForUser(user.id),
    repos.incomes.listForUser(user.id),
    repos.goals.listForUser(user.id),
    repos.assets.findActiveByUser(user.id),
  ]);

  const map = new Map<string, string>();
  for (const debt of debts) map.set(`debt:${debt.id}`, debt.label);
  for (const income of incomes) map.set(`income:${income.id}`, income.label);
  for (const goal of goals) map.set(`goal:${goal.id}`, goal.title);
  for (const asset of assets) map.set(`account:${asset.id}`, asset.label);

  const labelOf = (entityType: AttachableEntityType, entityId: string): string | null =>
    map.get(`${entityType}:${entityId}`) ?? null;

  const docs: UserDocument[] = toUserDocuments(attachments, labelOf);

  return (
    <PageShell
      title="Meus documentos"
      description="Tudo que você guardou, ligado a cada dívida, conta, meta ou renda. Ache pelo nome ou filtre por onde está."
      backHref={"/app/configuracoes" as Route}
    >
      <DocumentsBrowser docs={docs} />
    </PageShell>
  );
}
