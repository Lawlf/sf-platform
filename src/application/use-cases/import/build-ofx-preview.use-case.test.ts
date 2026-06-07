import { describe, expect, it } from "vitest";

import { isOk } from "@/shared/errors/result";

import { buildOfxPreview } from "./build-ofx-preview.use-case";

const SGML = `OFXHEADER:100
<OFX><BANKMSGSRSV1><STMTTRNRS><STMTRS><CURDEF>BRL
<BANKACCTFROM><BANKID>341<ACCTID>1</BANKACCTFROM>
<STMTTRN><TRNTYPE>CREDIT<DTPOSTED>20260105<TRNAMT>5000.00<FITID>A1<MEMO>SALARIO</STMTTRN>
<STMTTRN><TRNTYPE>CREDIT<DTPOSTED>20260205<TRNAMT>5000.00<FITID>A2<MEMO>SALARIO</STMTTRN>
<LEDGERBAL><BALAMT>10000.00</LEDGERBAL>
</STMTRS></STMTTRNRS></BANKMSGSRSV1></OFX>`;

function makeDeps(opts?: { existingKey?: boolean; seenFitIds?: string[] }) {
  return {
    assets: {
      findByExternalAccountKey: async () =>
        opts?.existingKey ? ({ id: "asset-1", label: "Conta 341" } as never) : null,
    },
    transactions: {
      existingExternalIds: async () => opts?.seenFitIds ?? [],
    },
  };
}

describe("buildOfxPreview", () => {
  it("returns a macro preview with no persistence, marking new vs existing account", async () => {
    const r = await buildOfxPreview(makeDeps(), { userId: "u1", content: SGML });
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
      content: SGML,
    });
    expect(isOk(r)).toBe(true);
    if (!isOk(r)) return;
    expect(r.value.matchedAssetId).toBe("asset-1");
    expect(r.value.newTransactionCount).toBe(1);
    expect(r.value.duplicateCount).toBe(1);
  });
});
