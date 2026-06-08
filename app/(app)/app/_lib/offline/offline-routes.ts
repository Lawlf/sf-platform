import type { Route } from "next";

import { SIMULATORS } from "../../simular/_lib/simulators";

const NETWORK_ONLY_SIM_IDS = new Set(["estrategia", "extra", "quitacao"]);

export const OFFLINE_SIMULATOR_HREFS: Route[] = SIMULATORS.filter(
  (sim) => !NETWORK_ONLY_SIM_IDS.has(sim.id),
).map((sim) => sim.href);

const OFFLINE_ROUTES = new Set<string>(["/app", "/app/simular", ...OFFLINE_SIMULATOR_HREFS]);

export function isOfflineRoute(pathname: string): boolean {
  return OFFLINE_ROUTES.has(pathname);
}
