import type { OfxTxn } from "./ofx-types";
import { isReserveTransfer } from "./reserve-transfer";

const INTERNALISH = /\bRDB\b|caixinh|aplica|resgate|empr[eé]|rendiment|cofrinho|reserva/i;

export function isInternalish(memo: string): boolean {
  return INTERNALISH.test(memo);
}

export interface InternalMovement {
  pairedFitIds: Set<string>;
  reserveFitIds: Set<string>;
  internalFitIds: Set<string>;
}

function dayKey(d: Date): string {
  return `${d.getUTCFullYear()}-${d.getUTCMonth()}-${d.getUTCDate()}`;
}

/**
 * Identifica movimentos internos: transferências do próprio usuário entre
 * bolsos (reserva, empréstimo, caixinha) que não são gasto nem renda real.
 *
 * Um par se anula quando: mesmo dia, mesmo valor absoluto, direção oposta E
 * AMBAS as pernas têm memo de conta-própria. A regra "ambas internas" evita
 * apagar renda real (ex.: Pix de uma pessoa + aplicação na caixinha no mesmo
 * dia/valor: só uma perna é interna, então o Pix continua sendo renda).
 *
 * `reserveFitIds` segue dirigido só por RDB/caixinha (isReserveTransfer) e é
 * o que move o saldo da reserva, independente de pareamento.
 */
export function findInternalTransfers(txns: OfxTxn[]): InternalMovement {
  const pairedFitIds = new Set<string>();

  const buckets = new Map<string, { ins: OfxTxn[]; outs: OfxTxn[] }>();
  for (const t of txns) {
    const key = `${dayKey(t.postedAt)}|${t.amountCents}`;
    let b = buckets.get(key);
    if (!b) {
      b = { ins: [], outs: [] };
      buckets.set(key, b);
    }
    (t.direction === "in" ? b.ins : b.outs).push(t);
  }

  for (const { ins, outs } of buckets.values()) {
    const inInt = ins.filter((t) => isInternalish(t.memo));
    const outInt = outs.filter((t) => isInternalish(t.memo));
    const n = Math.min(inInt.length, outInt.length);
    for (let i = 0; i < n; i++) {
      pairedFitIds.add(inInt[i]!.fitId);
      pairedFitIds.add(outInt[i]!.fitId);
    }
  }

  const reserveFitIds = new Set<string>();
  for (const t of txns) {
    if (isReserveTransfer(t.memo)) reserveFitIds.add(t.fitId);
  }

  const internalFitIds = new Set<string>([...pairedFitIds, ...reserveFitIds]);
  return { pairedFitIds, reserveFitIds, internalFitIds };
}
