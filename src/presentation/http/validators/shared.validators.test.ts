import { describe, expect, it } from "vitest";

import {
  bigintFromString,
  currencyEnum,
  nonNegativeBigint,
  nullableDate,
  positiveBigint,
} from "./shared.validators";

describe("bigintFromString", () => {
  it("converte string numérica em bigint", () => {
    expect(bigintFromString.parse("12345")).toBe(12345n);
  });

  it("rejeita vazio com mensagem de campo obrigatório", () => {
    const r = bigintFromString.safeParse("");
    expect(r.success).toBe(false);
    if (!r.success) expect(r.error.issues[0]?.message).toBe("Campo obrigatório.");
  });

  it("rejeita não numérico com mensagem de número inválido", () => {
    const r = bigintFromString.safeParse("abc");
    expect(r.success).toBe(false);
    if (!r.success) expect(r.error.issues[0]?.message).toBe("Número inválido.");
  });
});

describe("positiveBigint", () => {
  it("aceita positivo", () => {
    expect(positiveBigint.parse("1")).toBe(1n);
  });

  it("rejeita zero", () => {
    const r = positiveBigint.safeParse("0");
    expect(r.success).toBe(false);
    if (!r.success) expect(r.error.issues[0]?.message).toBe("Deve ser positivo.");
  });
});

describe("nonNegativeBigint", () => {
  it("aceita zero", () => {
    expect(nonNegativeBigint.parse("0")).toBe(0n);
  });

  it("rejeita negativo", () => {
    const r = nonNegativeBigint.safeParse("-1");
    expect(r.success).toBe(false);
    if (!r.success) expect(r.error.issues[0]?.message).toBe("Não pode ser negativo.");
  });
});

describe("currencyEnum", () => {
  it("aceita BRL e default BRL", () => {
    expect(currencyEnum.parse("BRL")).toBe("BRL");
    expect(currencyEnum.parse(undefined)).toBe("BRL");
  });

  it("rejeita moeda desconhecida", () => {
    expect(currencyEnum.safeParse("XYZ").success).toBe(false);
  });
});

describe("nullableDate", () => {
  it("string vazia vira null", () => {
    expect(nullableDate.parse("")).toBeNull();
  });

  it("undefined vira null por default", () => {
    expect(nullableDate.parse(undefined)).toBeNull();
  });

  it("data válida é coercida", () => {
    expect(nullableDate.parse("2026-01-15")).toEqual(new Date("2026-01-15"));
  });
});
