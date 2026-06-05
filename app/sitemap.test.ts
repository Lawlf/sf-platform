import { describe, expect, it } from "vitest";

import sitemap from "./sitemap";

describe("sitemap", () => {
  it("inclui as calculadoras públicas", () => {
    const urls = sitemap().map((entry) => entry.url);
    expect(urls.some((u) => u.endsWith("/calculadora/salario-liquido-clt"))).toBe(true);
  });

  it("mantém a home", () => {
    const urls = sitemap().map((entry) => entry.url);
    expect(urls.some((u) => u === "https://www.saborfinanceiro.com.br" || u.endsWith(".com.br"))).toBe(
      true,
    );
  });

  it("inclui as paginas de alternativa", () => {
    const urls = sitemap().map((entry) => entry.url);
    expect(urls.some((u) => u.endsWith("/alternativas/mobills"))).toBe(true);
  });
});
