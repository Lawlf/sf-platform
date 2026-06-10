export const COINGECKO_IDS: Record<string, string> = {
  BTC: "bitcoin",
  ETH: "ethereum",
  USDT: "tether",
  BNB: "binancecoin",
  SOL: "solana",
  XRP: "ripple",
  USDC: "usd-coin",
  ADA: "cardano",
  DOGE: "dogecoin",
  TRX: "tron",
  LINK: "chainlink",
  DOT: "polkadot",
  MATIC: "matic-network",
  LTC: "litecoin",
  SHIB: "shiba-inu",
  AVAX: "avalanche-2",
  XLM: "stellar",
  ATOM: "cosmos",
  UNI: "uniswap",
  ETC: "ethereum-classic",
  BCH: "bitcoin-cash",
  NEAR: "near",
  APT: "aptos",
  ARB: "arbitrum",
  OP: "optimism",
  FIL: "filecoin",
  HBAR: "hedera-hashgraph",
  VET: "vechain",
  ICP: "internet-computer",
  SAND: "the-sandbox",
};

export function coinIdForSymbol(symbol: string): string | null {
  if (typeof symbol !== "string") return null;
  return COINGECKO_IDS[symbol.trim().toUpperCase()] ?? null;
}
