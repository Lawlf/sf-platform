import type { MetadataRoute } from "next";

const siteUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://www.saborfinanceiro.com.br";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/precos", "/entrar", "/cadastrar", "/calculadora/", "/copa", "/copa/", "/alternativas/", "/financas-com-ia", "/por-que-existe", "/ajuda"],
        disallow: ["/app/", "/admin/", "/api/", "/verificar"],
      },
    ],
    sitemap: `${siteUrl}/sitemap.xml`,
    host: siteUrl,
  };
}
