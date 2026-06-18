import { describe, expect, it } from "vitest";

import { diagnoseMei } from "./mei-diagnostic.service";
import type { MeiDiagnosticSnapshot } from "./mei-diagnostic.types";

const base: MeiDiagnosticSnapshot = {
  faturamentoMensalCents: 1000000n,
  despesasOperacionaisCents: 100000n,
  dasCents: 60000n,
  proLaboreCents: 300000n,
  gastoPessoalPjCents: 0n,
  custoDeVidaMensalCents: 400000n,
  saldoPfCents: 50000n,
};

describe("diagnoseMei — 4 core numbers", () => {
  it("empresaFaturou = faturamento", () => {
    const r = diagnoseMei(base);
    expect(r.empresaFaturouCents).toBe(1000000n);
  });

  it("voceRetirou = proLabore", () => {
    const r = diagnoseMei(base);
    expect(r.voceRetirouCents).toBe(300000n);
  });

  it("sobrouNaEmpresa = faturamento - despesasOp - das - proLabore", () => {
    const r = diagnoseMei(base);
    expect(r.sobrouNaEmpresaCents).toBe(1000000n - 100000n - 60000n - 300000n);
  });

  it("dinheiroReal adds sobrouNaEmpresa when positive", () => {
    const r = diagnoseMei(base);
    const sobrou = 1000000n - 100000n - 60000n - 300000n;
    expect(r.dinheiroRealCents).toBe(50000n + sobrou);
  });

  it("dinheiroReal does NOT add sobrouNaEmpresa when negative", () => {
    const negative: MeiDiagnosticSnapshot = {
      ...base,
      despesasOperacionaisCents: 900000n,
    };
    const r = diagnoseMei(negative);
    expect(r.sobrouNaEmpresaCents).toBeLessThan(0n);
    expect(r.dinheiroRealCents).toBe(negative.saldoPfCents);
  });

  it("salarioReal = proLabore + gastoPessoalPj", () => {
    const s: MeiDiagnosticSnapshot = { ...base, gastoPessoalPjCents: 80000n };
    const r = diagnoseMei(s);
    expect(r.salarioRealCents).toBe(300000n + 80000n);
  });
});

describe("diagnoseMei — insights", () => {
  it("pro_labore_curto fires when proLabore < custoDeVida (custoDeVida > 0)", () => {
    const r = diagnoseMei(base);
    const insight = r.insights.find((i) => i.kind === "pro_labore_curto");
    expect(insight).toBeDefined();
    expect(insight?.diffCents).toBe(400000n - 300000n);
    expect(insight?.coberturaPct).toBe(75);
    expect(insight?.impactCents).toBe(100000n);
  });

  it("pro_labore_curto is suppressed when proLabore >= custoDeVida", () => {
    const s: MeiDiagnosticSnapshot = { ...base, proLaboreCents: 400000n };
    const r = diagnoseMei(s);
    expect(r.insights.find((i) => i.kind === "pro_labore_curto")).toBeUndefined();
  });

  it("pro_labore_curto is suppressed when custoDeVida == 0 (zero-guard)", () => {
    const s: MeiDiagnosticSnapshot = {
      ...base,
      custoDeVidaMensalCents: 0n,
      proLaboreCents: 0n,
    };
    const r = diagnoseMei(s);
    expect(r.insights.find((i) => i.kind === "pro_labore_curto")).toBeUndefined();
  });

  it("mistura_pf_pj fires when gastoPessoalPj > 0", () => {
    const s: MeiDiagnosticSnapshot = { ...base, gastoPessoalPjCents: 50000n };
    const r = diagnoseMei(s);
    const insight = r.insights.find((i) => i.kind === "mistura_pf_pj");
    expect(insight).toBeDefined();
    expect(insight?.valorCents).toBe(50000n);
    expect(insight?.pctFaturamento).toBe(5);
  });

  it("mistura_pf_pj pctFaturamento is undefined when faturamento == 0 (zero-guard)", () => {
    const s: MeiDiagnosticSnapshot = {
      ...base,
      faturamentoMensalCents: 0n,
      gastoPessoalPjCents: 50000n,
    };
    const r = diagnoseMei(s);
    const insight = r.insights.find((i) => i.kind === "mistura_pf_pj");
    expect(insight).toBeDefined();
    expect(insight?.pctFaturamento).toBeUndefined();
  });

  it("mistura_pf_pj is suppressed when gastoPessoalPj == 0", () => {
    const r = diagnoseMei(base);
    expect(r.insights.find((i) => i.kind === "mistura_pf_pj")).toBeUndefined();
  });

  it("salario_real fires when proLabore + gastoPessoalPj > 0", () => {
    const r = diagnoseMei(base);
    const insight = r.insights.find((i) => i.kind === "salario_real");
    expect(insight).toBeDefined();
    expect(insight?.proLaboreCents).toBe(300000n);
    expect(insight?.gastoPessoalPjCents).toBe(0n);
    expect(insight?.impactCents).toBe(300000n);
  });

  it("salario_real is suppressed when proLabore + gastoPessoalPj == 0", () => {
    const s: MeiDiagnosticSnapshot = {
      ...base,
      proLaboreCents: 0n,
      gastoPessoalPjCents: 0n,
    };
    const r = diagnoseMei(s);
    expect(r.insights.find((i) => i.kind === "salario_real")).toBeUndefined();
  });

  it("caixa_preso fires when sobrouNaEmpresa > 0", () => {
    const r = diagnoseMei(base);
    const insight = r.insights.find((i) => i.kind === "caixa_preso");
    expect(insight).toBeDefined();
    const sobrou = 1000000n - 100000n - 60000n - 300000n;
    expect(insight?.valorCents).toBe(sobrou);
    expect(insight?.impactCents).toBe(sobrou);
  });

  it("caixa_preso is suppressed when sobrouNaEmpresa <= 0", () => {
    const s: MeiDiagnosticSnapshot = {
      ...base,
      despesasOperacionaisCents: 900000n,
    };
    const r = diagnoseMei(s);
    expect(r.insights.find((i) => i.kind === "caixa_preso")).toBeUndefined();
  });
});

describe("diagnoseMei — ordering desc by impactCents", () => {
  it("larger impactCents appears first", () => {
    const s: MeiDiagnosticSnapshot = {
      faturamentoMensalCents: 1000000n,
      despesasOperacionaisCents: 50000n,
      dasCents: 50000n,
      proLaboreCents: 200000n,
      gastoPessoalPjCents: 800000n,
      custoDeVidaMensalCents: 500000n,
      saldoPfCents: 10000n,
    };
    const r = diagnoseMei(s);
    for (let i = 0; i < r.insights.length - 1; i++) {
      expect(r.insights[i]!.impactCents >= r.insights[i + 1]!.impactCents).toBe(true);
    }
  });

  it("mistura large before caixa_preso small", () => {
    const s: MeiDiagnosticSnapshot = {
      faturamentoMensalCents: 500000n,
      despesasOperacionaisCents: 150000n,
      dasCents: 5000n,
      proLaboreCents: 100000n,
      gastoPessoalPjCents: 300000n,
      custoDeVidaMensalCents: 0n,
      saldoPfCents: 0n,
    };
    const r = diagnoseMei(s);
    const misturaIdx = r.insights.findIndex((i) => i.kind === "mistura_pf_pj");
    const caixaIdx = r.insights.findIndex((i) => i.kind === "caixa_preso");
    const sobrou = 500000n - 150000n - 5000n - 100000n;
    expect(sobrou).toBeLessThan(300000n);
    expect(misturaIdx).toBeLessThan(caixaIdx);
  });
});
