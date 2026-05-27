import { describe, expect, it } from "vitest";

import { parseModuleDoc } from "./module-doc";

const VALID = `---
num: 1
title: "Quanto você realmente paga"
subtitle: "CET ponderado"
depth: medium
cta:
  label: "Cadastrar minhas dívidas"
  href: "/app/dividas"
quiz:
  - prompt: "O que diz o custo real de um crédito?"
    options:
      - { label: "A parcela", correct: false, feedback: "A parcela esconde o custo." }
      - { label: "O CET", correct: true, feedback: "CET junta juros e tarifas." }
    contextual: false
---

## Seção
Corpo de leitura.
`;

describe("parseModuleDoc", () => {
  it("parseia frontmatter e corpo de um módulo válido", () => {
    const r = parseModuleDoc(VALID);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.doc.frontmatter.num).toBe(1);
    expect(r.doc.frontmatter.depth).toBe("medium");
    expect(r.doc.frontmatter.cta.href).toBe("/app/dividas");
    expect(r.doc.frontmatter.quiz?.[0]?.options[1]?.correct).toBe(true);
    expect(r.doc.body).toContain("## Seção");
  });

  it("rejeita depth inválido", () => {
    const bad = VALID.replace("depth: medium", "depth: epic");
    expect(parseModuleDoc(bad).ok).toBe(false);
  });

  it("rejeita frontmatter sem título", () => {
    const bad = VALID.replace('title: "Quanto você realmente paga"', "");
    expect(parseModuleDoc(bad).ok).toBe(false);
  });

  it("aceita módulo sem quiz e sem audio", () => {
    const minimal = `---
num: 2
title: "T"
subtitle: "S"
depth: short
cta:
  label: "Ver"
  href: "/app/patrimonio"
---
Corpo.
`;
    const r = parseModuleDoc(minimal);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.doc.frontmatter.quiz).toBeUndefined();
  });
});
