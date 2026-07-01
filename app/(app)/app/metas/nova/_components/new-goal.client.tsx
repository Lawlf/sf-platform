"use client";

import { useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, ArrowLeft } from "lucide-react";
import type { Route } from "next";
import { useRouter } from "next/navigation";
import { useId, useState, useTransition } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";

import { Button } from "@/app/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/app/components/ui/select";

import { MoneyInput } from "../../../_components/money-input";
import { WizardField, wizardInputClass } from "@/ui/wizard-field";
import { WizardChoiceGroup } from "@/ui/wizard-choice-group";
import { WizardRadioCard } from "@/ui/wizard-radio-card";
import { simSelectClass } from "../../../simular/_components/sim-result";
import { SimSlider } from "../../../simular/_components/sim-slider";
import type { GoalSeed } from "../../../simular/_lib/goal-seed";
import type { SimPrefill } from "../../../simular/_lib/sim-prefill";
import {
  createGoalAction,
  updateGoalAction,
  type CreateGoalActionInput,
} from "../../_actions/goal-actions";
import type { SerializedGoal } from "../../_actions/goal-queries";
import { invalidateGoalCaches } from "../../_lib/invalidate";
import { HouseholdGoalNudge } from "./household-goal-nudge";

export interface DebtOption {
  id: string;
  label: string;
  balanceCents: string;
}

export interface AssetOption {
  id: string;
  label: string;
  category: string;
  valueCents: string;
}

interface NewGoalProps {
  prefill: SimPrefill;
  debts: DebtOption[];
  assets: AssetOption[];
  seed?: GoalSeed | null;
  mode?: "create" | "edit";
  existingGoal?: SerializedGoal | null;
  showHouseholdNudge?: boolean;
}

type GoalTypeChoice = "debt_payoff" | "emergency_fund" | "savings" | "financial_independence";

interface DebtPayoffForm {
  linkedDebtId: string;
  title: string;
  monthlyContributionCents: bigint | null;
}

interface EmergencyFundForm {
  title: string;
  targetMonths: number;
  monthlyCostCents: bigint | null;
}

interface SavingsForm {
  title: string;
  targetCents: bigint;
  deadlineIso: string;
  fundingMode: "linked" | "manual";
  linkedAssetId: string;
  manualSavedCents: bigint;
}

interface FinancialIndependenceForm {
  title: string;
  monthlyCostCents: bigint;
  realReturnPct: number;
}

function brl(centsStr: string): string {
  const n = Number(centsStr) / 100;
  return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="mb-3 text-[0.6875rem] font-bold uppercase tracking-[0.6px] text-[color:var(--color-brand-800)]">
      {children}
    </h2>
  );
}

const SAVINGS_TITLE_SUGGESTIONS = [
  "Viagem",
  "Entrada do carro",
  "Entrada do apartamento",
  "Casamento",
  "Reforma",
  "Notebook novo",
  "Presente",
  "Curso",
];

function TitleSuggestInput({
  id,
  value,
  onChange,
  onPick,
  placeholder,
}: {
  id: string;
  value: string;
  onChange: (value: string) => void;
  onPick: (value: string) => void;
  placeholder?: string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative">
      <input
        id={id}
        type="text"
        className={wizardInputClass}
        {...(placeholder ? { placeholder } : {})}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => setOpen(true)}
      />
      {open ? (
        <>
          <button
            type="button"
            aria-hidden
            tabIndex={-1}
            className="fixed inset-0 z-10 cursor-default"
            onClick={() => setOpen(false)}
          />
          <div className="absolute left-0 right-0 top-[calc(100%+4px)] z-20 flex max-h-60 flex-col gap-0.5 overflow-y-auto rounded-xl border border-[color:var(--border-soft)] bg-[color:var(--surface-1)] p-1 shadow-lg backdrop-blur-xl">
            <span className="px-3 pb-1 pt-1.5 text-[0.625rem] font-semibold uppercase tracking-[0.5px] text-[color:var(--text-secondary)]">
              Sugestões, digite a sua se preferir
            </span>
            {SAVINGS_TITLE_SUGGESTIONS.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => {
                  onPick(s);
                  setOpen(false);
                }}
                className="rounded-lg px-3 py-2 text-left text-[0.8125rem] text-[color:var(--text-primary)] hover:bg-[color:var(--surface-2)]"
              >
                {s}
              </button>
            ))}
          </div>
        </>
      ) : null}
    </div>
  );
}

