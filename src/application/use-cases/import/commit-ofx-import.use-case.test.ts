import { describe, expect, it, vi } from "vitest";

import { isErr, isOk } from "@/shared/errors/result";

import { commitOfxImport } from "./commit-ofx-import.use-case";

const SGML = `<OFX><BANKMSGSRSV1><STMTTRNRS><STMTRS><CURDEF>BRL
<BANKACCTFROM><BANKID>341<ACCTID>1</BANKACCTFROM>
<STMTTRN><TRNTYPE>CREDIT<DTPOSTED>20260105<TRNAMT>5000.00<FITID>A1<MEMO>SALARIO</STMTTRN>
<STMTTRN><TRNTYPE>DEBIT<DTPOSTED>20260110<TRNAMT>-340.00<FITID>B2<MEMO>PARCELA 3/12 LOJA</STMTTRN>
<LEDGERBAL><BALAMT>4660.00</LEDGERBAL>
</STMTRS></STMTTRNRS></BANKMSGSRSV1></OFX>`;

const SGML_RDB = `<OFX><BANKMSGSRSV1><STMTTRNRS><STMTRS><CURDEF>BRL
<BANKACCTFROM><BANKID>260<ACCTID>9</BANKACCTFROM>
<STMTTRN><TRNTYPE>DEBIT<DTPOSTED>20260105<TRNAMT>-300.00<FITID>A9<MEMO>Aplicação RDB</STMTTRN>
<LEDGERBAL><BALAMT>30.00</LEDGERBAL>
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
      contents: [SGML],
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
      contents: [SGML],
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
      contents: [SGML],
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
      contents: [SGML],
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
      contents: [SGML],
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
      contents: [SGML],
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

  it("returns the statement ledger balance and counts in the result", async () => {
    const deps = makeDeps();
    const r = await commitOfxImport(deps as never, {
      userId: "u1",
      contents: [SGML],
      acceptedIncomeFitIds: ["A1"],
      acceptedDebtFitIds: ["B2"],
      isPro: true,
    });
    expect(isOk(r)).toBe(true);
    if (!isOk(r)) return;
    expect(r.value.ledgerBalanceCents).toBe(466000n);
    expect(r.value.importedTransactions).toBe(2);
    expect(r.value.createdIncomes).toBe(1);
    expect(r.value.createdDebts).toBe(1);
    expect(typeof r.value.assetId).toBe("string");
  });

  it("Pro user can add any account", async () => {
    const deps = makeDeps();
    deps.assets.listExternalAccountKeys = vi.fn(async () => ["999:9"]);
    const r = await commitOfxImport(deps as never, {
      userId: "u1",
      contents: [SGML],
      acceptedIncomeFitIds: [],
      acceptedDebtFitIds: [],
      isPro: true,
    });
    expect(isOk(r)).toBe(true);
  });

  it("creates a reserve cash asset when the user saves a reserve total", async () => {
    const deps = makeDeps();
    const r = await commitOfxImport(deps as never, {
      userId: "u1",
      contents: [SGML_RDB],
      acceptedIncomeFitIds: [],
      acceptedDebtFitIds: [],
      isPro: true,
      reserveTotalCents: 500000n,
    });
    expect(isOk(r)).toBe(true);
    const reserveCreate = (deps.assets.create as ReturnType<typeof vi.fn>).mock.calls.find(
      (call) => (call[0] as { externalAccountKey: string }).externalAccountKey === "260:9:reserve",
    );
    expect(reserveCreate).toBeDefined();
    expect(reserveCreate?.[0]).toMatchObject({ category: "cash" });
    expect((reserveCreate?.[0] as { currentValue: { toCents(): bigint } }).currentValue.toCents()).toBe(500000n);
    if (isOk(r)) expect(r.value.reserveValueCents).toBe(500000n);
  });

  it("does not touch reserve when no reserve total is provided", async () => {
    const deps = makeDeps();
    const r = await commitOfxImport(deps as never, {
      userId: "u1",
      contents: [SGML_RDB],
      acceptedIncomeFitIds: [],
      acceptedDebtFitIds: [],
      isPro: true,
    });
    expect(isOk(r)).toBe(true);
    const reserveCreate = (deps.assets.create as ReturnType<typeof vi.fn>).mock.calls.find(
      (call) => (call[0] as { externalAccountKey: string }).externalAccountKey === "260:9:reserve",
    );
    expect(reserveCreate).toBeUndefined();
    if (isOk(r)) expect(r.value.reserveValueCents).toBeNull();
  });

  it("marks a promoted debit with category promoted_debt", async () => {
    const deps = makeDeps();
    await commitOfxImport(deps as never, {
      userId: "u1",
      contents: [SGML],
      acceptedIncomeFitIds: [],
      acceptedDebtFitIds: ["B2"],
      isPro: true,
    });
    const createCalls = (deps.transactions.create as ReturnType<typeof vi.fn>).mock.calls;
    const b2 = createCalls.find((call) => (call[0] as { externalId: string }).externalId === "B2");
    expect((b2?.[0] as { category: string | null }).category).toBe("promoted_debt");
  });

  it("marks a self-canceling internal pair with category internal_transfer", async () => {
    const INTERNAL = `<OFX><BANKMSGSRSV1><STMTTRNRS><STMTRS><CURDEF>BRL
