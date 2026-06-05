export type HomeState = "com_divida" | "sem_reserva" | "com_patrimonio";

export type HomeCardKey =
  | "hero"
  | "quickAccess"
  | "nextStep"
  | "commitment"
  | "projection"
  | "goal"
  | "monthClosing"
  | "maintenance"
  | "mais";

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
  com_divida: ["hero", "quickAccess", "nextStep", "commitment", "goal", "monthClosing", "maintenance", "mais"],
  sem_reserva: ["hero", "quickAccess", "nextStep", "goal", "commitment", "monthClosing", "maintenance", "mais"],
  com_patrimonio: ["hero", "quickAccess", "nextStep", "commitment", "projection", "goal", "monthClosing", "maintenance", "mais"],
};

export function homeCardOrder(state: HomeState): HomeCardKey[] {
  return ORDER_BY_STATE[state];
}
