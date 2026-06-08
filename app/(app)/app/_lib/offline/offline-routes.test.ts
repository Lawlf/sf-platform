import { describe, expect, it } from "vitest";

import { OFFLINE_SIMULATOR_HREFS, isOfflineRoute } from "./offline-routes";

describe("offline routes", () => {
  it("inclui o início e o hub de simuladores", () => {
    expect(isOfflineRoute("/app")).toBe(true);
    expect(isOfflineRoute("/app/simular")).toBe(true);
  });

  it("inclui simuladores de cálculo puro", () => {
    expect(isOfflineRoute("/app/simular/juros-compostos")).toBe(true);
    expect(isOfflineRoute("/app/simular/financiamento")).toBe(true);
  });

  it("exclui simuladores cujo cálculo roda no servidor", () => {
    expect(isOfflineRoute("/app/simular/estrategia")).toBe(false);
    expect(isOfflineRoute("/app/simular/extra")).toBe(false);
    expect(isOfflineRoute("/app/simular/quitacao")).toBe(false);
  });

  it("exclui telas que dependem de dados ao vivo", () => {
    expect(isOfflineRoute("/app/dividas")).toBe(false);
    expect(isOfflineRoute("/app/renda/nova")).toBe(false);
  });

  it("não lista os simuladores que precisam de rede para aquecer o cache", () => {
    expect(OFFLINE_SIMULATOR_HREFS).not.toContain("/app/simular/estrategia");
    expect(OFFLINE_SIMULATOR_HREFS).toContain("/app/simular/juros-compostos");
  });
});
