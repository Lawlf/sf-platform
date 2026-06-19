import { z } from "zod";

import { comparePayoffStrategies } from "@/application/use-cases/simulation/compare-payoff-strategies.use-case";
import type { SimPrefill } from "@/application/use-cases/simulation/load-sim-prefill.use-case";
import { projectDebtPayoff } from "@/application/use-cases/simulation/project-debt-payoff.use-case";
import { simulateExtraPayment } from "@/application/use-cases/simulation/simulate-extra-payment.use-case";
import type { McpContext } from "@/domain/mcp/mcp-context";
import { CashVsInstallmentService } from "@/domain/services/cash-vs-installment.service";
import { CltNetSalaryService } from "@/domain/services/clt-net-salary.service";
import { CompoundGrowthService } from "@/domain/services/compound-growth.service";
import { DebtVsInvestService } from "@/domain/services/debt-vs-invest.service";
import { EbitdaService } from "@/domain/services/ebitda.service";
import { EmergencyFundService } from "@/domain/services/emergency-fund.service";
import { EmployeeVsContractorService } from "@/domain/services/employee-vs-contractor.service";
import { FinancialIndependenceService } from "@/domain/services/financial-independence.service";
import { FinancingService } from "@/domain/services/financing.service";
import { HourlyRateService } from "@/domain/services/hourly-rate.service";
import { InterestRateConverterService } from "@/domain/services/interest-rate-converter.service";
import { InvestmentGoalService } from "@/domain/services/investment-goal.service";
import { MarginMarkupService } from "@/domain/services/margin-markup.service";
import { PurchaseSimulationService } from "@/domain/services/purchase-simulation.service";
import { RuleOfThreeService } from "@/domain/services/rule-of-three.service";
import { SavingsComparisonService } from "@/domain/services/savings-comparison.service";
import { SeveranceService } from "@/domain/services/severance.service";
import { ThirteenthSalaryService } from "@/domain/services/thirteenth-salary.service";
import { VacationPayService } from "@/domain/services/vacation-pay.service";
import { Money } from "@/domain/value-objects/money.vo";
import { clock, repos } from "@/infrastructure/container";
import { resolvePfProfileId } from "@/presentation/http/middleware/active-profile";
import { isErr } from "@/shared/errors/result";

export interface SimulatorToolDef {
  toolName: string;
  description: string;
  inputSchema: Record<string, z.ZodTypeAny>;
  prefill?: (p: SimPrefill, args: Record<string, unknown>) => Record<string, unknown>;
  execute: (args: Record<string, unknown>, ctx: McpContext) => Promise<unknown>;
}

const cents = () => z.number().int().nonnegative();

function n(v: unknown, fallback = 0): number {
  return typeof v === "number" && Number.isFinite(v) ? v : fallback;
}

function big(v: unknown): bigint {
  return BigInt(Math.trunc(n(v)));
}

