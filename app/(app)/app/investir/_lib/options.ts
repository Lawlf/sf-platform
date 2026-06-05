export type Horizon = "anytime" | "short" | "long";

export type ComparableProduct = "poupanca" | "cdb" | "tesouro";

export interface InvestOption {
  key: string;
  name: string;
  horizons: Horizon[];
  comparable: ComparableProduct | null;
  assetCategory: "cash" | "investment";
  goalType: "savings" | "emergency_fund";
  detailName: string;
}

export const INVEST_OPTIONS: InvestOption[] = [
  {
    key: "tesouro-selic",
    name: "Tesouro Selic",
    horizons: ["anytime"],
    comparable: "tesouro",
    assetCategory: "investment",
    goalType: "emergency_fund",
    detailName: "Tesouro Selic",
  },
  {
    key: "cdb-liquidez",
    name: "CDB de liquidez diária",
    horizons: ["anytime"],
    comparable: "cdb",
    assetCategory: "investment",
    goalType: "emergency_fund",
    detailName: "CDB de liquidez diária",
  },
  {
    key: "poupanca",
    name: "Poupança",
    horizons: ["anytime"],
    comparable: "poupanca",
    assetCategory: "cash",
    goalType: "emergency_fund",
    detailName: "Poupança",
  },
  {
    key: "cdb",
    name: "CDB",
    horizons: ["short"],
    comparable: null,
    assetCategory: "investment",
    goalType: "savings",
    detailName: "CDB",
  },
  {
    key: "rdc",
    name: "RDC de cooperativa",
    horizons: ["short"],
    comparable: null,
    assetCategory: "investment",
    goalType: "savings",
    detailName: "RDC de cooperativa",
  },
  {
    key: "lci-lca",
    name: "LCI/LCA",
    horizons: ["short"],
    comparable: null,
    assetCategory: "investment",
    goalType: "savings",
    detailName: "LCI/LCA",
  },
  {
    key: "tesouro-prefixado",
    name: "Tesouro prefixado",
    horizons: ["short", "long"],
    comparable: null,
    assetCategory: "investment",
    goalType: "savings",
    detailName: "Tesouro prefixado",
  },
  {
    key: "tesouro-ipca",
    name: "Tesouro IPCA+",
    horizons: ["long"],
    comparable: null,
    assetCategory: "investment",
    goalType: "savings",
    detailName: "Tesouro IPCA+",
  },
  {
    key: "fundos",
    name: "Fundos de investimento",
    horizons: ["long"],
    comparable: null,
    assetCategory: "investment",
    goalType: "savings",
    detailName: "Fundos de investimento",
  },
  {
    key: "acoes",
    name: "Ações",
    horizons: ["long"],
    comparable: null,
    assetCategory: "investment",
    goalType: "savings",
    detailName: "Ações",
  },
  {
    key: "fii",
    name: "Fundos imobiliários (FIIs)",
    horizons: ["long"],
    comparable: null,
    assetCategory: "investment",
    goalType: "savings",
    detailName: "Fundos imobiliários (FIIs)",
  },
  {
    key: "cripto",
    name: "Criptomoedas",
    horizons: ["long"],
    comparable: null,
    assetCategory: "investment",
    goalType: "savings",
    detailName: "Criptomoedas",
  },
];

export function optionsForHorizon(horizon: Horizon): InvestOption[] {
  return INVEST_OPTIONS.filter((o) => o.horizons.includes(horizon));
}

export type Level = 1 | 2 | 3;

export interface OptionProfile {
  retorno: Level;
  risco: Level;
  liquidez: Level;
}

export const OPTION_PROFILE: Record<string, OptionProfile> = {
  "tesouro-selic": { retorno: 1, risco: 1, liquidez: 3 },
  "cdb-liquidez": { retorno: 1, risco: 1, liquidez: 3 },
  poupanca: { retorno: 1, risco: 1, liquidez: 3 },
  cdb: { retorno: 2, risco: 1, liquidez: 2 },
  rdc: { retorno: 2, risco: 1, liquidez: 2 },
  "lci-lca": { retorno: 2, risco: 1, liquidez: 1 },
  "tesouro-prefixado": { retorno: 2, risco: 2, liquidez: 2 },
  "tesouro-ipca": { retorno: 2, risco: 2, liquidez: 2 },
  fundos: { retorno: 2, risco: 2, liquidez: 2 },
  acoes: { retorno: 3, risco: 3, liquidez: 3 },
  fii: { retorno: 3, risco: 3, liquidez: 2 },
  cripto: { retorno: 3, risco: 3, liquidez: 3 },
};
