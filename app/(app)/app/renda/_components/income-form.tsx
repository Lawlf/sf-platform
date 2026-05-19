"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { Button } from "@/app/components/ui/button";

import { MoneyInput } from "../../_components/money-input";
import { createIncomeAction } from "../_actions/create-income.action";

const formSchema = z.object({
  label: z.string().min(1, "Informe um rotulo.").max(120),
  amountCents: z.bigint().positive("Valor deve ser positivo."),
  frequency: z.enum(["monthly", "weekly", "one_off"]),
  startDate: z.string().min(1, "Informe a data inicial."),
  endDate: z.string().nullable().optional(),
});

type FormValues = z.infer<typeof formSchema>;

const TODAY = new Date().toISOString().slice(0, 10);

export function IncomeForm() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [serverError, setServerError] = useState<string | null>(null);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      label: "",
      amountCents: 0n as unknown as bigint,
      frequency: "monthly",
      startDate: TODAY,
      endDate: null,
    },
  });

  async function onSubmit(values: FormValues) {
    setServerError(null);
    const fd = new FormData();
    fd.set("label", values.label);
    fd.set("amountCents", values.amountCents.toString());
    fd.set("frequency", values.frequency);
    fd.set("startDate", values.startDate);
    fd.set("endDate", values.endDate ?? "");
    startTransition(async () => {
      const r = await createIncomeAction(fd);
      if (!r.ok) {
        setServerError(r.message);
        return;
      }
      form.reset({
        label: "",
        amountCents: 0n as unknown as bigint,
        frequency: "monthly",
        startDate: TODAY,
        endDate: null,
      });
      router.refresh();
    });
  }

  return (
    <form noValidate onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-3">
      <label className="flex flex-col gap-1 text-sm">
        <span className="font-medium">Rotulo</span>
        <input
          {...form.register("label")}
          placeholder="ex: Salario"
          className="rounded-lg border border-black/10 bg-white/70 px-3 py-2 text-base outline-none focus:border-[color:var(--color-brand-500)] focus:ring-2 focus:ring-[color:var(--color-brand-500)]/30"
        />
        {form.formState.errors.label ? (
          <span role="alert" className="text-xs text-[color:var(--color-negative)]">
            {form.formState.errors.label.message}
          </span>
        ) : null}
      </label>

      <MoneyInput control={form.control} name="amountCents" label="Valor" required />

      <label className="flex flex-col gap-1 text-sm">
        <span className="font-medium">Frequencia</span>
        <select
          {...form.register("frequency")}
          className="rounded-lg border border-black/10 bg-white/70 px-3 py-2 text-base outline-none focus:border-[color:var(--color-brand-500)] focus:ring-2 focus:ring-[color:var(--color-brand-500)]/30"
        >
          <option value="monthly">Mensal</option>
          <option value="weekly">Semanal</option>
          <option value="one_off">Pontual</option>
        </select>
      </label>

      <label className="flex flex-col gap-1 text-sm">
        <span className="font-medium">Início</span>
        <input
          type="date"
          {...form.register("startDate")}
          className="rounded-lg border border-black/10 bg-white/70 px-3 py-2 text-base outline-none focus:border-[color:var(--color-brand-500)] focus:ring-2 focus:ring-[color:var(--color-brand-500)]/30"
        />
      </label>

      <label className="flex flex-col gap-1 text-sm">
        <span className="font-medium">Término (opcional)</span>
        <input
          type="date"
          {...form.register("endDate")}
          className="rounded-lg border border-black/10 bg-white/70 px-3 py-2 text-base outline-none focus:border-[color:var(--color-brand-500)] focus:ring-2 focus:ring-[color:var(--color-brand-500)]/30"
        />
      </label>

      {serverError ? (
        <span role="alert" className="text-sm text-[color:var(--color-negative)]">
          {serverError}
        </span>
      ) : null}

      <Button type="submit" disabled={pending}>
        {pending ? "Salvando..." : "Adicionar renda"}
      </Button>
    </form>
  );
}