export const SIMULATOR_TOOLS: SimulatorToolDef[] = [
  {
    toolName: "simulate_compound_growth",
    description: "Projeta juros compostos com aportes mensais.",
    inputSchema: {
      initialCents: cents().optional(),
      monthlyContributionCents: cents(),
      annualRatePct: z.number(),
      years: z.number().positive(),
    },
    prefill: (p, args) =>
      args.initialCents === undefined ? { initialCents: Number(p.investedCents) } : {},
    execute: async (args) =>
      CompoundGrowthService.simulate({
        initialCents: big(args.initialCents),
        monthlyContributionCents: big(args.monthlyContributionCents),
        annualRatePct: n(args.annualRatePct),
        years: n(args.years),
      }),
  },
  {
    toolName: "simulate_financial_independence",
    description: "Calcula quanto falta para a independência financeira.",
    inputSchema: {
      currentInvestedCents: cents().optional(),
      monthlyContributionCents: cents().optional(),
      monthlyCostOfLivingCents: cents(),
      realAnnualReturnPct: z.number(),
    },
    prefill: (p, args) => ({
      ...(args.currentInvestedCents === undefined
        ? { currentInvestedCents: Number(p.investedCents) }
        : {}),
      ...(args.monthlyContributionCents === undefined
        ? { monthlyContributionCents: Number(p.contributionCents) }
        : {}),
    }),
    execute: async (args) =>
      FinancialIndependenceService.simulate({
        currentInvestedCents: big(args.currentInvestedCents),
        monthlyContributionCents: big(args.monthlyContributionCents),
        monthlyCostOfLivingCents: big(args.monthlyCostOfLivingCents),
        realAnnualReturnPct: n(args.realAnnualReturnPct),
      }),
  },
  {
    toolName: "simulate_debt_payoff",
    description: "Projeta a quitação de uma dívida sua com um pagamento mensal.",
    inputSchema: {
      debtId: z.string(),
      monthlyPaymentCents: cents(),
      extraPaymentCents: cents().optional(),
    },
    execute: async (args, ctx) => {
      const profileId = await resolvePfProfileId(ctx.userId);
      const result = await projectDebtPayoff(
        { debts: repos.debts, clock },
        {
          userId: ctx.userId,
          profileId,
          debtId: String(args.debtId),
          monthlyPayment: Money.fromCents(big(args.monthlyPaymentCents)),
          ...(args.extraPaymentCents !== undefined
            ? { extraPayment: Money.fromCents(big(args.extraPaymentCents)) }
            : {}),
        },
      );
      if (isErr(result)) throw result.error;
      return result.value;
    },
  },
  {
    toolName: "simulate_investment_goal",
    description: "Calcula o aporte mensal necessário para atingir uma meta de patrimônio.",
    inputSchema: {
      targetCents: cents(),
      initialCents: cents().optional(),
      annualRatePct: z.number(),
      years: z.number().positive(),
    },
    prefill: (p, args) =>
      args.initialCents === undefined ? { initialCents: Number(p.investedCents) } : {},
    execute: async (args) =>
      InvestmentGoalService.compute({
        targetCents: big(args.targetCents),
        initialCents: big(args.initialCents),
        annualRatePct: n(args.annualRatePct),
        years: n(args.years),
      }),
  },
  {
    toolName: "simulate_savings_comparison",
    description: "Compara onde o dinheiro rende mais entre Poupança, CDB e Tesouro Selic.",
    inputSchema: {
      amountCents: cents().optional(),
      months: z.number().positive(),
      cdiAnnualPct: z.number(),
      cdbPctCdi: z.number(),
    },
    prefill: (p, args) =>
      args.amountCents === undefined ? { amountCents: Number(p.investedCents) } : {},
    execute: async (args) =>
      SavingsComparisonService.compare({
        amountCents: big(args.amountCents),
        months: n(args.months),
        cdiAnnualPct: n(args.cdiAnnualPct),
        cdbPctCdi: n(args.cdbPctCdi),
      }),
  },
  {
    toolName: "simulate_emergency_fund",
    description: "Dimensiona a reserva de emergência em meses de custo fixo.",
    inputSchema: {
      monthlyCostCents: cents(),
      currentReserveCents: cents().optional(),
      targetMonths: z.number().positive(),
      monthlyContributionCents: cents(),
    },
    prefill: (p, args) =>
      args.currentReserveCents === undefined
        ? { currentReserveCents: Number(p.cashReserveCents) }
        : {},
    execute: async (args) =>
      EmergencyFundService.simulate({
        monthlyCostCents: big(args.monthlyCostCents),
        currentReserveCents: big(args.currentReserveCents),
        targetMonths: n(args.targetMonths),
        monthlyContributionCents: big(args.monthlyContributionCents),
      }),
  },
  {
    toolName: "simulate_debt_vs_invest",
    description: "Compara amortizar uma dívida com investir a mesma quantia.",
    inputSchema: {
      amountCents: cents(),
      debtAnnualRatePct: z.number(),
      investAnnualRatePct: z.number(),
      monthsHorizon: z.number().positive(),
    },
    execute: async (args) =>
      DebtVsInvestService.simulate({
        amountCents: big(args.amountCents),
        debtAnnualRatePct: n(args.debtAnnualRatePct),
        investAnnualRatePct: n(args.investAnnualRatePct),
        monthsHorizon: n(args.monthsHorizon),
      }),
  },
  {
    toolName: "simulate_clt_net_salary",
    description: "Calcula o salário líquido CLT mensal descontando INSS e IRRF.",
    inputSchema: {
      grossCents: cents().optional(),
      dependents: z.number().int().nonnegative(),
      otherDeductionsCents: cents(),
    },
    prefill: (p, args) =>
      args.grossCents === undefined ? { grossCents: Number(p.incomeCents) } : {},
    execute: async (args) =>
      CltNetSalaryService.compute({
        grossCents: big(args.grossCents),
        dependents: n(args.dependents),
        otherDeductionsCents: big(args.otherDeductionsCents),
      }),
  },
  {
    toolName: "simulate_thirteenth_salary",
    description: "Calcula o 13º salário líquido e suas duas parcelas.",
    inputSchema: {
      grossSalaryCents: cents().optional(),
      monthsWorked: z.number().int().positive(),
      dependents: z.number().int().nonnegative(),
    },
    prefill: (p, args) =>
      args.grossSalaryCents === undefined ? { grossSalaryCents: Number(p.incomeCents) } : {},
    execute: async (args) =>
      ThirteenthSalaryService.compute({
        grossSalaryCents: big(args.grossSalaryCents),
        monthsWorked: n(args.monthsWorked),
        dependents: n(args.dependents),
      }),
  },
  {
    toolName: "simulate_vacation_pay",
    description: "Calcula as férias líquidas incluindo o terço constitucional.",
    inputSchema: {
      grossSalaryCents: cents().optional(),
      vacationDays: z.number().int().positive(),
      dependents: z.number().int().nonnegative(),
    },
    prefill: (p, args) =>
      args.grossSalaryCents === undefined ? { grossSalaryCents: Number(p.incomeCents) } : {},
    execute: async (args) =>
      VacationPayService.compute({
        grossSalaryCents: big(args.grossSalaryCents),
        vacationDays: n(args.vacationDays),
        dependents: n(args.dependents),
      }),
  },
  {
    toolName: "simulate_severance",
    description: "Estima a rescisão por demissão sem justa causa.",
    inputSchema: {
      grossSalaryCents: cents().optional(),
      completedYears: z.number().int().nonnegative(),
      monthsThisYear: z.number().int().nonnegative(),
      daysWorkedInMonth: z.number().int().nonnegative(),
      fgtsBalanceCents: cents(),
      dependents: z.number().int().nonnegative(),
    },
    prefill: (p, args) =>
      args.grossSalaryCents === undefined ? { grossSalaryCents: Number(p.incomeCents) } : {},
    execute: async (args) =>
      SeveranceService.compute({
        grossSalaryCents: big(args.grossSalaryCents),
        completedYears: n(args.completedYears),
        monthsThisYear: n(args.monthsThisYear),
        daysWorkedInMonth: n(args.daysWorkedInMonth),
        fgtsBalanceCents: big(args.fgtsBalanceCents),
        dependents: n(args.dependents),
      }),
  },
  {
    toolName: "simulate_hourly_rate",
    description: "Calcula quanto vale a sua hora a partir da renda mensal e da jornada.",
    inputSchema: {
      netMonthlyCents: cents().optional(),
      hoursPerWeek: z.number().positive(),
    },
    prefill: (p, args) =>
      args.netMonthlyCents === undefined ? { netMonthlyCents: Number(p.incomeCents) } : {},
    execute: async (args) =>
      HourlyRateService.compute({
        netMonthlyCents: big(args.netMonthlyCents),
        hoursPerWeek: n(args.hoursPerWeek),
      }),
  },
  {
    toolName: "simulate_employee_vs_contractor",
    description: "Compara CLT com PJ (MEI ou Simples) no líquido do mês.",
    inputSchema: {
      cltGrossCents: cents().optional(),
      dependents: z.number().int().nonnegative(),
      includeCltBenefits: z.boolean(),
      pjRevenueCents: cents(),
      pjRegime: z.enum(["mei", "simples"]),
      meiActivity: z.enum(["comercio", "servicos", "ambos"]),
      anexo: z.enum(["III", "V", "auto"]),
      proLaboreCents: cents(),
      accountantCents: cents(),
      businessCostsCents: cents(),
    },
    prefill: (p, args) =>
      args.cltGrossCents === undefined ? { cltGrossCents: Number(p.incomeCents) } : {},
    execute: async (args) =>
      EmployeeVsContractorService.compute({
        cltGrossCents: big(args.cltGrossCents),
        dependents: n(args.dependents),
        includeCltBenefits: Boolean(args.includeCltBenefits),
        pjRevenueCents: big(args.pjRevenueCents),
        pjRegime: args.pjRegime as "mei" | "simples",
        meiActivity: args.meiActivity as "comercio" | "servicos" | "ambos",
        anexo: args.anexo as "III" | "V" | "auto",
        proLaboreCents: big(args.proLaboreCents),
        accountantCents: big(args.accountantCents),
        businessCostsCents: big(args.businessCostsCents),
      }),
  },
  {
    toolName: "simulate_margin_markup",
    description: "Calcula lucro, margem e markup a partir do custo e do preço.",
    inputSchema: {
      costCents: cents(),
      priceCents: cents(),
    },
    execute: async (args) =>
      MarginMarkupService.fromCostPrice({
        costCents: big(args.costCents),
        priceCents: big(args.priceCents),
      }),
  },
  {
    toolName: "simulate_ebitda",
    description: "Calcula o EBITDA e a margem operacional de um pequeno negócio.",
    inputSchema: {
      revenueCents: cents(),
      cogsCents: cents(),
      opexCents: cents(),
    },
    execute: async (args) =>
      EbitdaService.compute({
        revenueCents: big(args.revenueCents),
        cogsCents: big(args.cogsCents),
        opexCents: big(args.opexCents),
      }),
  },
  {
    toolName: "simulate_purchase",
    description: "Compara manter, revender ou investir o valor de uma compra.",
    inputSchema: {
      amountCents: cents(),
      monthsHorizon: z.number().positive(),
      depreciationRatePctYear: z.number(),
      opportunityRatePctYear: z.number(),
    },
    execute: async (args) =>
      PurchaseSimulationService.simulate({
        amountCents: big(args.amountCents),
        monthsHorizon: n(args.monthsHorizon),
        depreciationRatePctYear: n(args.depreciationRatePctYear),
        opportunityRatePctYear: n(args.opportunityRatePctYear),
      }),
  },
  {
    toolName: "simulate_cash_vs_installment",
    description: "Compara pagar à vista com desconto contra parcelar sem juros.",
    inputSchema: {
      fullPriceCents: cents(),
      discountPct: z.number(),
      installments: z.number().int().positive(),
      annualRatePct: z.number(),
    },
    execute: async (args) =>
      CashVsInstallmentService.compute({
        fullPriceCents: big(args.fullPriceCents),
        discountPct: n(args.discountPct),
        installments: n(args.installments),
        annualRatePct: n(args.annualRatePct),
      }),
  },
  {
    toolName: "simulate_financing",
    description: "Simula um financiamento por Tabela Price ou SAC (parcelas, juros e total pago).",
    inputSchema: {
      loanAmountCents: cents(),
      annualRatePct: z.number(),
      months: z.number().int().positive(),
      method: z.enum(["price", "sac"]),
    },
    execute: async (args) =>
      FinancingService.simulate({
        loanAmountCents: big(args.loanAmountCents),
        annualRatePct: n(args.annualRatePct),
        months: n(args.months),
        method: args.method as "price" | "sac",
      }),
  },
  {
    toolName: "convert_interest_rate",
    description: "Converte uma taxa de juros entre mensal e anual em juros compostos.",
    inputSchema: {
      ratePct: z.number(),
      from: z.enum(["monthly", "annual"]),
    },
    execute: async (args) =>
      InterestRateConverterService.convert({
        ratePct: n(args.ratePct),
        from: args.from as "monthly" | "annual",
      }),
  },
  {
    toolName: "solve_rule_of_three",
    description: "Resolve uma regra de três direta ou inversa.",
    inputSchema: {
      a: z.number(),
      b: z.number(),
      c: z.number(),
      kind: z.enum(["direct", "inverse"]),
    },
    execute: async (args) =>
      RuleOfThreeService.solve({
        a: n(args.a),
        b: n(args.b),
        c: n(args.c),
        kind: args.kind as "direct" | "inverse",
      }),
  },
  {
    toolName: "simulate_extra_payment",
    description: "Compara o pagamento de uma dívida sua com e sem um aporte extra mensal.",
    inputSchema: {
      debtId: z.string(),
      monthlyPaymentCents: cents(),
      extraPaymentCents: cents(),
    },
    execute: async (args, ctx) => {
      const profileId = await resolvePfProfileId(ctx.userId);
      const result = await simulateExtraPayment(
        { debts: repos.debts, clock },
        {
          userId: ctx.userId,
          profileId,
          debtId: String(args.debtId),
          monthlyPayment: Money.fromCents(big(args.monthlyPaymentCents)),
          extraPayment: Money.fromCents(big(args.extraPaymentCents)),
        },
      );
      if (isErr(result)) throw result.error;
      return result.value;
    },
  },
  {
    toolName: "simulate_payoff_strategies",
    description: "Compara estratégias de quitação (bola de neve vs avalanche) das suas dívidas.",
    inputSchema: {
      debtIds: z.array(z.string()).min(1),
      monthlyBudgetCents: cents(),
    },
    execute: async (args, ctx) => {
      const profileId = await resolvePfProfileId(ctx.userId);
      const result = await comparePayoffStrategies(
        { debts: repos.debts, clock },
        {
          userId: ctx.userId,
          profileId,
          debtIds: (args.debtIds as string[]).map(String),
          monthlyBudget: Money.fromCents(big(args.monthlyBudgetCents)),
        },
      );
      if (isErr(result)) throw result.error;
      return result.value;
    },
  },
];
