import type { DebtKind } from "@/domain/entities/debt.entity";

interface Props {
  kind: DebtKind;
}

export function NoScheduleSection({ kind }: Props) {
  return (
    <section className="rounded-2xl border border-[color:var(--border-soft)] bg-[color:var(--surface-1)] p-4 backdrop-blur-xl">
      <h2 className="text-sm font-semibold text-[color:var(--text-primary)]">
        Cronograma de amortização
      </h2>
      <p className="mt-2 text-[12px] text-[color:var(--text-muted)]">
        {kind === "credit_card"
          ? "Cartão não possui cronograma fixo; veja os pagamentos abaixo."
          : kind === "overdraft"
            ? "Cheque especial cobra juros sobre o saldo, sem cronograma fixo."
            : "Sem cronograma de amortização para este tipo."}
      </p>
    </section>
  );
}
