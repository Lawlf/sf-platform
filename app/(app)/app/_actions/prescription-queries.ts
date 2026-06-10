"use server";

import { buildPrescription } from "@/application/use-cases/prescription/build-prescription.use-case";
import type { MoveType, Prescription } from "@/domain/services/prescription/prescription.types";
import { clock, repos } from "@/infrastructure/container";
import { getCurrentUser } from "@/presentation/http/middleware/cached-current-user";
import { isOk } from "@/shared/errors/result";

export interface PrescriptionViewPayload {
  isPro: boolean;
  /** true quando há algo a prescrever (state !== "incomplete"). */
  hasPlan: boolean;
  state: Prescription["state"];
  /** só preenchido quando isPro === true (paywall). */
  prescription: Prescription | null;
  /** indica que existe plano sem revelar conteúdo (free + pro). */
  teaser: { hasPlan: boolean; missing: Prescription["completeness"]["missing"] };
  /** resposta concreta liberada pro free (sem números): qual movimento e dívida. */
  freeMove: { type: MoveType; targetDebtLabel: string | null; targetDebtId: string | null } | null;
  /** isca da timeline pro free: nome da 1ª dívida que quita, mês escondido (paywall). */
  timelineTeaser: { firstDebtLabel: string } | null;
}

export async function fetchPrescription(): Promise<PrescriptionViewPayload | null> {
  const user = await getCurrentUser();
  if (!user) return null;

  const r = await buildPrescription(
    {
      debts: repos.debts,
      incomes: repos.incomes,
      assets: repos.assets,
      now: () => clock.now(),
      rates: repos.exchangeRates,
      overrides: repos.userFxOverrides,
      clock,
    },
    { userId: user.id },
  );
  if (!isOk(r)) return null;

  const p = r.value;
  const hasPlan = p.state !== "incomplete";
  const dom = p.dominant;
  const firstPayoff = p.timeline.find((seg) => seg.kind === "debt");

  return {
    timelineTeaser: firstPayoff ? { firstDebtLabel: firstPayoff.debtLabel } : null,
    isPro: user.isPro,
    hasPlan,
    state: p.state,
    prescription: user.isPro ? p : null, // paywall: números só pra Pro
    teaser: { hasPlan, missing: p.completeness.missing },
    // Movimento concreto sem números: liberado pro free (qual dívida atacar).
    freeMove: dom
      ? {
          type: dom.type,
          targetDebtLabel: dom.targetDebtLabel ?? null,
          targetDebtId: dom.targetDebtId ?? null,
        }
      : null,
  };
}
