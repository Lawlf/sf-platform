export type HomeState = "com_divida" | "sem_reserva" | "com_patrimonio";

export type HomeCardKey =
  | "hero"
  | "quickAccess"
  | "nextStep"
  | "incomeConfirm"
  | "bringData"
  | "commitment"
  | "projection"
  | "goal"
  | "monthClosing"
  | "consistencyDelta"
  | "maintenance";

export type PrescriptionState =
  | "incomplete"
  | "tight"
  | "bleeding"
  | "no_cushion"
  | "ready_to_grow";

export function resolveHomeState(input: {
  hasDebt: boolean;
  prescriptionState: PrescriptionState;
}): HomeState {
  if (input.hasDebt) return "com_divida";
  if (input.prescriptionState === "ready_to_grow") return "com_patrimonio";
  return "sem_reserva";
}

const ORDER_BY_STATE: Record<HomeState, HomeCardKey[]> = {
  com_divida: ["hero", "incomeConfirm", "quickAccess", "nextStep", "bringData", "commitment", "goal", "monthClosing", "consistencyDelta", "maintenance"],
  sem_reserva: ["hero", "incomeConfirm", "quickAccess", "nextStep", "bringData", "goal", "commitment", "monthClosing", "consistencyDelta", "maintenance"],
  com_patrimonio: ["hero", "incomeConfirm", "quickAccess", "nextStep", "bringData", "commitment", "projection", "goal", "monthClosing", "consistencyDelta", "maintenance"],
};

export function homeCardOrder(state: HomeState): HomeCardKey[] {
  return ORDER_BY_STATE[state];
}
