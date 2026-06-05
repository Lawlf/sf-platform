import type { MoveType } from "@/domain/services/prescription/prescription.types";

import { buildGoalSeedQuery } from "../simular/_lib/goal-seed";

export type PrescriptionMoveType = MoveType;

export interface MoveCta {
  label: string;
  href: string;
}

export function moveCtaFor(move: {
  type: PrescriptionMoveType;
  targetDebtId?: string | null;
}): MoveCta | null {
  switch (move.type) {
    case "pay_debt":
      if (!move.targetDebtId) return null;
      return {
        label: "Criar meta de quitar essa dívida",
        href: `/app/metas/nova?${buildGoalSeedQuery({ type: "debt_payoff", debtId: move.targetDebtId })}`,
      };
    case "build_reserve":
      return { label: "Simular minha reserva", href: "/app/simular/reserva" };
    case "invest":
      return { label: "Onde investir", href: "/app/investir" };
    case "reduce_commitment":
      return { label: "Revisar minhas dívidas", href: "/app/dividas" };
    default:
      return null;
  }
}
