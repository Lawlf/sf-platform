"use client";

import { AlertCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTransition, useState } from "react";

import { Button } from "@/app/components/ui/button";
import { Spinner } from "@/app/components/ui/spinner";
import { MoneyInputControlled } from "@/app/(app)/app/_components/money-input-controlled";

import { upsertMeiMonthlyAction } from "../_actions/upsert-mei-monthly.action";

interface MeiMonthlyFormProps {
  competencia: string;
  initialProLaboreCents: bigint;
  initialGastoPessoalPjCents: bigint;
}

export function MeiMonthlyForm({
  competencia,
  initialProLaboreCents,
  initialGastoPessoalPjCents,
}: MeiMonthlyFormProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [proLabore, setProLabore] = useState<bigint>(initialProLaboreCents);
  const [gastoPessoal, setGastoPessoal] = useState<bigint>(initialGastoPessoalPjCents);
  const [error, setError] = useState<string | null>(null);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const result = await upsertMeiMonthlyAction({
        competencia,
        proLaboreCents: String(proLabore),
        gastoPessoalPjCents: String(gastoPessoal),
      });
      if (!result.ok) {
        setError(result.message);
        return;
      }
      router.refresh();
    });
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <label
          htmlFor="pro-labore"
          className="text-[0.8125rem] font-medium text-[color:var(--text-secondary)]"
        >
          Pró-labore (o que você transferiu pra conta pessoal)
        </label>
        <MoneyInputControlled
          id="pro-labore"
          value={proLabore}
          onChange={setProLabore}
          ariaLabel="Pró-labore em reais"
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label
          htmlFor="gasto-pessoal"
          className="text-[0.8125rem] font-medium text-[color:var(--text-secondary)]"
        >
          Gasto pessoal pela conta da empresa (o que você pagou de conta pessoal pelo CNPJ)
        </label>
        <MoneyInputControlled
          id="gasto-pessoal"
          value={gastoPessoal}
          onChange={setGastoPessoal}
          ariaLabel="Gasto pessoal pela empresa em reais"
        />
      </div>

      {error ? (
        <p role="alert" className="flex items-center gap-1.5 text-[0.8125rem] text-[color:var(--semantic-negative)]">
          <AlertCircle size={14} strokeWidth={2} aria-hidden />
          {error}
        </p>
      ) : null}

      <Button
        type="submit"
        variant="brand"
        size="default"
        className="w-full"
        disabled={pending}
        aria-busy={pending}
      >
        {pending ? (
          <Spinner size={16} decorative />
        ) : null}
        Salvar lançamento do mês
      </Button>
    </form>
  );
}
