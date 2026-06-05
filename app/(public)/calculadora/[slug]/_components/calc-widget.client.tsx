"use client";

import dynamic from "next/dynamic";
import type { ComponentType } from "react";

/**
 * Mapa slug público -> widget de cálculo. Reusa os mesmos client components dos
 * simuladores internos (engines puros, rodam no browser), carregados via
 * `next/dynamic` para que cada rota de calculadora só baixe o seu próprio JS.
 * O prefill aqui é um exemplo neutro (não vem de dados do usuário, já que a
 * página é pública); o visitante ajusta para o caso dele.
 *
 * Simuladores que dependem de dívidas persistidas do usuário (quitação, pagar
 * extra, snowball vs avalanche, quitar vs investir) ficam de fora: precisam de
 * entrada manual que ainda não existe.
 */
const SalarioCltClient = dynamic(() =>
  import("../../../../(app)/app/simular/salario-clt/_components/clt-salary.client").then(
    (m) => m.CltSalaryClient,
  ),
);
const IndependenceClient = dynamic(() =>
  import(
    "../../../../(app)/app/simular/independencia/_components/independence-simulator.client"
  ).then((m) => m.IndependenceSimulatorClient),
);
const InvestmentGoalClient = dynamic(() =>
  import("../../../../(app)/app/simular/meta/_components/investment-goal.client").then(
    (m) => m.InvestmentGoalClient,
  ),
);
const CompoundGrowthClient = dynamic(() =>
  import(
    "../../../../(app)/app/simular/juros-compostos/_components/compound-growth.client"
  ).then((m) => m.CompoundGrowthClient),
);
const SavingsComparisonClient = dynamic(() =>
  import(
    "../../../../(app)/app/simular/onde-rende-mais/_components/savings-comparison.client"
  ).then((m) => m.SavingsComparisonClient),
);
const EmergencyFundClient = dynamic(() =>
  import("../../../../(app)/app/simular/reserva/_components/emergency-fund.client").then(
    (m) => m.EmergencyFundClient,
  ),
);
const FinancingComparisonClient = dynamic(() =>
  import(
    "../../../../(app)/app/simular/financiamento/_components/financing-comparison.client"
  ).then((m) => m.FinancingComparisonClient),
);
const ThirteenthClient = dynamic(() =>
  import("../../../../(app)/app/simular/decimo-terceiro/_components/thirteenth.client").then(
    (m) => m.ThirteenthClient,
  ),
);
const VacationClient = dynamic(() =>
  import("../../../../(app)/app/simular/ferias/_components/vacation.client").then(
    (m) => m.VacationClient,
  ),
);
const SeveranceClient = dynamic(() =>
  import("../../../../(app)/app/simular/rescisao/_components/severance.client").then(
    (m) => m.SeveranceClient,
  ),
);
const CltVsPjClient = dynamic(() =>
  import("../../../../(app)/app/simular/clt-vs-pj/_components/clt-vs-pj.client").then(
    (m) => m.CltVsPjClient,
  ),
);
const HourlyRateClient = dynamic(() =>
  import("../../../../(app)/app/simular/valor-hora/_components/hourly-rate.client").then(
    (m) => m.HourlyRateClient,
  ),
);
const MarginMarkupClient = dynamic(() =>
  import("../../../../(app)/app/simular/margem/_components/margin-markup.client").then(
    (m) => m.MarginMarkupClient,
  ),
);
const EbitdaClient = dynamic(() =>
  import("../../../../(app)/app/simular/ebitda/_components/ebitda.client").then(
    (m) => m.EbitdaClient,
  ),
);
const PurchaseSimulatorClient = dynamic(() =>
  import("../../../../(app)/app/simular/compra/_components/purchase-simulator.client").then(
    (m) => m.PurchaseSimulatorClient,
  ),
);
const CashVsInstallmentClient = dynamic(() =>
  import(
    "../../../../(app)/app/simular/avista-parcelado/_components/cash-vs-installment.client"
  ).then((m) => m.CashVsInstallmentClient),
);
const RateConverterClient = dynamic(() =>
  import("../../../../(app)/app/simular/conversor-juros/_components/rate-converter.client").then(
    (m) => m.RateConverterClient,
  ),
);
const RuleOfThreeClient = dynamic(() =>
  import("../../../../(app)/app/simular/regra-de-tres/_components/rule-of-three.client").then(
    (m) => m.RuleOfThreeClient,
  ),
);

const REGISTRY: Record<string, ComponentType> = {
  "salario-liquido-clt": () => <SalarioCltClient prefill={{ grossCents: "300000" }} />,
  "independencia-financeira": () => (
    <IndependenceClient
      prefill={{ investedCents: "5000000", contributionCents: "100000", costCents: "400000" }}
    />
  ),
  "meta-de-investimento": () => <InvestmentGoalClient prefill={{ initialCents: "1000000" }} />,
  "juros-compostos": () => (
    <CompoundGrowthClient prefill={{ initialCents: "1000000", contributionCents: "50000" }} />
  ),
  "onde-rende-mais": () => <SavingsComparisonClient prefill={{ amountCents: "1000000" }} />,
  "reserva-de-emergencia": () => (
    <EmergencyFundClient
      prefill={{
        monthlyCostCents: "400000",
        currentReserveCents: "500000",
        contributionCents: "50000",
      }}
    />
  ),
  "financiamento-price-ou-sac": () => <FinancingComparisonClient />,
  "decimo-terceiro-salario": () => <ThirteenthClient prefill={{ grossSalaryCents: "300000" }} />,
  "ferias-liquidas": () => <VacationClient prefill={{ grossSalaryCents: "300000" }} />,
  "rescisao-trabalhista": () => <SeveranceClient prefill={{ grossSalaryCents: "300000" }} />,
  "clt-ou-pj": () => <CltVsPjClient prefill={{ cltGrossCents: "500000" }} />,
  "valor-da-hora-de-trabalho": () => <HourlyRateClient prefill={{ netMonthlyCents: "400000" }} />,
  "margem-e-markup": () => <MarginMarkupClient />,
  ebitda: () => <EbitdaClient />,
  "vale-a-pena-comprar": () => <PurchaseSimulatorClient />,
  "a-vista-ou-parcelado": () => <CashVsInstallmentClient />,
  "conversor-de-taxa-de-juros": () => <RateConverterClient />,
  "regra-de-tres": () => <RuleOfThreeClient />,
};

export function CalcWidget({ slug }: { slug: string }) {
  const Widget = REGISTRY[slug];
  if (!Widget) return null;
  return <Widget />;
}

export function hasCalcWidget(slug: string): boolean {
  return slug in REGISTRY;
}
