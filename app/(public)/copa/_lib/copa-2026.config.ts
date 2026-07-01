import type { GeoPoint } from "@/domain/services/geo-distance";

export type HotelBand = "simples" | "medio" | "luxo";

export interface TicketCategory {
  id: string;
  label: string;
  note: string;
  priceCents: bigint;
  /** Pacote servido fora da arquibancada (ex.: FIFA Pavilion). */
  outsideVenue?: boolean;
}

export interface CostConfig {
  flightBaseCents: bigint;
  flightPerKmCents: number;
  seasonSurge: number;
  hotelNightly: Record<HotelBand, bigint>;
  dailyExtrasCents: bigint;
  visaCents: bigint;
  insurancePerDayCents: bigint;
  estimateSpreadPct: number;
}

export interface CopaMatch {
  slug: string;
  homeTeam: string;
  awayTeam: string;
  stageLabel: string;
  kickoffLabel: string;
  venueName: string;
  venueCity: string;
  venue: GeoPoint;
  ticketCategories: ReadonlyArray<TicketCategory>;
  active: boolean;
}

/** Cotação de referência usada para converter valores nativos em dólar. Rótulo visível ao usuário. */
export const FX_REFERENCE = {
  // Documents manual USD→BRL derivation used to author BRL values; not applied at runtime.
  usdToBrl: 5.45,
  label: "US$ 1 ≈ R$ 5,45 (referência jun/2026)",
};

/**
 * Botões de calibração do custo, em centavos de real. Voo: base + por-km, com
 * multiplicador de alta temporada da Copa. Calibrado para GRU→EWR (~7500 km)
 * cair perto de R$ 7.000 no pico. Diárias de hotel refletem o fim de semana da
 * Copa em Nova Jersey (inflacionadas), não a baixa temporada. Números são
 * estimativa editável.
 */
export const COST_CONFIG: CostConfig = {
  flightBaseCents: 120_000n,
  flightPerKmCents: 50,
  seasonSurge: 1.4,
  hotelNightly: { simples: 190_000n, medio: 440_000n, luxo: 1_090_000n },
  dailyExtrasCents: 40_000n,
  visaCents: 100_000n,
  insurancePerDayCents: 4_000n,
  estimateSpreadPct: 0.18,
};

/** Aeroporto de destino: Newark (EWR), o mais próximo do MetLife Stadium. */
export const COPA_DESTINATION = { iata: "EWR", lat: 40.6925, lon: -74.1687 } as const;

export const COPA_MATCHES: ReadonlyArray<CopaMatch> = [
  {
    slug: "brasil-vs-noruega",
    homeTeam: "Brasil",
    awayTeam: "Noruega",
    stageLabel: "Oitavas de final",
    kickoffLabel: "domingo, 5 de julho de 2026, 17h (Brasília)",
    venueName: "MetLife Stadium",
    venueCity: "East Rutherford, Nova Jersey",
    venue: { lat: 40.8135, lon: -74.0745 },
    // Pacotes de hospitalidade FIFA (preço "a partir de", em USD → BRL a US$1≈R$5,45).
    ticketCategories: [
      { id: "pitchside", label: "Pitchside Lounge", note: "Assentos à beira do campo, experiência mais premium", priceCents: 4_090_000n },
      { id: "vip", label: "VIP", note: "Excelente visão lateral, hospitalidade premium", priceCents: 3_130_000n },
      { id: "trophy", label: "Trophy Lounge", note: "Visão lateral, gastronomia refinada", priceCents: 2_450_000n },
      { id: "champions", label: "Champions Club", note: "Assentos preferenciais, área exclusiva", priceCents: 2_290_000n },
      { id: "fifa-pavilion", label: "FIFA Pavilion", note: "Fora do estádio, opção mais acessível", priceCents: 1_690_000n, outsideVenue: true },
    ],
    active: true,
  },
];

export function getCopaMatch(slug: string): CopaMatch | undefined {
  return COPA_MATCHES.find((m) => m.slug === slug);
}

export function activeCopaMatches(): CopaMatch[] {
  return COPA_MATCHES.filter((m) => m.active);
}
