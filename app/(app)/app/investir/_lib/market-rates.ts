export interface MarketRates {
  cdiAnnualPct: number;
  selicAnnualPct: number;
  asOf: string | null;
  live: boolean;
}

const FALLBACK: MarketRates = {
  cdiAnnualPct: 10.5,
  selicAnnualPct: 10.5,
  asOf: null,
  live: false,
};

function sgsUrl(code: number): string {
  return `https://api.bcb.gov.br/dados/serie/bcdata.sgs.${code}/dados/ultimos/1?formato=json`;
}

export function parseSgsValue(json: unknown): { valor: number; data: string } | null {
  if (!Array.isArray(json) || json.length === 0) return null;
  const row = json[0] as { valor?: unknown; data?: unknown };
  const raw = typeof row.valor === "string" ? row.valor : String(row.valor ?? "");
  const valor = Number(raw.replace(",", "."));
  if (!Number.isFinite(valor)) return null;
  return { valor, data: typeof row.data === "string" ? row.data : "" };
}

async function fetchSeries(code: number): Promise<{ valor: number; data: string } | null> {
  try {
    const res = await fetch(sgsUrl(code), { next: { revalidate: 86400 } });
    if (!res.ok) return null;
    return parseSgsValue(await res.json());
  } catch {
    return null;
  }
}

export async function getMarketRates(): Promise<MarketRates> {
  const [cdi, selic] = await Promise.all([fetchSeries(4389), fetchSeries(432)]);
  if (!cdi) return FALLBACK;
  return {
    cdiAnnualPct: cdi.valor,
    selicAnnualPct: selic?.valor ?? cdi.valor,
    asOf: cdi.data || null,
    live: true,
  };
}
