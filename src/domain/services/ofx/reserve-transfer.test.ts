import { describe, expect, it } from "vitest";

import { isReserveTransfer } from "./reserve-transfer";

describe("isReserveTransfer", () => {
  it("matches Nubank RDB application and redemption memos", () => {
    expect(isReserveTransfer("Aplicação RDB")).toBe(true);
    expect(isReserveTransfer("Resgate RDB")).toBe(true);
  });

  it("matches caixinha wording regardless of case", () => {
    expect(isReserveTransfer("Guardado na caixinha Viagem")).toBe(true);
    expect(isReserveTransfer("CAIXINHA EMERGENCIA")).toBe(true);
  });

  it("does not match real flows", () => {
    expect(isReserveTransfer("SALARIO ACME")).toBe(false);
    expect(isReserveTransfer("Transferência recebida pelo Pix")).toBe(false);
    expect(isReserveTransfer("PARCELA 3/12 LOJA")).toBe(false);
  });
});