// ---- DebtPayoff step -------------------------------------------------------

function DebtPayoffStep({
  debts,
  seed,
  existingGoal,
  onSubmit,
  loading,
  error,
}: {
  debts: DebtOption[];
  seed?: GoalSeed | null;
  existingGoal?: SerializedGoal | null;
  onSubmit: (data: DebtPayoffForm) => void;
  loading: boolean;
  error: string | null;
}) {
  const seededDebt =
    seed?.type === "debt_payoff" && debts.some((d) => d.id === seed.debtId)
      ? debts.find((d) => d.id === seed.debtId)
      : undefined;
  const form = useForm<DebtPayoffForm>({
    defaultValues: {
      linkedDebtId: existingGoal
        ? (existingGoal.linkedDebtId ?? debts[0]?.id ?? "")
        : seededDebt
          ? seededDebt.id
          : (debts[0]?.id ?? ""),
      title: existingGoal
        ? existingGoal.title
        : seededDebt
          ? (seededDebt.label ?? "")
          : (debts[0]?.label ?? ""),
      monthlyContributionCents: existingGoal?.monthlyCostCents
        ? BigInt(existingGoal.monthlyCostCents)
        : seed?.type === "debt_payoff" && seed.monthlyContributionCents
          ? BigInt(seed.monthlyContributionCents)
          : 0n,
    },
  });
  const selectedDebtId = useWatch({ control: form.control, name: "linkedDebtId" });
  const selectId = useId();

  function handleDebtChange(id: string) {
    form.setValue("linkedDebtId", id);
    const found = debts.find((d) => d.id === id);
    if (found) form.setValue("title", found.label);
  }

  const titleId = useId();

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-4">
      <section className="glass-light p-4">
        <SectionHeading>Quitar dívida</SectionHeading>
        <div className="flex flex-col gap-3">
          {debts.length === 0 ? (
            <p className="text-[0.8125rem] text-[color:var(--text-secondary)]">
              Você não tem dívidas ativas cadastradas. Cadastre uma dívida primeiro.
            </p>
          ) : (
            <WizardField label="Dívida" htmlFor={selectId}>
              <Select value={selectedDebtId} onValueChange={handleDebtChange}>
                <SelectTrigger id={selectId} className={`${simSelectClass} h-auto w-full`}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {debts.map((d) => (
                    <SelectItem key={d.id} value={d.id}>
                      {d.label} ({brl(d.balanceCents)})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </WizardField>
          )}
          <WizardField
            label="Título da meta"
            htmlFor={titleId}
            helper="Como você quer chamar essa meta."
          >
            <input
              id={titleId}
              type="text"
              className={wizardInputClass}
              {...form.register("title", { required: true })}
            />
          </WizardField>
          <MoneyInput
            control={form.control}
            name="monthlyContributionCents"
            label="Quanto você vai pagar por mês"
            helper="O ritmo que você escolheu. A meta usa ele pra calcular quando a dívida quita."
          />
        </div>
      </section>
      {error ? <ErrorAlert message={error} /> : null}
      <Button
        type="submit"
        variant="brand"
        size="lg"
        className="w-full"
        loading={loading}
        disabled={debts.length === 0}
      >
        {existingGoal ? "Salvar alterações" : "Criar meta"}
      </Button>
    </form>
  );
}

// ---- EmergencyFund step ----------------------------------------------------

function EmergencyFundStep({
  seed,
  existingGoal,
  onSubmit,
  loading,
  error,
}: {
  seed?: GoalSeed | null;
  existingGoal?: SerializedGoal | null;
  onSubmit: (data: EmergencyFundForm) => void;
  loading: boolean;
  error: string | null;
}) {
  const form = useForm<EmergencyFundForm>({
    defaultValues: {
      title: existingGoal ? existingGoal.title : "Reserva de emergência",
      targetMonths: existingGoal
        ? (existingGoal.targetMonths ?? 6)
        : seed?.type === "emergency_fund"
          ? seed.targetMonths
          : 6,
      monthlyCostCents: null,
    },
  });
  const targetMonths = useWatch({ control: form.control, name: "targetMonths" }) ?? 6;
  const titleId = useId();
  // O custo so' vem do simulador (nao ha input no form), entao injetamos direto do seed/existingGoal
  // no submit em vez de depender do tracking do react-hook-form para um campo sem input.
  const seededCost = existingGoal?.monthlyCostCents
    ? BigInt(existingGoal.monthlyCostCents)
    : seed?.type === "emergency_fund"
      ? BigInt(seed.monthlyCostCents)
      : null;

  return (
    <form
      onSubmit={form.handleSubmit((data) => onSubmit({ ...data, monthlyCostCents: seededCost }))}
      className="flex flex-col gap-4"
    >
      <section className="glass-light p-4">
        <SectionHeading>Reserva de emergência</SectionHeading>
        <div className="flex flex-col gap-3">
          <WizardField label="Título da meta" htmlFor={titleId}>
            <input
              id={titleId}
              type="text"
              className={wizardInputClass}
              {...form.register("title", { required: true })}
            />
          </WizardField>
          <SimSlider
            label="Meses de reserva"
            value={targetMonths}
            min={1}
            max={24}
            step={1}
            displayValue={`${targetMonths} ${targetMonths === 1 ? "mês" : "meses"}`}
            onChange={(v) => form.setValue("targetMonths", v)}
          />
          <p className="text-[0.6875rem] leading-relaxed text-[color:var(--text-secondary)]">
            A gente estima seu custo de vida em cerca de 75% da sua renda. Você ajusta o valor
            depois.
          </p>
        </div>
      </section>
      {error ? <ErrorAlert message={error} /> : null}
      <Button type="submit" variant="brand" size="lg" className="w-full" loading={loading}>
        {existingGoal ? "Salvar alterações" : "Criar meta"}
      </Button>
    </form>
  );
}

// ---- Savings step ----------------------------------------------------------

function isoToInputDate(isoStr: string | null): string {
  if (!isoStr) return "";
  // Handles both "YYYY-MM-DD" and full ISO "YYYY-MM-DDTHH:mm:ss.sssZ"
  return isoStr.slice(0, 10);
}

function SavingsStep({
  prefill,
  assets,
  seed,
  existingGoal,
  onSubmit,
  loading,
  error,
  showHouseholdNudge,
  lockedAsset,
}: {
  prefill: SimPrefill;
  assets: AssetOption[];
  seed?: GoalSeed | null;
  existingGoal?: SerializedGoal | null;
  onSubmit: (data: SavingsForm) => void;
  loading: boolean;
  error: string | null;
  showHouseholdNudge?: boolean;
  lockedAsset?: AssetOption;
}) {
  const form = useForm<SavingsForm>({
    defaultValues: {
      title: existingGoal ? existingGoal.title : (lockedAsset?.label ?? ""),
      targetCents: existingGoal
        ? BigInt(existingGoal.targetCents ?? "0")
        : seed?.type === "savings"
          ? BigInt(seed.targetCents)
          : (0n as unknown as bigint),
      deadlineIso: existingGoal
        ? isoToInputDate(existingGoal.deadlineIso)
        : seed?.type === "savings"
          ? (seed.deadlineIso ?? "")
          : "",
      fundingMode: existingGoal
        ? ((existingGoal.fundingMode as "linked" | "manual" | null) ?? "manual")
        : seed?.type === "savings" && seed.fundingMode
          ? seed.fundingMode
          : "manual",
      linkedAssetId: existingGoal
        ? (existingGoal.linkedAssetId ?? assets[0]?.id ?? "")
        : (() => {
            const seedAsset =
              seed?.type === "savings" && seed.linkedAssetId
                ? assets.find((a) => a.id === seed.linkedAssetId)?.id
                : undefined;
            return seedAsset ?? assets[0]?.id ?? "";
          })(),
      manualSavedCents: existingGoal
        ? BigInt(existingGoal.manualSavedCents ?? "0")
        : seed?.type === "savings"
          ? BigInt(seed.savedCents)
          : BigInt(prefill.cashReserveCents),
    },
  });
  const fundingMode = useWatch({ control: form.control, name: "fundingMode" });
  const titleId = useId();
  const deadlineId = useId();
  const assetSelectId = useId();

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-4">
      <section className="glass-light p-4">
        <SectionHeading>Juntar um valor</SectionHeading>
        <div className="flex flex-col gap-3">
          <WizardField label="Título da meta" htmlFor={titleId}>
            <Controller
              control={form.control}
              name="title"
              rules={{ required: true }}
              render={({ field }) => (
                <TitleSuggestInput
                  id={titleId}
                  value={field.value}
                  onChange={field.onChange}
                  onPick={field.onChange}
                  placeholder="Ex: Viagem, entrada do carro..."
                />
              )}
            />
          </WizardField>
          <MoneyInput
            control={form.control}
            name="targetCents"
            label="Valor alvo"
            required
            helper="Quanto você quer ter guardado."
          />
          <WizardField
            label="Prazo (opcional)"
            htmlFor={deadlineId}
            helper="Deixe em branco para sem prazo definido."
          >
            <input
              id={deadlineId}
              type="date"
              className={wizardInputClass}
              {...form.register("deadlineIso")}
            />
          </WizardField>
          <div className="flex flex-col gap-1.5">
            <span className="text-[0.6875rem] font-semibold uppercase tracking-[0.5px] text-[color:var(--text-secondary)]">
              Como acompanhar o progresso
            </span>
            <div className="grid grid-cols-2 gap-2">
              <WizardRadioCard
                title="Vinculado"
                description="Ligado a uma reserva ou investimento que você já tem."
                active={fundingMode === "linked"}
                onSelect={() => form.setValue("fundingMode", "linked")}
              />
              <WizardRadioCard
                title="Manual"
                description="Você informa quanto já guardou."
                active={fundingMode === "manual"}
                onSelect={() => form.setValue("fundingMode", "manual")}
              />
            </div>
          </div>
          {fundingMode === "linked" ? (
            assets.length === 0 ? (
              <p className="text-[0.6875rem] text-[color:var(--text-secondary)]">
                Você não tem reservas ou investimentos cadastrados para vincular.
              </p>
            ) : (
              <WizardField label="Ativo vinculado" htmlFor={assetSelectId}>
                <Controller
                  control={form.control}
                  name="linkedAssetId"
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger
                        id={assetSelectId}
                        className={`${simSelectClass} h-auto w-full`}
                      >
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {assets.map((a) => (
                          <SelectItem key={a.id} value={a.id}>
                            {a.label} ({brl(a.valueCents)})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
              </WizardField>
            )
          ) : (
            <MoneyInput
              control={form.control}
              name="manualSavedCents"
              label="Já guardei"
              helper="Quanto você já tem separado para essa meta."
            />
          )}
        </div>
      </section>
      {showHouseholdNudge ? <HouseholdGoalNudge /> : null}
      {error ? <ErrorAlert message={error} /> : null}
      <Button type="submit" variant="brand" size="lg" className="w-full" loading={loading}>
        {existingGoal ? "Salvar alterações" : "Criar meta"}
      </Button>
    </form>
  );
}

// ---- FinancialIndependence step --------------------------------------------

function FinancialIndependenceStep({
  prefill,
  seed,
  existingGoal,
  onSubmit,
  loading,
  error,
}: {
  prefill: SimPrefill;
  seed?: GoalSeed | null;
  existingGoal?: SerializedGoal | null;
  onSubmit: (data: FinancialIndependenceForm) => void;
  loading: boolean;
  error: string | null;
}) {
  const form = useForm<FinancialIndependenceForm>({
    defaultValues: {
      title: existingGoal ? existingGoal.title : "Independência financeira",
      monthlyCostCents: existingGoal
        ? BigInt(existingGoal.monthlyCostCents ?? "0")
        : seed?.type === "financial_independence"
          ? BigInt(seed.monthlyCostCents)
          : BigInt(prefill.incomeCents),
      realReturnPct: existingGoal
        ? (existingGoal.realReturnPct ?? 4)
        : seed?.type === "financial_independence"
          ? seed.realReturnPct
          : 4,
    },
  });
  const realReturnPct = useWatch({ control: form.control, name: "realReturnPct" }) ?? 4;
  const titleId = useId();

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-4">
      <section className="glass-light p-4">
        <SectionHeading>Independência financeira</SectionHeading>
        <div className="flex flex-col gap-3">
          <WizardField label="Título da meta" htmlFor={titleId}>
            <input
              id={titleId}
              type="text"
              className={wizardInputClass}
              {...form.register("title", { required: true })}
            />
          </WizardField>
          <MoneyInput
            control={form.control}
            name="monthlyCostCents"
            label="Custo de vida mensal"
            required
            helper="Quanto você precisa por mês para viver sem trabalhar. Puxado da sua renda."
          />
          <SimSlider
            label="Rendimento real esperado"
            value={realReturnPct}
            min={1}
            max={10}
            step={0.5}
            displayValue={`${realReturnPct}% ao ano`}
            onChange={(v) => form.setValue("realReturnPct", v)}
          />
          <p className="text-[0.6875rem] leading-relaxed text-[color:var(--text-secondary)]">
            Quanto seu dinheiro rende por ano, já descontando a inflação. Se não souber, deixa em
            4%.
          </p>
        </div>
      </section>
      {error ? <ErrorAlert message={error} /> : null}
      <Button type="submit" variant="brand" size="lg" className="w-full" loading={loading}>
        {existingGoal ? "Salvar alterações" : "Criar meta"}
      </Button>
    </form>
  );
}

// ---- ErrorAlert ------------------------------------------------------------

function ErrorAlert({ message }: { message: string }) {
  return (
    <p
      role="alert"
      className="flex items-start gap-2 rounded-xl border border-[color:var(--semantic-negative)]/30 bg-[color:var(--semantic-negative)]/10 px-3 py-2 text-[0.8125rem] text-[color:var(--semantic-negative)]"
    >
      <AlertTriangle size={16} strokeWidth={2} className="mt-0.5 shrink-0" aria-hidden />
      {message}
    </p>
  );
}

// ---- Main component --------------------------------------------------------

const GOAL_TYPES: { type: GoalTypeChoice; title: string; description: string }[] = [
  {
    type: "debt_payoff",
    title: "Quitar uma dívida",
    description: "Tirar uma conta que tá correndo juros.",
  },
  {
    type: "emergency_fund",
    title: "Reserva de emergência",
    description: "Meses de custo de vida guardados.",
  },
  {
    type: "savings",
    title: "Juntar um valor",
    description: "Viagem, entrada, projeto, qualquer meta.",
  },
  {
    type: "financial_independence",
    title: "Independência",
    description: "Viver de renda passiva.",
  },
];

function toPatch(input: CreateGoalActionInput) {
  const { type: _type, ...patch } = input;
  return patch;
}

export function NewGoal({
  prefill,
  debts,
  assets,
  seed,
  mode = "create",
  existingGoal,
  showHouseholdNudge = false,
}: NewGoalProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const isEdit = mode === "edit" && existingGoal != null;
  const [goalType, setGoalType] = useState<GoalTypeChoice | null>(
    isEdit ? (existingGoal.type as GoalTypeChoice) : null,
  );
  const [step, setStep] = useState<"type" | "form">(isEdit ? "form" : "type");
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [, startTransition] = useTransition();
  const [loading, setLoading] = useState(false);

  function handleTypeSelect(t: GoalTypeChoice) {
    setGoalType(t);
    setSubmitError(null);
    setStep("form");
  }

  async function handleCreate(input: CreateGoalActionInput) {
    setLoading(true);
    setSubmitError(null);
    startTransition(async () => {
      if (isEdit) {
        const res = await updateGoalAction({ goalId: existingGoal.id, patch: toPatch(input) });
        setLoading(false);
        if (res.ok) {
          await invalidateGoalCaches(queryClient);
          router.push(`/app/metas/${existingGoal.id}` as Route);
        } else {
          setSubmitError(res.message ?? "Erro ao salvar meta. Tente novamente.");
        }
      } else {
        const result = await createGoalAction(input);
        setLoading(false);
        if (result.ok) {
          await invalidateGoalCaches(queryClient);
          router.push(`/app/metas/${result.data.goalId}` as Route);
        } else {
          setSubmitError(result.message ?? "Erro ao criar meta. Tente novamente.");
        }
      }
    });
  }

  function handleDebtPayoff(data: DebtPayoffForm) {
    const ritmo =
      typeof data.monthlyContributionCents === "bigint" ? data.monthlyContributionCents : 0n;
    void handleCreate({
      type: "debt_payoff",
      title: data.title,
      linkedDebtId: data.linkedDebtId || null,
      monthlyCostCents: ritmo > 0n ? ritmo.toString() : null,
    });
  }

  function handleEmergencyFund(data: EmergencyFundForm) {
    void handleCreate({
      type: "emergency_fund",
      title: data.title,
      targetMonths: data.targetMonths,
      monthlyCostCents: data.monthlyCostCents !== null ? data.monthlyCostCents.toString() : null,
    });
  }

  function handleSavings(data: SavingsForm) {
    const targetCentsRaw = typeof data.targetCents === "bigint" ? data.targetCents : 0n;
    const manualSavedRaw = typeof data.manualSavedCents === "bigint" ? data.manualSavedCents : 0n;
    void handleCreate({
      type: "savings",
      title: data.title,
      targetCents: targetCentsRaw.toString(),
      deadlineIso: data.deadlineIso ? new Date(data.deadlineIso).toISOString() : null,
      fundingMode: data.fundingMode,
      linkedAssetId: data.fundingMode === "linked" ? data.linkedAssetId || null : null,
      manualSavedCents: data.fundingMode === "manual" ? manualSavedRaw.toString() : null,
    });
  }

  function handleFinancialIndependence(data: FinancialIndependenceForm) {
    const costRaw = typeof data.monthlyCostCents === "bigint" ? data.monthlyCostCents : 0n;
    void handleCreate({
      type: "financial_independence",
      title: data.title,
      monthlyCostCents: costRaw.toString(),
      realReturnPct: data.realReturnPct,
    });
  }

  const resolvedSeed = isEdit ? null : (seed ?? null);
  const resolvedExisting = isEdit ? existingGoal : null;
  const lockedAsset =
    !isEdit && seed?.type === "savings" && seed.fundingMode === "linked" && seed.linkedAssetId
      ? assets.find((a) => a.id === seed.linkedAssetId)
      : undefined;
  const stepContent =
    goalType === "debt_payoff" ? (
      <DebtPayoffStep
        debts={debts}
        seed={resolvedSeed}
        existingGoal={resolvedExisting}
        onSubmit={handleDebtPayoff}
        loading={loading}
        error={submitError}
      />
    ) : goalType === "emergency_fund" ? (
      <EmergencyFundStep
        seed={resolvedSeed}
        existingGoal={resolvedExisting}
        onSubmit={handleEmergencyFund}
        loading={loading}
        error={submitError}
      />
    ) : goalType === "savings" ? (
      <SavingsStep
        prefill={prefill}
        assets={assets}
        seed={resolvedSeed}
        existingGoal={resolvedExisting}
        onSubmit={handleSavings}
        loading={loading}
        error={submitError}
        showHouseholdNudge={showHouseholdNudge}
        {...(lockedAsset ? { lockedAsset } : {})}
      />
    ) : goalType === "financial_independence" ? (
      <FinancialIndependenceStep
        prefill={prefill}
        seed={resolvedSeed}
        existingGoal={resolvedExisting}
        onSubmit={handleFinancialIndependence}
        loading={loading}
        error={submitError}
      />
    ) : null;

  if (!isEdit && step === "type") {
    return (
      <div className="flex flex-col gap-4">
        <button
          type="button"
          onClick={() => router.push("/app/metas" as Route)}
          className="flex w-fit items-center gap-1.5 text-[0.8125rem] font-semibold text-[color:var(--text-secondary)] transition-colors hover:text-[color:var(--text-primary)]"
        >
          <ArrowLeft size={14} strokeWidth={2.25} aria-hidden />
          Voltar
        </button>
        <h1 className="text-2xl font-bold tracking-tight text-[color:var(--text-primary)] md:text-3xl">
          Qual é o seu objetivo?
        </h1>
        <section className="glass-light p-4">
          <WizardChoiceGroup
            ariaLabel="Qual é o seu objetivo"
            variant="primary"
            value={goalType}
            options={GOAL_TYPES.map((g) => ({
              value: g.type,
              title: g.title,
              description: g.description,
            }))}
            onChange={handleTypeSelect}
          />
        </section>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {!isEdit ? (
        <>
          <button
            type="button"
            onClick={() => setStep("type")}
            className="flex w-fit items-center gap-1.5 text-[0.8125rem] font-semibold text-[color:var(--text-secondary)] transition-colors hover:text-[color:var(--text-primary)]"
          >
            <ArrowLeft size={14} strokeWidth={2.25} aria-hidden />
            Voltar
          </button>
          <h1 className="text-2xl font-bold tracking-tight text-[color:var(--text-primary)] md:text-3xl">
            Nova meta
          </h1>
        </>
      ) : null}
      {stepContent}
    </div>
  );
}
