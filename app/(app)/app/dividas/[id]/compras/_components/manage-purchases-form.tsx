"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useQueryClient } from "@tanstack/react-query";
import type { Route } from "next";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { useFieldArray, useForm } from "react-hook-form";
import { z } from "zod";

import { Button } from "@/app/components/ui/button";

import { queryKeys } from "../../../../_lib/query-keys";
import {
  InstallmentPurchasesEditor,
  sumMonthlyCents,
} from "../../../_components/installment-purchases-editor";
import { updateDebtAction } from "../../_actions/update-debt.action";

const purchaseSchema = z
  .object({
    description: z.string().min(1, "Descreva a compra.").max(120),
    totalCents: z.bigint().positive("Total deve ser positivo."),
    installmentsTotal: z.number().int().min(1).max(120),
    installmentsRemaining: z.number().int().min(0).max(120),
  })
  .refine((d) => d.installmentsRemaining <= d.installmentsTotal, {
    message: "Restantes não pode ser maior que o total.",
    path: ["installmentsRemaining"],
  });

const formSchema = z.object({
  purchases: z.array(purchaseSchema),
});

type FormValues = z.infer<typeof formSchema>;

interface Defaults {
  description: string;
  totalCents: string;
  installmentsTotal: number;
  installmentsRemaining: number;
}

interface Props {
  debtId: string;
  defaults: Defaults[];
}

export function ManagePurchasesForm({ debtId, defaults }: Props) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [pending, startTransition] = useTransition();
  const [serverError, setServerError] = useState<string | null>(null);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      purchases: defaults.map((d) => ({
        description: d.description,
        totalCents: BigInt(d.totalCents),
        installmentsTotal: d.installmentsTotal,
        installmentsRemaining: d.installmentsRemaining,
      })),
    },
  });

  const purchasesArray = useFieldArray({ control: form.control, name: "purchases" });
  const values = form.watch();
  const errors = form.formState.errors;

  const totalMonthly = useMemo(() => sumMonthlyCents(values.purchases), [values.purchases]);

  async function onSubmit(v: FormValues) {
    setServerError(null);
    const fd = new FormData();
    fd.set("debtId", debtId);
    fd.set(
      "installmentPurchasesJson",
      JSON.stringify(
        (v.purchases ?? []).map((p) => ({
          description: p.description,
          totalCents: p.totalCents.toString(),
          installmentsTotal: p.installmentsTotal,
          installmentsRemaining: p.installmentsRemaining,
        })),
      ),
    );
    startTransition(async () => {
      const r = await updateDebtAction(fd);
      if (!r.ok) {
        setServerError(r.message);
        return;
      }
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.debts("active") }),
        queryClient.invalidateQueries({ queryKey: queryKeys.debts("all") }),
        queryClient.invalidateQueries({ queryKey: queryKeys.dashboardSnapshot }),
        queryClient.invalidateQueries({ queryKey: ["timeline"] }),
      ]);
      router.push(`/app/dividas/${debtId}` as Route);
    });
  }

  return (
    <form noValidate onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-4">
      <InstallmentPurchasesEditor
        arrayName="purchases"
        control={form.control}
        register={form.register}
        fields={purchasesArray.fields}
        append={purchasesArray.append}
        remove={purchasesArray.remove}
        values={values.purchases}
        errors={errors.purchases}
        totalMonthlyCents={totalMonthly}
        emptyMessage="Sem compras parceladas cadastradas."
      />

      {serverError ? (
        <span role="alert" className="text-sm text-[color:var(--semantic-negative)]">
          {serverError}
        </span>
      ) : null}

      <div className="flex items-center gap-3">
        <Button type="submit" loading={pending}>
          Salvar compras
        </Button>
        <Button
          type="button"
          variant="ghost"
          onClick={() => router.push(`/app/dividas/${debtId}` as Route)}
        >
          Cancelar
        </Button>
      </div>
    </form>
  );
}
