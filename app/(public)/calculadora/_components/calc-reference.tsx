import { CalendarClock } from "lucide-react";

import { getCalculatorReference } from "../_lib/calculator-references";

/**
 * Linha de transparência só para calculadoras que seguem tabela/lei que muda no
 * tempo. Fórmula matemática pura (`legal: false`) não renderiza nada: o próprio
 * cálculo já é explícito e não sai de validade.
 */
export function CalcReference({ simId }: { simId: string }) {
  const ref = getCalculatorReference(simId);
  if (!ref || !ref.legal) return null;

  return (
    <p className="flex items-start gap-2 border-t border-[color:var(--border-soft)] pt-3 text-[0.75rem] leading-relaxed text-[color:var(--text-muted)]">
      <CalendarClock size={14} strokeWidth={1.75} className="mt-px shrink-0" aria-hidden />
      <span>
        Tabela de referência: {ref.table}. Valores de {ref.year}, atualizados em {ref.updated}.
      </span>
    </p>
  );
}
