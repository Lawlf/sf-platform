"use server";

import { revalidatePath } from "next/cache";


import { buildOfxPreview } from "@/application/use-cases/import/build-ofx-preview.use-case";
import { commitOfxImport } from "@/application/use-cases/import/commit-ofx-import.use-case";
import { bankNameFromId } from "@/domain/services/ofx/bank-names";
import { clock, repos } from "@/infrastructure/container";
import { requireUser } from "@/presentation/http/middleware/cached-current-user";
import { isErr } from "@/shared/errors/result";

export interface SerializablePreview {
  statementCount: number;
  accountKey: string;
  bankLabel: string;
  ledgerBalance: number;
  matchedAssetLabel: string | null;
  newTransactionCount: number;
  duplicateCount: number;
  net: number;
  incomes: { fitId: string; label: string; amount: number; dayOfMonth: number }[];
  debts: { fitId: string; label: string; installment: number; paid: number | null; total: number | null }[];
  reserve: { guardou: number; tirou: number; existingValue: number | null } | null;
}

type PreviewResult =
  | { ok: true; preview: SerializablePreview }
  | { ok: false; code: string; message: string };

type CommitResult =
  | {
      ok: true;
      assetId: string;
      ledgerBalance: number;
      importedTransactions: number;
      createdIncomes: number;
      createdDebts: number;
      reserveValue: number | null;
    }
  | { ok: false; code?: string; message: string };

const MAX_OFX_BYTES = 5 * 1024 * 1024;

export async function previewOfxAction(formData: FormData): Promise<PreviewResult> {
  const user = await requireUser();

  const files = formData.getAll("file").filter((f): f is File => f instanceof File);
  if (files.length === 0) {
    return { ok: false, code: "MISSING_FILE", message: "Nenhum arquivo enviado." };
  }

  const totalBytes = files.reduce((acc, f) => acc + f.size, 0);
  if (totalBytes > MAX_OFX_BYTES) {
    return { ok: false, code: "FILE_TOO_LARGE", message: "Arquivos muito grandes. Envie até 5 MB no total." };
  }

  const contents = await Promise.all(files.map((f) => f.text()));

  const result = await buildOfxPreview(
    {
      assets: repos.assets,
      transactions: repos.transactions,
    },
    { userId: user.id, contents },
  );

  if (isErr(result)) {
    if (result.error.kind === "mixed_accounts") {
      return {
        ok: false,
        code: "MIXED_ACCOUNTS",
        message: "Importe um banco por vez. Esses arquivos são de contas diferentes.",
      };
    }
    return { ok: false, code: "PARSE_ERROR", message: "Não foi possível ler este OFX." };
  }

  const { value: preview } = result;

  return {
    ok: true,
    preview: {
      statementCount: files.length,
      accountKey: preview.accountKey,
      bankLabel:
        bankNameFromId(preview.accountKey.split(":")[0] ?? "") ??
        `Conta ${preview.accountKey.split(":")[0] ?? preview.accountKey}`,
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
      reserve:
        preview.reserve === null
          ? null
          : {
              guardou: Number(preview.reserve.guardouCents) / 100,
              tirou: Number(preview.reserve.tirouCents) / 100,
              existingValue:
                preview.reserve.existingValueCents === null
                  ? null
                  : Number(preview.reserve.existingValueCents) / 100,
            },
    },
  };
}

export async function commitOfxAction(input: {
  contents: string[];
  acceptedIncomeFitIds: string[];
  acceptedDebtFitIds: string[];
  reserveTotalCents?: number | null;
}): Promise<CommitResult> {
  const user = await requireUser();

  const totalLen = input.contents.reduce((acc, c) => acc + c.length, 0);
  if (totalLen > MAX_OFX_BYTES) {
    return { ok: false, message: "Arquivos muito grandes." };
  }

  const result = await commitOfxImport(
    {
      assets: repos.assets,
      transactions: repos.transactions,
      incomes: repos.incomes,
      debts: repos.debts,
      clock,
    },
    {
      userId: user.id,
      contents: input.contents,
      acceptedIncomeFitIds: input.acceptedIncomeFitIds,
      acceptedDebtFitIds: input.acceptedDebtFitIds,
      isPro: user.isPro,
      reserveTotalCents:
        input.reserveTotalCents == null ? null : BigInt(Math.round(input.reserveTotalCents * 100)),
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
    if (result.error.kind === "mixed_accounts") {
      return { ok: false, message: "Importe um banco por vez." };
    }
    return { ok: false, message: "Não foi possível processar este OFX." };
  }

  revalidatePath("/app");
  revalidatePath("/app/linha-do-tempo");
  revalidatePath("/app/patrimonio");

  return {
    ok: true,
    assetId: result.value.assetId,
    ledgerBalance: Number(result.value.ledgerBalanceCents) / 100,
    importedTransactions: result.value.importedTransactions,
    createdIncomes: result.value.createdIncomes,
    createdDebts: result.value.createdDebts,
    reserveValue:
      result.value.reserveValueCents === null
        ? null
        : Number(result.value.reserveValueCents) / 100,
  };
}
