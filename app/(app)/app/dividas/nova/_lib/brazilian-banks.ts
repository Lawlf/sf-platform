export const BRAZILIAN_BANKS: readonly string[] = [
  "Nubank",
  "Itaú",
  "Bradesco",
  "Caixa",
  "Banco do Brasil",
  "Santander",
  "Inter",
  "C6 Bank",
  "BTG Pactual",
  "PicPay",
  "PagBank",
  "Mercado Pago",
  "Next",
  "Neon",
  "Will Bank",
  "Banco Original",
  "Banco Pan",
  "BMG",
  "Banco Safra",
  "Banrisul",
  "Sicoob",
  "Sicredi",
  "BV",
  "XP",
] as const;

export function normalizeBankQuery(value: string): string {
  return value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .trim();
}

export function filterBankOptions(options: readonly string[], query: string): string[] {
  const q = normalizeBankQuery(query);
  if (q === "") return [...options];
  return options.filter((o) => normalizeBankQuery(o).includes(q));
}
