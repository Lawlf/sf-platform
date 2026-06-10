import { describe, expect, it } from "vitest";

import { valueCryptoCents } from "./crypto-valuation.service";

describe("valueCryptoCents", () => {
  it("não trunca quantidade fracionária (o bug que a conta de ações tem)", () => {
    // 0,2 BTC a R$ 350.000,00 (35_000_000 centavos por moeda) = R$ 70.000,00.
    expect(valueCryptoCents(0.2, 35_000_000n)).toBe(7_000_000n);
  });

  it("calcula quantidade inteira", () => {
    expect(valueCryptoCents(3, 1_000_00n)).toBe(3_000_00n);
  });

  it("lida com quantidade grande sem estourar", () => {
    expect(valueCryptoCents(1000, 35_000_000n)).toBe(35_000_000_000n);
  });

  it("retorna 0 para quantidade não positiva ou preço não positivo", () => {
    expect(valueCryptoCents(0, 35_000_000n)).toBe(0n);
    expect(valueCryptoCents(-1, 35_000_000n)).toBe(0n);
    expect(valueCryptoCents(0.2, 0n)).toBe(0n);
  });

  it("arredonda para o centavo mais próximo", () => {
    // 0,333333 * 100 centavos = 33,3333 → 33 centavos.
    expect(valueCryptoCents(0.333333, 100n)).toBe(33n);
  });
});
