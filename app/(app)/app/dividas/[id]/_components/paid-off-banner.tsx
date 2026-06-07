import { CheckCircle2, CircleSlash } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";

import { Button } from "@/app/components/ui/button";
import type { DebtEntity } from "@/domain/entities/debt.entity";
import { Money } from "@/domain/value-objects/money.vo";

import { HideableValue } from "../../../_components/money-visibility/hideable-value.client";

const FREQ_WORD = { monthly: "mês", weekly: "semana", annual: "ano" } as const;

interface Props {
  debt: DebtEntity;
}

export function PaidOffBanner({ debt }: Props) {
  if (debt.kind === "recurring") return <RecurringBanner debt={debt} />;

  const faced = debt.originalPrincipal;
  const hasFaced = faced.toCents() > 0n;

  return (
    <Shell icon={<CheckCircle2 size={22} strokeWidth={2} aria-hidden />}>
      <h2 className="text-base font-extrabold text-[color:var(--text-primary)]">
        Pronto. Essa você fechou.
      </h2>
      <p className="mt-1 text-sm text-[color:var(--text-secondary)]">
        {hasFaced ? (
          <>
            Você fechou <HideableValue>{faced.format()}</HideableValue> nessa dívida. Acabou.
          </>
        ) : (
          "Era uma conta correndo todo mês. Saiu da sua frente."
        )}
      </p>
      <div className="mt-4 flex flex-wrap gap-2">
        <Button asChild size="sm">
          <Link href={"/app/metas/nova" as Route}>Guardar o que sobrou</Link>
        </Button>
        <Button asChild size="sm" variant="outline">
          <Link href={"/app/patrimonio" as Route}>Ver meu patrimônio</Link>
        </Button>
      </div>
    </Shell>
  );
}

function RecurringBanner({ debt }: { debt: Extract<DebtEntity, { kind: "recurring" }> }) {
  const value = Money.fromCents(debt.recurringAmountCents);
  const period = FREQ_WORD[debt.recurringFrequency];
  const annual =
    debt.recurringFrequency === "monthly"
      ? Money.fromCents(debt.recurringAmountCents * 12n)
      : null;

  return (
    <Shell icon={<CircleSlash size={22} strokeWidth={2} aria-hidden />}>
      <h2 className="text-base font-extrabold text-[color:var(--text-primary)]">
        Pronto. Esse saiu do mês.
      </h2>
      <p className="mt-1 text-sm text-[color:var(--text-secondary)]">
        São <HideableValue>{value.format()}</HideableValue>/{period} que voltam pro seu bolso.
        {annual ? (
          <>
            {" "}
            No ano, dá <HideableValue>{annual.format()}</HideableValue>.
          </>
        ) : null}
      </p>
      <div className="mt-4 flex flex-wrap gap-2">
        <Button asChild size="sm">
          <Link href={"/app/metas/nova" as Route}>Juntar o que sobra</Link>
        </Button>
        <Button asChild size="sm" variant="outline">
          <Link href={"/app/dividas" as Route}>Ver minhas assinaturas</Link>
        </Button>
      </div>
    </Shell>
  );
}

function Shell({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="animate-in fade-in slide-in-from-bottom-2 duration-500 rounded-2xl border border-[color:var(--semantic-positive)]/40 bg-[color:var(--semantic-positive)]/[0.08] p-5">
      <div className="flex items-start gap-3">
        <span className="mt-0.5 shrink-0 text-[color:var(--semantic-positive)]">{icon}</span>
        <div className="min-w-0">{children}</div>
      </div>
    </section>
  );
}
