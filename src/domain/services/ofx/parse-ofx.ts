import { err, ok, type Result } from "@/shared/errors/result";

import type { OfxParseError, OfxStatement, OfxTxn } from "./ofx-types";

function tag(block: string, name: string): string | null {
  const re = new RegExp(`<${name}>([^<\\r\\n]*)`, "i");
  const m = block.match(re);
  const captured = m?.[1];
  return captured != null ? captured.trim() : null;
}

function parseOfxDate(raw: string): Date {
  const y = Number(raw.slice(0, 4));
  const mo = Number(raw.slice(4, 6));
  const d = Number(raw.slice(6, 8));
  return new Date(Date.UTC(y, mo - 1, d));
}

function toCents(raw: string): bigint {
  const neg = raw.trim().startsWith("-");
  const digits = raw.replace(/[^0-9.]/g, "");
  const [intPart, fracRaw = ""] = digits.split(".");
  const frac = (fracRaw + "00").slice(0, 2);
  const cents = BigInt(intPart || "0") * 100n + BigInt(frac || "0");
  return neg ? -cents : cents;
}

export function parseOfx(content: string): Result<OfxStatement, OfxParseError> {
  if (!content || !content.trim()) return err({ kind: "empty" });
  const body = content.replace(/\r/g, "");
  const acctBlock = body.match(/<BANKACCTFROM>([\s\S]*?)<\/BANKACCTFROM>/i)?.[1] ?? "";
  const bankId = tag(acctBlock, "BANKID") ?? "";
  const acctId = tag(acctBlock, "ACCTID") ?? "";
  if (!acctId) return err({ kind: "no_statement" });

  const currency = tag(body, "CURDEF") ?? "BRL";
  const balRaw = body.match(/<LEDGERBAL>([\s\S]*?)<\/LEDGERBAL>/i)?.[1] ?? "";
  const ledgerBalanceCents = toCents(tag(balRaw, "BALAMT") ?? "0");

  const txns: OfxTxn[] = [];
  const stmtRe = /<STMTTRN>([\s\S]*?)<\/STMTTRN>/gi;
  let m: RegExpExecArray | null;
  while ((m = stmtRe.exec(body)) !== null) {
    const block = m[1] ?? "";
    const type = (tag(block, "TRNTYPE") ?? "").toUpperCase();
    const amount = toCents(tag(block, "TRNAMT") ?? "0");
    const direction: "in" | "out" = type === "CREDIT" || amount > 0n ? "in" : "out";
    txns.push({
      fitId: tag(block, "FITID") ?? "",
      postedAt: parseOfxDate(tag(block, "DTPOSTED") ?? ""),
      amountCents: amount < 0n ? -amount : amount,
      direction,
      memo: tag(block, "MEMO") ?? tag(block, "NAME") ?? "",
    });
  }

  return ok({
    accountKey: `${bankId}:${acctId}`,
    currency,
    ledgerBalanceCents,
    transactions: txns,
  });
}
