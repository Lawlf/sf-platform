import type { MetadataRoute } from "next";

import { competitorSlugs } from "./(public)/alternativas/_lib/competitors";
import { publicCalculatorSlugs } from "./(public)/calculadora/_lib/public-calculators";

const siteUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://www.saborfinanceiro.com.br";

// Add new public routes here when launched (blog posts, course pages, calculators).
// For dynamic content (e.g., blog), fetch slugs from DB/CMS and map them inside `sitemap()`.
const staticRoutes = [
  { path: "/", changeFrequency: "weekly", priority: 1.0 },
  { path: "/precos", changeFrequency: "monthly", priority: 0.9 },
  { path: "/calculadora", changeFrequency: "monthly", priority: 0.8 },
  { path: "/entrar", changeFrequency: "yearly", priority: 0.3 },
] as const;

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();
  const staticEntries: MetadataRoute.Sitemap = staticRoutes.map(
    ({ path, changeFrequency, priority }) => ({
      url: `${siteUrl}${path === "/" ? "" : path}`,
      lastModified,
      changeFrequency,
      priority,
    }),
  );
  const calculatorEntries: MetadataRoute.Sitemap = publicCalculatorSlugs().map((slug) => ({
    url: `${siteUrl}/calculadora/${slug}`,
    lastModified,
    changeFrequency: "monthly",
    priority: 0.8,
  }));
  const alternativeEntries: MetadataRoute.Sitemap = competitorSlugs().map((slug) => ({
    url: `${siteUrl}/alternativas/${slug}`,
    lastModified,
    changeFrequency: "monthly",
    priority: 0.7,
  }));
  return [...staticEntries, ...calculatorEntries, ...alternativeEntries];
}
