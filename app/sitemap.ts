import type { MetadataRoute } from "next";

const siteUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://saborfinanceiro.com.br";

// Add new public routes here when launched (blog posts, course pages, calculators).
// For dynamic content (e.g., blog), fetch slugs from DB/CMS and map them inside `sitemap()`.
const staticRoutes = [
  { path: "/", changeFrequency: "weekly", priority: 1.0 },
  { path: "/precos", changeFrequency: "monthly", priority: 0.9 },
  { path: "/entrar", changeFrequency: "yearly", priority: 0.3 },
] as const;

export default function sitemap(): MetadataRoute.Sitemap {
  return staticRoutes.map(({ path, changeFrequency, priority }) => ({
    url: `${siteUrl}${path === "/" ? "" : path}`,
    lastModified: new Date(),
    changeFrequency,
    priority,
  }));
}
