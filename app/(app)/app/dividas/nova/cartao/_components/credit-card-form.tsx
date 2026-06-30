"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useQueryClient } from "@tanstack/react-query";
import { ArrowRight } from "lucide-react";
import type { Route } from "next";
import { useRouter } from "next/navigation";
import { useId, useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { CURRENCIES, type Currency } from "@/domain/value-objects/money.vo";

import { createDebtAction } from "../../../_actions/create-debt.action";
import { todayIso } from "@/shared/format/dates";
import { formatCentsBRL } from "../../../_lib/format";
import { invalidateDebtCaches } from "../../../_lib/invalidate";
import { linkDebtToAssetAction } from "../../_actions/link-debt-to-asset.action";
import { BankCombobox } from "../../_components/bank-combobox";
import { ComputedCard } from "../../_components/computed-card";
import { validateLinkAssetStep } from "../../_components/link-asset-step";
import { SummaryList } from "../../_components/summary-list";
import { WizardField, wizardInputClass } from "@/ui/wizard-field";
import { WizardMoneyField } from "../../_components/wizard-money-field";
import { WizardShell } from "../../_components/wizard-shell";
import {
  buildLinkSummary,
  debtCreatedHref,
  linkAssetDefaultsFor,
  linkAssetSlice,
} from "../../_lib/link-asset";

const installmentPurchaseSchema = z
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
  label: z.string().min(1, "Informe um nome.").max(120),
  currency: z.enum(CURRENCIES),
  creditLimitCents: z.bigint().nullable(),
  currentStatementCents: z.bigint().min(0n, "Não pode ser negativo."),
  statementDay: z.number().int().min(1).max(31),
  dueDay: z.number().int().min(1).max(31),
  revolvingBalanceCents: z.bigint().nullable(),
  revolvingMonthlyRatePct: z.number().nullable(),
  startDate: z.string().min(1, "Informe a data de início."),
  expectedEndDate: z.string().nullable().optional(),
  notes: z.string().optional().nullable(),
  installmentPurchases: z.array(installmentPurchaseSchema),
  ...linkAssetSlice,
}).superRefine((d, ctx) => {
  if (d.creditLimitCents === null || d.creditLimitCents <= 0n) return;
  const used = d.currentStatementCents + (d.revolvingBalanceCents ?? 0n);
  if (used > d.creditLimitCents) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["currentStatementCents"],
      message: "A fatura mais o saldo que rolou não pode passar do limite do cartão.",
    });
  }
});

type FormValues = z.infer<typeof formSchema>;


// Colapsado pra 2 telas: o essencial que o ICP sabe de cabeça (fatura + dia que
// vence) e a confirmacao. Limite, juros do rotativo, dia de fechamento, compras
// parceladas e bem vinculado sao adiaveis: edita depois no detalhe do cartao.
type Step = 2 | 3;

const ESSENTIAL_FIELDS = ["label", "currentStatementCents", "dueDay"] as const;

interface CreditCardFormProps {
  existing?: boolean;
  defaultCurrency?: Currency;
  initialLinkAssetId?: string | null;
  onWantDetailed?: (seed: CardSeed) => void;
}

export interface CardSeed {
  label: string;
  currentStatementCents: bigint;
  dueDay: number;
}

