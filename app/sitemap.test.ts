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

  it("inclui a pagina de financas com IA", () => {
    const urls = sitemap().map((entry) => entry.url);
    expect(urls.some((u) => u.endsWith("/financas-com-ia"))).toBe(true);
  });

  it("inclui a calculadora da Copa e o jogo ativo", () => {
    const urls = sitemap().map((entry) => entry.url);
    expect(urls.some((u) => u.endsWith("/copa"))).toBe(true);
    expect(urls.some((u) => u.endsWith("/copa/brasil-vs-noruega"))).toBe(true);
  });
});
