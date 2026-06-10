import { seedStockCatalog } from "@/application/use-cases/stocks/seed-stock-catalog.use-case";
import { clock, repos } from "@/infrastructure/container";
import { BrapiQuoteAdapter } from "@/infrastructure/external/brapi/brapi-quote.adapter";

async function main() {
  const maxPages = Number(process.argv[2] ?? 10);
  const pageSize = Number(process.argv[3] ?? 500);
  console.log(`Seeding stock_catalog: maxPages=${maxPages} pageSize=${pageSize}`);

  const result = await seedStockCatalog(
    {
      catalog: repos.stockCatalog,
      quotes: new BrapiQuoteAdapter(),
      clock,
    },
    { maxPages, pageSize },
  );

  console.log("Done:", result);
  process.exit(0);
}

main().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