<BANKACCTFROM><BANKID>260<ACCTID>9</BANKACCTFROM>
<STMTTRN><TRNTYPE>CREDIT<DTPOSTED>20260601<TRNAMT>1319.15<FITID>I1<MEMO>Resgate RDB</STMTTRN>
<STMTTRN><TRNTYPE>DEBIT<DTPOSTED>20260601<TRNAMT>-1319.15<FITID>I2<MEMO>Resgate de empréstimo</STMTTRN>
<LEDGERBAL><BALAMT>0.00</LEDGERBAL>
</STMTRS></STMTTRNRS></BANKMSGSRSV1></OFX>`;
    const deps = makeDeps();
    await commitOfxImport(deps as never, {
      userId: "u1",
      contents: [INTERNAL],
      acceptedIncomeFitIds: [],
      acceptedDebtFitIds: [],
      isPro: true,
    });
    const createCalls = (deps.transactions.create as ReturnType<typeof vi.fn>).mock.calls;
    const i2 = createCalls.find((call) => (call[0] as { externalId: string }).externalId === "I2");
    expect((i2?.[0] as { category: string | null }).category).toBe("internal_transfer");
  });

  it("does not count a reserve key as a connected account for the Free limit", async () => {
    const deps = makeDeps();
    deps.assets.listExternalAccountKeys = vi.fn(async () => ["341:1:reserve"]);
    const r = await commitOfxImport(deps as never, {
      userId: "u1",
      contents: [SGML],
      acceptedIncomeFitIds: [],
      acceptedDebtFitIds: [],
      isPro: false,
    });
    expect(isOk(r)).toBe(true);
  });

  it("rejects a batch mixing two different accounts", async () => {
    const other = `<OFX><BANKMSGSRSV1><STMTTRNRS><STMTRS><CURDEF>BRL
<BANKACCTFROM><BANKID>999<ACCTID>9</BANKACCTFROM>
<STMTTRN><TRNTYPE>CREDIT<DTPOSTED>20260105<TRNAMT>10.00<FITID>Z1<MEMO>X</STMTTRN>
<LEDGERBAL><BALAMT>10.00</LEDGERBAL>
</STMTRS></STMTTRNRS></BANKMSGSRSV1></OFX>`;
    const deps = makeDeps();
    const r = await commitOfxImport(deps as never, {
      userId: "u1",
      contents: [SGML, other],
      acceptedIncomeFitIds: [],
      acceptedDebtFitIds: [],
      isPro: true,
    });
    expect(isErr(r)).toBe(true);
    if (isErr(r)) expect(r.error.kind).toBe("mixed_accounts");
  });
});
