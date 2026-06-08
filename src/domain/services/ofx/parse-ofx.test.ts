import { describe, expect, it } from "vitest";

import { parseOfx } from "./parse-ofx";
import { isOk, isErr } from "@/shared/errors/result";

const SGML = `OFXHEADER:100
DATA:OFXSGML
<OFX>
<BANKMSGSRSV1><STMTTRNRS><STMTRS>
<CURDEF>BRL
<BANKACCTFROM><BANKID>341<ACCTID>12345-6</BANKACCTFROM>
<BANKTRANLIST>
<STMTTRN><TRNTYPE>CREDIT<DTPOSTED>20260105<TRNAMT>5000.00<FITID>A1<MEMO>SALARIO</STMTTRN>
<STMTTRN><TRNTYPE>DEBIT<DTPOSTED>20260110<TRNAMT>-340.00<FITID>B2<MEMO>PARCELA 3/12 LOJA</STMTTRN>
</BANKTRANLIST>
<LEDGERBAL><BALAMT>4660.00<DTASOF>20260131</LEDGERBAL>
</STMTRS></STMTTRNRS></BANKMSGSRSV1>
</OFX>`;

describe("parseOfx", () => {
  it("parses an SGML 1.x bank statement", () => {
    const r = parseOfx(SGML);
    expect(isOk(r)).toBe(true);
    if (!isOk(r)) return;
    const st = r.value;
    expect(st.accountKey).toBe("341:12345-6");
    expect(st.currency).toBe("BRL");
    expect(st.ledgerBalanceCents).toBe(466000n);
    expect(st.asOf?.toISOString().slice(0, 10)).toBe("2026-01-31");
    expect(st.transactions).toHaveLength(2);
    const [txn0, txn1] = st.transactions;
    expect(txn0).toMatchObject({
      fitId: "A1",
      direction: "in",
      amountCents: 500000n,
      memo: "SALARIO",
    });
    expect(txn0?.postedAt.toISOString().slice(0, 10)).toBe("2026-01-05");
    expect(txn1).toMatchObject({
      fitId: "B2",
      direction: "out",
      amountCents: 34000n,
      memo: "PARCELA 3/12 LOJA",
    });
  });

  it("parses an OFX 2.x XML statement with closed tags", () => {
    const XML = `<?xml version="1.0"?><OFX><BANKMSGSRSV1><STMTTRNRS><STMTRS>
<CURDEF>BRL</CURDEF>
<BANKACCTFROM><BANKID>237</BANKID><ACCTID>99</ACCTID></BANKACCTFROM>
<BANKTRANLIST>
<STMTTRN><TRNTYPE>DEBIT</TRNTYPE><DTPOSTED>20260201</DTPOSTED><TRNAMT>-12.50</TRNAMT><FITID>X9</FITID><MEMO>CAFE</MEMO></STMTTRN>
</BANKTRANLIST>
<LEDGERBAL><BALAMT>100.00</BALAMT></LEDGERBAL>
</STMTRS></STMTTRNRS></BANKMSGSRSV1></OFX>`;
    const r = parseOfx(XML);
    expect(isOk(r)).toBe(true);
    if (!isOk(r)) return;
    expect(r.value.accountKey).toBe("237:99");
    expect(r.value.transactions[0]).toMatchObject({ fitId: "X9", direction: "out", amountCents: 1250n });
  });

  it("returns err on empty input", () => {
    expect(isErr(parseOfx(""))).toBe(true);
  });
});