export function CreditCardForm({
  existing = false,
  defaultCurrency = "BRL",
  initialLinkAssetId = null,
  onWantDetailed,
}: CreditCardFormProps = {}) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [step, setStep] = useState<Step>(2);
  const [pending, startTransition] = useTransition();
  const [serverError, setServerError] = useState<string | null>(null);

  const [bank, setBank] = useState("");

  const labelId = useId();
  const bankId = useId();
  const statementId = useId();
  const dueDayId = useId();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      label: "Cartão de crédito",
      currency: defaultCurrency,
      creditLimitCents: null,
      currentStatementCents: 0n as unknown as bigint,
      statementDay: 1,
      dueDay: 10,
      revolvingBalanceCents: null,
      revolvingMonthlyRatePct: null,
      startDate: todayIso(),
      expectedEndDate: null,
      notes: null,
      installmentPurchases: [],
      ...linkAssetDefaultsFor(initialLinkAssetId),
    },
  });

  const values = form.watch();
  const errors = form.formState.errors;
  const currency: Currency = values.currency ?? defaultCurrency;

  async function goToConfirm() {
    const valid = await form.trigger(ESSENTIAL_FIELDS);
    if (valid) setStep(3);
  }

  async function handleSubmit() {
    setServerError(null);
    const valid = await form.trigger();
    if (!valid) return;
    const v = form.getValues();

    const linkErr = validateLinkAssetStep(v);
    if (linkErr) {
      setServerError(linkErr);
      return;
    }

    const fd = new FormData();
    fd.set("label", v.label);
    fd.set("currency", v.currency);
    fd.set("creditLimitCents", v.creditLimitCents ? v.creditLimitCents.toString() : "");
    fd.set("currentStatementCents", v.currentStatementCents.toString());
    fd.set("statementDay", String(v.statementDay));
    fd.set("dueDay", String(v.dueDay));
    fd.set(
      "revolvingBalanceCents",
      v.revolvingBalanceCents ? v.revolvingBalanceCents.toString() : "",
    );
    fd.set(
      "revolvingMonthlyRatePct",
      v.revolvingMonthlyRatePct !== null ? String(v.revolvingMonthlyRatePct) : "",
    );
    fd.set("startDate", v.startDate);
    fd.set("expectedEndDate", v.expectedEndDate ?? "");
    fd.set("notes", v.notes ?? "");
    fd.set(
      "installmentPurchasesJson",
      JSON.stringify(
        (v.installmentPurchases ?? []).map((p) => ({
          description: p.description,
          totalCents: p.totalCents.toString(),
          installmentsTotal: p.installmentsTotal,
          installmentsRemaining: p.installmentsRemaining,
        })),
      ),
    );

    startTransition(async () => {
      // Vínculo de bem é adiável; só acontece quando o fluxo já chega com um bem
      // (ex: "parcelei esse carro"). Sem isso, cria o cartão direto.
      const assetIdToLink = v.linkAssetChoice === "existing" ? (v.linkedAssetId ?? null) : null;

      fd.set("kind", "credit_card");
      const debtRes = await createDebtAction(fd);
      if (!debtRes.ok) {
        setServerError(debtRes.message);
        return;
      }

      if (assetIdToLink) {
        const allocationCents = v.linkedAssetAllocationCents ?? v.currentStatementCents;
        if (allocationCents > 0n) {
          const linkRes = await linkDebtToAssetAction({
            assetId: assetIdToLink,
            debtId: debtRes.data.debtId,
            allocationOriginalCents: allocationCents.toString(),
          });
          if (!linkRes.ok) {
            setServerError(`Dívida criada, mas falha ao vincular bem: ${linkRes.message}`);
            await invalidateDebtCaches(queryClient);
            router.push(`/app/dividas/${debtRes.data.debtId}` as Route);
            return;
          }
        }
      }

      await invalidateDebtCaches(queryClient);
      router.push(debtCreatedHref(initialLinkAssetId, debtRes.data.debtId) as Route);
    });
  }

  const arrowRight = <ArrowRight size={14} strokeWidth={2} aria-hidden />;

  if (step === 2) {
    return (
      <WizardShell
        currentStep={1}
        totalSteps={2}
        title={existing ? "Cartão com saldo antigo" : "Seu cartão de crédito"}
        description={
          existing
            ? "Só o essencial: nome, quanto falta e o dia que vence."
            : "Só o essencial: nome, a fatura de agora e o dia que vence."
        }
        onBack={() =>
          router.push((existing ? "/app/dividas/nova/antiga" : "/app/dividas/nova") as Route)
        }
        primary={{
          label: "Continuar",
          onClick: () => {
            void goToConfirm();
          },
          icon: arrowRight,
        }}
      >
        <WizardField label="Banco (opcional)" htmlFor={bankId}>
          <BankCombobox
            id={bankId}
            value={bank}
            onChange={(b) => {
              setBank(b);
              form.setValue("label", b.trim() ? `Cartão ${b.trim()}` : "Cartão de crédito", {
                shouldValidate: true,
              });
            }}
            placeholder="Ex: Nubank, Itaú, Caixa..."
          />
        </WizardField>

        <WizardField label="Nome do cartão" htmlFor={labelId} error={errors.label?.message}>
          <input
            id={labelId}
            {...form.register("label")}
            placeholder="Ex: Cartão Nubank"
            className={wizardInputClass}
          />
        </WizardField>

        <WizardField
          label={existing ? "Quanto falta pagar" : "Quanto tem de fatura agora"}
          helper={
            existing
              ? undefined
              : "A fatura aberta agora, a que ainda vai vencer. Não a que você já pagou."
          }
          htmlFor={statementId}
          error={errors.currentStatementCents?.message}
        >
          <WizardMoneyField
            control={form.control}
            name="currentStatementCents"
            id={statementId}
            placeholder="R$ 0,00"
            currency={currency}
            onCurrencyChange={(c) => form.setValue("currency", c)}
          />
        </WizardField>

        <WizardField
          label="Que dia do mês?"
          helper="Dia de pagar a fatura. Vem escrito na própria fatura."
          htmlFor={dueDayId}
          error={errors.dueDay?.message}
        >
          <input
            id={dueDayId}
            type="number"
            inputMode="numeric"
            min={1}
            max={31}
            {...form.register("dueDay", { valueAsNumber: true })}
            className={wizardInputClass}
          />
        </WizardField>

        <p className="text-[0.75rem] leading-snug text-[color:var(--text-muted)]">
          Limite, juros e compras parceladas você adiciona depois, no cartão. Aqui é só pra ele já
          entrar no seu mês.
        </p>

        {onWantDetailed ? (
          <button
            type="button"
            onClick={() =>
              onWantDetailed({
                label: values.label || "Cartão de crédito",
                currentStatementCents:
                  typeof values.currentStatementCents === "bigint"
                    ? values.currentStatementCents
                    : 0n,
                dueDay: values.dueDay,
              })
            }
            className="focus-ring w-fit text-[0.8125rem] font-semibold text-[color:var(--color-brand-500)] hover:underline"
          >
            Tem o limite e os juros? Preencher tudo
          </button>
        ) : null}
      </WizardShell>
    );
  }

  // step 3: confirma
  const statementCents =
    typeof values.currentStatementCents === "bigint" ? values.currentStatementCents : 0n;
  const heroValue = formatCentsBRL(statementCents);
  const heroSub = `Fatura que vence todo dia ${values.dueDay}`;
  const hasLink = values.linkAssetChoice === "existing" && Boolean(values.linkedAssetId);
  const linkSummary = buildLinkSummary(values);

  return (
    <WizardShell
      currentStep={2}
      totalSteps={2}
      title="Confere e salva"
      description="Esses são os números. Pode ajustar depois."
      onBack={() => setStep(2)}
      primary={{
        label: "Salvar dívida",
        onClick: () => {
          void handleSubmit();
        },
        disabled: pending,
        loading: pending,
      }}
    >
      <ComputedCard label="Vai sair do seu mês" value={heroValue} sub={heroSub} />

      <SummaryList
        items={[
          { label: "Nome", value: values.label || "Sem nome" },
          { label: "Tipo", value: "Cartão de crédito" },
          { label: "Fatura atual", value: formatCentsBRL(values.currentStatementCents) },
          { label: "Vencimento", value: `Dia ${values.dueDay}` },
          ...(hasLink ? [{ label: "Bem vinculado", value: linkSummary }] : []),
        ]}
      />

      <p className="text-[0.75rem] leading-snug text-[color:var(--text-muted)]">
        Depois, no cartão, dá pra adicionar limite, juros do rotativo e compras parceladas pra
        deixar mais certinho.
      </p>

      {serverError ? (
        <div
          role="alert"
          className="mb-3 rounded-xl border border-[color:var(--semantic-negative)]/30 bg-[color:var(--semantic-negative)]/10 px-3 py-2 text-[0.8125rem] text-[color:var(--semantic-negative)]"
        >
          {serverError}
        </div>
      ) : null}
    </WizardShell>
  );
}
