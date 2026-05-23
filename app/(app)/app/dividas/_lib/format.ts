const BRL = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

export function formatCentsBRL(cents: bigint | number | null | undefined): string {
  if (cents === null || cents === undefined) return "R$ 0,00";
  const n = typeof cents === "bigint" ? Number(cents) / 100 : cents / 100;
  return BRL.format(n);
}
