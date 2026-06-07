import { describe, expect, it, vi } from "vitest";

import { commitOfxImport } from "./commit-ofx-import.use-case";
import { isErr, isOk } from "@/shared/errors/result";

const SGML = `<OFX><BANKMSGSRSV1><STMTTRNRS><STMTRS><CURDEF>BRL
<BANKACCTFROM><BANKID>341<ACCTID>1</BANKACCTFROM>
<STMTTRN><TRNTYPE>CREDIT<DTPOSTED>20260105<TRNAMT>5000.00<FITID>A1<MEMO>SALARIO</STMTTRN>
<STMTTRN><TRNTYPE>DEBIT<DTPOSTED>20260110<TRNAMT>-340.00<FITID>B2<MEMO>PARCELA 3/12 LOJA</STMTTRN>
<LEDGERBAL><BALAMT>4660.00</LEDGERBAL>
</STMTRS></STMTTRNRS></BANKMSGSRSV1></OFX>`;

function makeDeps() {
  return {
    assets: {
      findByExternalAccountKey: vi.fn(async () => null),
      create: vi.fn(async () => undefined),
      update: vi.fn(async () => undefined),
      listExternalAccountKeys: vi.fn(async (): Promise<string[]> => []),
    },
    transactions: {
      existingExternalIds: vi.fn(async (): Promise<string[]> => []),
      create: vi.fn(async (t: never) => t),
    },
    incomes: { create: vi.fn(async (i: never) => i) },
    debts: { create: vi.fn(async (d: never) => d) },
    clock: { now: () => new Date(Date.UTC(2026, 1, 1)) },
  };
}

describe("commitOfxImport", () => {
  it("writes only what the curated payload accepts", async () => {
    const deps = makeDeps();
    const r = await commitOfxImport(deps as never, {
      userId: "u1",
      content: SGML,
      acceptedIncomeFitIds: ["A1"],
      acceptedDebtFitIds: ["B2"],
      isPro: true,
    });
    expect(isOk(r)).toBe(true);
    expect((deps.assets.create as ReturnType<typeof vi.fn>).mock.calls.length).toBe(1);
    expect((deps.transactions.create as ReturnType<typeof vi.fn>).mock.calls.length).toBe(2);
    expect((deps.incomes.create as ReturnType<typeof vi.fn>).mock.calls.length).toBe(1);
    expect((deps.debts.create as ReturnType<typeof vi.fn>).mock.calls.length).toBe(1);
  });

  it("creates no income/debt when nothing accepted, still imports transactions", async () => {
    const deps = makeDeps();
    await commitOfxImport(deps as never, {
      userId: "u1",
      content: SGML,
      acceptedIncomeFitIds: [],
      acceptedDebtFitIds: [],
      isPro: true,
    });
    expect((deps.incomes.create as ReturnType<typeof vi.fn>).mock.calls.length).toBe(0);
    expect((deps.debts.create as ReturnType<typeof vi.fn>).mock.calls.length).toBe(0);
    expect((deps.transactions.create as ReturnType<typeof vi.fn>).mock.calls.length).toBe(2);
  });

  it("skips duplicate FITIDs already stored", async () => {
    const deps = makeDeps();
    deps.transactions.existingExternalIds = vi.fn(async () => ["A1"]);
    await commitOfxImport(deps as never, {
      userId: "u1",
      content: SGML,
      acceptedIncomeFitIds: [],
      acceptedDebtFitIds: [],
      isPro: true,
    });
    expect((deps.transactions.create as ReturnType<typeof vi.fn>).mock.calls.length).toBe(1);
  });

  it("Free user can import their first connected account", async () => {
    const deps = makeDeps();
    deps.assets.listExternalAccountKeys = vi.fn(async () => []);
    const r = await commitOfxImport(deps as never, {
      userId: "u1",
      content: SGML,
      acceptedIncomeFitIds: [],
      acceptedDebtFitIds: [],
      isPro: false,
    });
    expect(isOk(r)).toBe(true);
    expect((deps.assets.create as ReturnType<typeof vi.fn>).mock.calls.length).toBe(1);
  });

  it("Free user can re-import the same connected account", async () => {
    const deps = makeDeps();
    deps.assets.listExternalAccountKeys = vi.fn(async () => ["341:1"]);
    const r = await commitOfxImport(deps as never, {
      userId: "u1",
      content: SGML,
      acceptedIncomeFitIds: [],
      acceptedDebtFitIds: [],
      isPro: false,
    });
    expect(isOk(r)).toBe(true);
  });

  it("Free user is blocked from a 2nd distinct account", async () => {
    const deps = makeDeps();
    deps.assets.listExternalAccountKeys = vi.fn(async () => ["999:9"]);
    const r = await commitOfxImport(deps as never, {
      userId: "u1",
      content: SGML,
      acceptedIncomeFitIds: [],
      acceptedDebtFitIds: [],
      isPro: false,
    });
    expect(isErr(r)).toBe(true);
    if (isErr(r)) expect(r.error).toEqual({ kind: "account_limit" });
    expect((deps.assets.create as ReturnType<typeof vi.fn>).mock.calls.length).toBe(0);
    expect((deps.transactions.create as ReturnType<typeof vi.fn>).mock.calls.length).toBe(0);
    expect((deps.incomes.create as ReturnType<typeof vi.fn>).mock.calls.length).toBe(0);
    expect((deps.debts.create as ReturnType<typeof vi.fn>).mock.calls.length).toBe(0);
  });

  it("Pro user can add any account", async () => {
    const deps = makeDeps();
    deps.assets.listExternalAccountKeys = vi.fn(async () => ["999:9"]);
    const r = await commitOfxImport(deps as never, {
      userId: "u1",
      content: SGML,
      acceptedIncomeFitIds: [],
      acceptedDebtFitIds: [],
      isPro: true,
    });
    expect(isOk(r)).toBe(true);
  });
});
