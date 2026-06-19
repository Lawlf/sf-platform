import { describe, expect, it } from "vitest";

import { Money } from "@/domain/value-objects/money.vo";
import { isOk } from "@/shared/errors/result";

import { buildOfxPreview } from "./build-ofx-preview.use-case";

const SGML = `OFXHEADER:100
<OFX><BANKMSGSRSV1><STMTTRNRS><STMTRS><CURDEF>BRL
<BANKACCTFROM><BANKID>341<ACCTID>1</BANKACCTFROM>
<STMTTRN><TRNTYPE>CREDIT<DTPOSTED>20260105<TRNAMT>5000.00<FITID>A1<MEMO>SALARIO</STMTTRN>
<STMTTRN><TRNTYPE>CREDIT<DTPOSTED>20260205<TRNAMT>5000.00<FITID>A2<MEMO>SALARIO</STMTTRN>
<LEDGERBAL><BALAMT>10000.00</LEDGERBAL>
</STMTRS></STMTTRNRS></BANKMSGSRSV1></OFX>`;

const SGML_RDB = `OFXHEADER:100
<OFX><BANKMSGSRSV1><STMTTRNRS><STMTRS><CURDEF>BRL
<BANKACCTFROM><BANKID>260<ACCTID>9</BANKACCTFROM>
<STMTTRN><TRNTYPE>CREDIT<DTPOSTED>20260105<TRNAMT>1000.00<FITID>P1<MEMO>Transferência recebida pelo Pix</STMTTRN>
<STMTTRN><TRNTYPE>DEBIT<DTPOSTED>20260105<TRNAMT>-1000.00<FITID>R1<MEMO>Aplicação RDB</STMTTRN>
<LEDGERBAL><BALAMT>0.00</LEDGERBAL>
</STMTRS></STMTTRNRS></BANKMSGSRSV1></OFX>`;

function makeDeps(opts?: { existingKey?: boolean; seenFitIds?: string[]; reserveValueCents?: bigint }) {
  return {
    assets: {
      findByExternalAccountKey: async (_profileId: string, key: string) => {
        if (key.endsWith(":reserve")) {
          return opts?.reserveValueCents != null
            ? ({ id: "reserve-1", currentValue: Money.fromCents(opts.reserveValueCents) } as never)
            : null;
        }
        return opts?.existingKey ? ({ id: "asset-1", label: "Conta 341" } as never) : null;
      },
    },
    transactions: {
      existingExternalIds: async () => opts?.seenFitIds ?? [],
    },
  };
}

describe("buildOfxPreview", () => {
  it("returns a macro preview with no persistence, marking new vs existing account", async () => {
    const r = await buildOfxPreview(makeDeps(), { userId: "u1", profileId: "profile-1", contents: [SGML] });
    expect(isOk(r)).toBe(true);
    if (!isOk(r)) return;
    const p = r.value;
    expect(p.accountKey).toBe("341:1");
    expect(p.ledgerBalanceCents).toBe(1000000n);
    expect(p.matchedAssetId).toBeNull();
    expect(p.newTransactionCount).toBe(2);
    expect(p.duplicateCount).toBe(0);
    expect(p.suggestions.incomes).toHaveLength(1);
  });

  it("flags duplicates and matched account on re-import", async () => {
    const r = await buildOfxPreview(makeDeps({ existingKey: true, seenFitIds: ["A1"] }), {
      userId: "u1",
      profileId: "profile-1",
      contents: [SGML],
    });
    expect(isOk(r)).toBe(true);
    if (!isOk(r)) return;
    expect(r.value.matchedAssetId).toBe("asset-1");
    expect(r.value.newTransactionCount).toBe(1);
    expect(r.value.duplicateCount).toBe(1);
  });

  it("excludes reserve transfers (RDB) from the net movement", async () => {
    const r = await buildOfxPreview(makeDeps(), { userId: "u1", profileId: "profile-1", contents: [SGML_RDB] });
    expect(isOk(r)).toBe(true);
    if (!isOk(r)) return;
    expect(r.value.netCents).toBe(100000n);
    expect(r.value.suggestions.incomes).toHaveLength(0);
  });

  it("reports reserve delta from RDB flows and null when no reserve asset exists", async () => {
    const r = await buildOfxPreview(makeDeps(), { userId: "u1", profileId: "profile-1", contents: [SGML_RDB] });
    expect(isOk(r)).toBe(true);
    if (!isOk(r)) return;
    expect(r.value.reserve).not.toBeNull();
    expect(r.value.reserve?.guardouCents).toBe(100000n);
    expect(r.value.reserve?.tirouCents).toBe(0n);
    expect(r.value.reserve?.existingValueCents).toBeNull();
  });

  it("reports the existing reserve asset value when one is connected", async () => {
    const r = await buildOfxPreview(makeDeps({ reserveValueCents: 500000n }), {
      userId: "u1",
      profileId: "profile-1",
      contents: [SGML_RDB],
    });
    expect(isOk(r)).toBe(true);
    if (!isOk(r)) return;
    expect(r.value.reserve?.existingValueCents).toBe(500000n);
  });

  it("has a null reserve block when no RDB flows are present", async () => {
    const r = await buildOfxPreview(makeDeps(), { userId: "u1", profileId: "profile-1", contents: [SGML] });
    expect(isOk(r)).toBe(true);
    if (!isOk(r)) return;
    expect(r.value.reserve).toBeNull();
  });

  it("consolidates two same-account statements into one preview", async () => {
    const jan = `OFXHEADER:100
<OFX><BANKMSGSRSV1><STMTTRNRS><STMTRS><CURDEF>BRL
<BANKACCTFROM><BANKID>341<ACCTID>1</BANKACCTFROM>
<STMTTRN><TRNTYPE>CREDIT<DTPOSTED>20260105<TRNAMT>5000.00<FITID>A1<MEMO>SALARIO</STMTTRN>
<LEDGERBAL><BALAMT>5000.00<DTASOF>20260131</LEDGERBAL>
</STMTRS></STMTTRNRS></BANKMSGSRSV1></OFX>`;
    const feb = `OFXHEADER:100
<OFX><BANKMSGSRSV1><STMTTRNRS><STMTRS><CURDEF>BRL
<BANKACCTFROM><BANKID>341<ACCTID>1</BANKACCTFROM>
<STMTTRN><TRNTYPE>CREDIT<DTPOSTED>20260205<TRNAMT>5000.00<FITID>A2<MEMO>SALARIO</STMTTRN>
<LEDGERBAL><BALAMT>10000.00<DTASOF>20260228</LEDGERBAL>
</STMTRS></STMTTRNRS></BANKMSGSRSV1></OFX>`;
    const r = await buildOfxPreview(makeDeps(), { userId: "u1", profileId: "profile-1", contents: [jan, feb] });
    expect(isOk(r)).toBe(true);
    if (!isOk(r)) return;
    expect(r.value.newTransactionCount).toBe(2);
    expect(r.value.ledgerBalanceCents).toBe(1000000n);
    expect(r.value.suggestions.incomes).toHaveLength(1);
  });
});
