const QUANTITY_SCALE = 100_000_000n;
const QUANTITY_SCALE_NUM = 100_000_000;

// Escala 1e8 antes de virar bigint: BigInt(0.2) === 0n truncaria frações.
export function valueCryptoCents(quantity: number, pricePerCoinCents: bigint): bigint {
  if (!Number.isFinite(quantity) || quantity <= 0) return 0n;
  if (pricePerCoinCents <= 0n) return 0n;
  const scaledQty = BigInt(Math.round(quantity * QUANTITY_SCALE_NUM));
  return (pricePerCoinCents * scaledQty) / QUANTITY_SCALE;
}
