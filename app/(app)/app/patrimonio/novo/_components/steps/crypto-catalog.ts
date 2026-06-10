export interface CryptoCatalogEntry {
  symbol: string;
  name: string;
  id: string;
}

export const CRYPTO_CATALOG: CryptoCatalogEntry[] = [
  { symbol: "BTC", name: "Bitcoin", id: "bitcoin" },
  { symbol: "ETH", name: "Ethereum", id: "ethereum" },
  { symbol: "USDT", name: "Tether", id: "tether" },
  { symbol: "BNB", name: "BNB", id: "binancecoin" },
  { symbol: "SOL", name: "Solana", id: "solana" },
  { symbol: "XRP", name: "XRP", id: "ripple" },
  { symbol: "USDC", name: "USD Coin", id: "usd-coin" },
  { symbol: "ADA", name: "Cardano", id: "cardano" },
  { symbol: "DOGE", name: "Dogecoin", id: "dogecoin" },
  { symbol: "TRX", name: "TRON", id: "tron" },
  { symbol: "LINK", name: "Chainlink", id: "chainlink" },
  { symbol: "DOT", name: "Polkadot", id: "polkadot" },
  { symbol: "MATIC", name: "Polygon", id: "matic-network" },
  { symbol: "LTC", name: "Litecoin", id: "litecoin" },
  { symbol: "SHIB", name: "Shiba Inu", id: "shiba-inu" },
  { symbol: "AVAX", name: "Avalanche", id: "avalanche-2" },
  { symbol: "XLM", name: "Stellar", id: "stellar" },
  { symbol: "ATOM", name: "Cosmos", id: "cosmos" },
  { symbol: "UNI", name: "Uniswap", id: "uniswap" },
  { symbol: "ETC", name: "Ethereum Classic", id: "ethereum-classic" },
  { symbol: "BCH", name: "Bitcoin Cash", id: "bitcoin-cash" },
  { symbol: "NEAR", name: "NEAR Protocol", id: "near" },
  { symbol: "APT", name: "Aptos", id: "aptos" },
  { symbol: "ARB", name: "Arbitrum", id: "arbitrum" },
  { symbol: "OP", name: "Optimism", id: "optimism" },
  { symbol: "FIL", name: "Filecoin", id: "filecoin" },
  { symbol: "HBAR", name: "Hedera", id: "hedera-hashgraph" },
  { symbol: "VET", name: "VeChain", id: "vechain" },
  { symbol: "ICP", name: "Internet Computer", id: "internet-computer" },
  { symbol: "SAND", name: "The Sandbox", id: "the-sandbox" },
];

export function searchCryptoCatalog(query: string, limit = 8): CryptoCatalogEntry[] {
  const q = query.trim().toUpperCase();
  if (q.length === 0) return CRYPTO_CATALOG.slice(0, limit);
  return CRYPTO_CATALOG.filter(
    (c) => c.symbol.includes(q) || c.name.toUpperCase().includes(q),
  ).slice(0, limit);
}
