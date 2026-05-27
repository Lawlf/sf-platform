"use server";

import { getCurrentUser } from "@/presentation/http/middleware/cached-current-user";
import { buildPrescription } from "@/application/use-cases/prescription/build-prescription.use-case";
import { DrizzleDebtRepository } from "@/infrastructure/persistence/drizzle/repositories/drizzle-debt.repository";
import { DrizzleIncomeRepository } from "@/infrastructure/persistence/drizzle/repositories/drizzle-income.repository";
import { DrizzleAssetRepository } from "@/infrastructure/persistence/drizzle/repositories/drizzle-asset.repository";
import { isOk } from "@/shared/errors/result";
import type { Prescription } from "@/domain/services/prescription/prescription.types";

export interface PrescriptionViewPayload {
  isPro: boolean;
  /** true quando há algo a prescrever (state !== "incomplete"). */
  hasPlan: boolean;
  state: Prescription["state"];
  /** só preenchido quando isPro === true (paywall). */
  prescription: Prescription | null;
  /** indica que existe plano sem revelar conteúdo (free + pro). */
  teaser: { hasPlan: boolean; missing: Prescription["completeness"]["missing"] };
}

export async function fetchPrescription(): Promise<PrescriptionViewPayload | null> {
  const user = await getCurrentUser();
  if (!user) return null;

  const r = await buildPrescription(
    {
      debts: new DrizzleDebtRepository(),
      incomes: new DrizzleIncomeRepository(),
      assets: new DrizzleAssetRepository(),
      now: () => new Date(),
    },
    { userId: user.id },
  );
  if (!isOk(r)) return null;

  const p = r.value;
  const hasPlan = p.state !== "incomplete";

  return {
    isPro: user.isPro,
    hasPlan,
    state: p.state,
    prescription: user.isPro ? p : null, // paywall: conteúdo só pra Pro
    teaser: { hasPlan, missing: p.completeness.missing },
  };
}
