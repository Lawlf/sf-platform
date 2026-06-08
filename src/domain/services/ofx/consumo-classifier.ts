export type ConsumoCategory = "essencial" | "parcelado" | "resto";

const ESSENCIAL = [
  "mercado",
  "supermerc",
  "farmacia",
  "drogaria",
  "posto",
  "combustiv",
  "uber",
  "99app",
  "99 ",
  "transporte",
  "metro",
  "onibus",
  "luz",
  "energia",
  "enel",
  "cemig",
  "agua",
  "sanea",
  "gas ",
  "aluguel",
];

export function classifyConsumo(description: string): ConsumoCategory {
  const memo = description.toLowerCase();
  if (/\d+\s*\/\s*\d+/.test(description) || /parcel/i.test(description)) return "parcelado";
  if (ESSENCIAL.some((kw) => memo.includes(kw))) return "essencial";
  return "resto";
}
