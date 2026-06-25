import { resolveIrrf } from "./brazil-payroll-tax";
import {
  MEI_DAS_2026,
  MEI_ANNUAL_LIMIT,
  proLaboreInss,
  resolveAnexoByFatorR,
  simplesEffectiveRate,
  type MeiActivity,
  type SimplesAnexo,
} from "./brazil-simples-tax";
import { CltNetSalaryService } from "./clt-net-salary.service";

export type PjRegime = "mei" | "simples";
export type AnexoChoice = SimplesAnexo | "auto";

export interface EmployeeVsContractorInput {
  /** Salário bruto CLT (centavos). */
  cltGrossCents: bigint;
  /** Dependentes para o IRRF (vale para CLT e pró-labore). */
  dependents: number;
  /** Soma FGTS + 13º + 1/3 de férias ao lado CLT, para comparação justa. */
  includeCltBenefits: boolean;
  /** Faturamento mensal como PJ (centavos). */
  pjRevenueCents: bigint;
  pjRegime: PjRegime;
  /** Atividade do MEI (define o DAS fixo). */
  meiActivity: MeiActivity;
  /** Anexo do Simples; "auto" decide pelo Fator R. */
  anexo: AnexoChoice;
  /** Pró-labore mensal no Simples (centavos). */
  proLaboreCents: bigint;
  /** Custo do contador por mês (centavos). */
  accountantCents: bigint;
  /** Custos do negócio: produtos para revenda, insumos, etc (centavos). */
  businessCostsCents: bigint;
}

export interface EmployeeVsContractorResult {
  clt: {
    netCents: bigint;
    /** Líquido + benefícios (FGTS, 13º, 1/3 férias) diluídos no mês. */
    withBenefitsCents: bigint;
  };
  pj: {
    dasCents: bigint;
    proLaboreInssCents: bigint;
    proLaboreIrrfCents: bigint;
    accountantCents: bigint;
    businessCostsCents: bigint;
    netCents: bigint;
    regime: PjRegime;
    /** Anexo aplicado (só Simples). */
    anexoUsed: SimplesAnexo | null;
    /** Fator R calculado (só Simples). */
    fatorR: number | null;
    /** true se o faturamento ultrapassa o teto do MEI. */
    overMeiLimit: boolean;
  };
  /** Base de comparação do CLT (com ou sem benefícios). */
  cltCompareCents: bigint;
  recommendation: "clt" | "pj" | "empate";
  /** Diferença absoluta entre PJ líquido e CLT comparado (centavos). */
  differenceCents: bigint;
}

const TOLERANCE_CENTS = 1n;

/**
 * Serviço puro: compara CLT (líquido, opcionalmente com benefícios) com PJ
 * (MEI de DAS fixo ou Simples ME com imposto efetivo + pró-labore + contador).
 * Estimativa: encargos e custo de contador variam. Reaproveita os módulos de
 * imposto. Sem I/O, sem efeitos colaterais.
 */
export class EmployeeVsContractorService {
  static compute(input: EmployeeVsContractorInput): EmployeeVsContractorResult {
    // Lado CLT.
    const cltSalary = Number(input.cltGrossCents) / 100;
    const cltNet = CltNetSalaryService.compute({
      grossCents: input.cltGrossCents,
      dependents: input.dependents,
      otherDeductionsCents: 0n,
    });
    const cltNetReais = Number(cltNet.netCents) / 100;
    // Benefícios diluídos no mês: FGTS 8% + 13º (1/12) + 1/3 de férias (1/36).
    const benefitsMonthly = cltSalary * (0.08 + 1 / 12 + 1 / 36);
    const cltWithBenefits = cltNetReais + benefitsMonthly;
    const cltCompare = input.includeCltBenefits ? cltWithBenefits : cltNetReais;

    // Lado PJ.
    const revenue = Number(input.pjRevenueCents) / 100;
    let das = 0;
    let plInss = 0;
    let plIrrf = 0;
    let anexoUsed: SimplesAnexo | null = null;
    let fatorR: number | null = null;
    let overMeiLimit = false;
    const accountant = Number(input.accountantCents) / 100;

    if (input.pjRegime === "mei") {
      das = MEI_DAS_2026[input.meiActivity];
      overMeiLimit = revenue * 12 > MEI_ANNUAL_LIMIT;
    } else {
      const proLabore = Number(input.proLaboreCents) / 100;
      const resolved = resolveAnexoByFatorR(proLabore, revenue);
      fatorR = resolved.fatorR;
      anexoUsed = input.anexo === "auto" ? resolved.anexo : input.anexo;
      const effective = simplesEffectiveRate(revenue * 12, anexoUsed);
      das = revenue * effective;
      if (proLabore > 0) {
        plInss = proLaboreInss(proLabore);
        plIrrf = resolveIrrf(proLabore, plInss, input.dependents).tax;
      }
    }

    const businessCosts = Number(input.businessCostsCents) / 100;
    const pjNet = revenue - das - plInss - plIrrf - accountant - businessCosts;

    const cltCompareCents = reaisToCents(cltCompare);
    const pjNetCents = reaisToCents(pjNet);

    let recommendation: "clt" | "pj" | "empate" = "empate";
    if (pjNetCents - cltCompareCents > TOLERANCE_CENTS) recommendation = "pj";
    else if (cltCompareCents - pjNetCents > TOLERANCE_CENTS) recommendation = "clt";

    const differenceCents =
      pjNetCents > cltCompareCents ? pjNetCents - cltCompareCents : cltCompareCents - pjNetCents;

    return {
      clt: { netCents: cltNet.netCents, withBenefitsCents: reaisToCents(cltWithBenefits) },
      pj: {
        dasCents: reaisToCents(das),
        proLaboreInssCents: reaisToCents(plInss),
        proLaboreIrrfCents: reaisToCents(plIrrf),
        accountantCents: reaisToCents(accountant),
        businessCostsCents: reaisToCents(businessCosts),
        netCents: pjNetCents,
        regime: input.pjRegime,
        anexoUsed,
        fatorR,
        overMeiLimit,
      },
      cltCompareCents,
      recommendation,
      differenceCents,
    };
  }
}

function reaisToCents(reais: number): bigint {
  if (!Number.isFinite(reais)) return 0n;
  return BigInt(Math.round(reais * 100));
}
