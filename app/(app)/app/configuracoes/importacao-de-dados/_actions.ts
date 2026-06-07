"use server";

import { buildOfxPreview } from "@/application/use-cases/import/build-ofx-preview.use-case";
import { commitOfxImport } from "@/application/use-cases/import/commit-ofx-import.use-case";
import { SystemClock } from "@/infrastructure/clock/system-clock";
import { DrizzleAssetRepository } from "@/infrastructure/persistence/drizzle/repositories/drizzle-asset.repository";
import { DrizzleDebtRepository } from "@/infrastructure/persistence/drizzle/repositories/drizzle-debt.repository";
import { DrizzleIncomeRepository } from "@/infrastructure/persistence/drizzle/repositories/drizzle-income.repository";
import { DrizzleTransactionRepository } from "@/infrastructure/persistence/drizzle/repositories/drizzle-transaction.repository";
import { requireUser } from "@/presentation/http/middleware/cached-current-user";
import { isErr } from "@/shared/errors/result";

export interface SerializablePreview {
  accountKey: string;
  ledgerBalance: number;
  matchedAssetLabel: string | null;
  newTransactionCount: number;
  duplicateCount: number;
  net: number;
  incomes: { fitId: string; label: string; amount: number; dayOfMonth: number }[];
  debts: { fitId: string; label: string; installment: number; paid: number | null; total: number | null }[];
}

type PreviewResult =
  | { ok: true; preview: SerializablePreview }
  | { ok: false; code: string; message: string };

type CommitResult = { ok: true } | { ok: false; code?: string; message: string };

const MAX_OFX_BYTES = 5 * 1024 * 1024;

export async function previewOfxAction(formData: FormData): Promise<PreviewResult> {
  const user = await requireUser();

  const file = formData.get("file");
  if (!file || typeof file === "string") {
    return { ok: false, code: "MISSING_FILE", message: "Nenhum arquivo enviado." };
  }

  if ((file as File).size > MAX_OFX_BYTES) {
    return { ok: false, code: "FILE_TOO_LARGE", message: "Arquivo muito grande. Envie um OFX de até 5 MB." };
  }

  const content = await (file as File).text();

  const result = await buildOfxPreview(
    {
      assets: new DrizzleAssetRepository(),
      transactions: new DrizzleTransactionRepository(),
    },
    { userId: user.id, content },
  );

  if (isErr(result)) {
    return { ok: false, code: "PARSE_ERROR", message: "Não foi possível ler este OFX." };
  }

  const { value: preview } = result;

  return {
    ok: true,
    preview: {
      accountKey: preview.accountKey,
      ledgerBalance: Number(preview.ledgerBalanceCents) / 100,
      matchedAssetLabel: preview.matchedAssetLabel,
      newTransactionCount: preview.newTransactionCount,
      duplicateCount: preview.duplicateCount,
      net: Number(preview.netCents) / 100,
      incomes: preview.suggestions.incomes
        .filter((inc) => inc.fitIds.length > 0)
        .map((inc) => ({
          fitId: inc.fitIds[0]!,
          label: inc.label,
          amount: Number(inc.amountCents) / 100,
          dayOfMonth: inc.dayOfMonth,
        })),
      debts: preview.suggestions.debts
        .filter((d) => d.fitIds.length > 0)
        .map((d) => ({
          fitId: d.fitIds[0]!,
          label: d.label,
          installment: Number(d.installmentCents) / 100,
          paid: d.installmentsPaid,
          total: d.installmentsTotal,
        })),
    },
  };
}

export async function commitOfxAction(input: {
  content: string;
  acceptedIncomeFitIds: string[];
  acceptedDebtFitIds: string[];
}): Promise<CommitResult> {
  const user = await requireUser();

  if (input.content.length > MAX_OFX_BYTES) {
    return { ok: false, message: "Arquivo muito grande." };
  }

  const result = await commitOfxImport(
    {
      assets: new DrizzleAssetRepository(),
      transactions: new DrizzleTransactionRepository(),
      incomes: new DrizzleIncomeRepository(),
      debts: new DrizzleDebtRepository(),
      clock: new SystemClock(),
    },
    {
      userId: user.id,
      content: input.content,
      acceptedIncomeFitIds: input.acceptedIncomeFitIds,
      acceptedDebtFitIds: input.acceptedDebtFitIds,
      isPro: user.isPro,
    },
  );

  if (isErr(result)) {
    if (result.error.kind === "account_limit") {
      return {
        ok: false,
        code: "ACCOUNT_LIMIT",
        message: "No plano gratuito você conecta 1 conta. Para importar de outra conta, assine o Pro.",
      };
    }
    return { ok: false, message: "Não foi possível processar este OFX." };
  }

  return { ok: true };
}
