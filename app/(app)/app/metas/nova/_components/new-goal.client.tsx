"use client";

import { AlertTriangle, ArrowLeft, ChevronDown } from "lucide-react";
import type { Route } from "next";
import { useRouter } from "next/navigation";
import { useId, useState, useTransition } from "react";
import { useForm, useWatch } from "react-hook-form";

import { Button } from "@/app/components/ui/button";

import { MoneyInput } from "../../../_components/money-input";
import { WizardField, wizardInputClass } from "../../../dividas/nova/_components/wizard-field";
import { WizardRadioCard } from "../../../dividas/nova/_components/wizard-radio-card";
import { simSelectClass } from "../../../simular/_components/sim-result";
import { SimSlider } from "../../../simular/_components/sim-slider";
import type { SimPrefill } from "../../../simular/_lib/sim-prefill";
import { createGoalAction } from "../../_actions/goal-actions";

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
}

type GoalTypeChoice = "debt_payoff" | "emergency_fund" | "savings" | "financial_independence";

interface DebtPayoffForm {
  linkedDebtId: string;
  title: string;
}

interface EmergencyFundForm {
  title: string;
  targetMonths: number;
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

// ---- DebtPayoff step -------------------------------------------------------

function DebtPayoffStep({
  debts,
  onSubmit,
  loading,
  error,
}: {
  debts: DebtOption[];
  onSubmit: (data: DebtPayoffForm) => void;
  loading: boolean;
  error: string | null;
}) {
  const form = useForm<DebtPayoffForm>({
    defaultValues: { linkedDebtId: debts[0]?.id ?? "", title: debts[0]?.label ?? "" },
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
    <form
      onSubmit={form.handleSubmit(onSubmit)}
      className="flex flex-col gap-4"
    >
      <section className="glass-light p-4">
        <SectionHeading>Quitar dívida</SectionHeading>
        <div className="flex flex-col gap-3">
          {debts.length === 0 ? (
            <p className="text-[0.8125rem] text-[color:var(--text-secondary)]">
              Você não tem dívidas ativas cadastradas. Cadastre uma dívida primeiro.
            </p>
          ) : (
            <WizardField label="Dívida" htmlFor={selectId}>
              <div className="relative">
                <select
                  id={selectId}
                  className={simSelectClass}
                  value={selectedDebtId}
                  onChange={(e) => handleDebtChange(e.target.value)}
                >
                  {debts.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.label} ({brl(d.balanceCents)})
                    </option>
                  ))}
                </select>
                <ChevronDown
                  size={18}
                  strokeWidth={2}
                  aria-hidden
                  className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[color:var(--text-muted)]"
                />
              </div>
            </WizardField>
          )}
          <WizardField label="Título da meta" htmlFor={titleId} helper="Como você quer chamar essa meta.">
            <input
              id={titleId}
              type="text"
              className={wizardInputClass}
              {...form.register("title", { required: true })}
            />
          </WizardField>
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
        Criar meta
      </Button>
    </form>
  );
}

// ---- EmergencyFund step ----------------------------------------------------

function EmergencyFundStep({
  onSubmit,
  loading,
  error,
}: {
  onSubmit: (data: EmergencyFundForm) => void;
  loading: boolean;
  error: string | null;
}) {
  const form = useForm<EmergencyFundForm>({
    defaultValues: { title: "Reserva de emergência", targetMonths: 6 },
  });
  const targetMonths = useWatch({ control: form.control, name: "targetMonths" }) ?? 6;
  const titleId = useId();

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-4">
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
            O valor alvo será calculado com base nos seus custos mensais cadastrados.
          </p>
        </div>
      </section>
      {error ? <ErrorAlert message={error} /> : null}
      <Button type="submit" variant="brand" size="lg" className="w-full" loading={loading}>
        Criar meta
      </Button>
    </form>
  );
}

// ---- Savings step ----------------------------------------------------------

function SavingsStep({
  prefill,
  assets,
  onSubmit,
  loading,
  error,
}: {
  prefill: SimPrefill;
  assets: AssetOption[];
  onSubmit: (data: SavingsForm) => void;
  loading: boolean;
  error: string | null;
}) {
  const form = useForm<SavingsForm>({
    defaultValues: {
      title: "",
      targetCents: 0n as unknown as bigint,
      deadlineIso: "",
      fundingMode: "manual",
      linkedAssetId: assets[0]?.id ?? "",
      manualSavedCents: BigInt(prefill.cashReserveCents),
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
            <input
              id={titleId}
              type="text"
              className={wizardInputClass}
              placeholder="Ex: Viagem, entrada do carro..."
              {...form.register("title", { required: true })}
            />
          </WizardField>
          <MoneyInput
            control={form.control}
            name="targetCents"
            label="Valor alvo"
            required
            helper="Quanto você quer ter guardado."
          />
          <WizardField label="Prazo (opcional)" htmlFor={deadlineId} helper="Deixe em branco para sem prazo definido.">
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
                description="Ligado a um ativo cadastrado."
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
                <div className="relative">
                  <select
                    id={assetSelectId}
                    className={simSelectClass}
                    {...form.register("linkedAssetId")}
                  >
                    {assets.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.label} ({brl(a.valueCents)})
                      </option>
                    ))}
                  </select>
                  <ChevronDown
                    size={18}
                    strokeWidth={2}
                    aria-hidden
                    className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[color:var(--text-muted)]"
                  />
                </div>
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
      {error ? <ErrorAlert message={error} /> : null}
      <Button type="submit" variant="brand" size="lg" className="w-full" loading={loading}>
        Criar meta
      </Button>
    </form>
  );
}

// ---- FinancialIndependence step --------------------------------------------

function FinancialIndependenceStep({
  prefill,
  onSubmit,
  loading,
  error,
}: {
  prefill: SimPrefill;
  onSubmit: (data: FinancialIndependenceForm) => void;
  loading: boolean;
  error: string | null;
}) {
  const form = useForm<FinancialIndependenceForm>({
    defaultValues: {
      title: "Independência financeira",
      monthlyCostCents: BigInt(prefill.incomeCents),
      realReturnPct: 4,
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
            Rendimento real = rendimento nominal descontado da inflação. 4% é uma referência
            conservadora para renda passiva sustentável.
          </p>
        </div>
      </section>
      {error ? <ErrorAlert message={error} /> : null}
      <Button type="submit" variant="brand" size="lg" className="w-full" loading={loading}>
        Criar meta
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
  { type: "debt_payoff", title: "Quitar uma dívida", description: "Elimine um passivo do seu patrimônio." },
  { type: "emergency_fund", title: "Reserva de emergência", description: "Meses de custo de vida guardados." },
  { type: "savings", title: "Juntar um valor", description: "Viagem, entrada, projeto, qualquer meta." },
  { type: "financial_independence", title: "Independência", description: "Viver de renda passiva." },
];

export function NewGoal({ prefill, debts, assets }: NewGoalProps) {
  const router = useRouter();
  const [step, setStep] = useState<1 | 2>(1);
  const [goalType, setGoalType] = useState<GoalTypeChoice | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [, startTransition] = useTransition();
  const [loading, setLoading] = useState(false);

  function handleTypeSelect(t: GoalTypeChoice) {
    setGoalType(t);
    setStep(2);
    setSubmitError(null);
  }

  function handleBack() {
    setStep(1);
    setSubmitError(null);
  }

  async function handleCreate(input: Parameters<typeof createGoalAction>[0]) {
    setLoading(true);
    setSubmitError(null);
    startTransition(async () => {
      const result = await createGoalAction(input);
      setLoading(false);
      if (result.ok && result.goalId) {
        router.push(`/app/metas/${result.goalId}` as Route);
      } else {
        setSubmitError(result.message ?? "Erro ao criar meta. Tente novamente.");
      }
    });
  }

  function handleDebtPayoff(data: DebtPayoffForm) {
    void handleCreate({
      type: "debt_payoff",
      title: data.title,
      linkedDebtId: data.linkedDebtId || null,
    });
  }

  function handleEmergencyFund(data: EmergencyFundForm) {
    void handleCreate({
      type: "emergency_fund",
      title: data.title,
      targetMonths: data.targetMonths,
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
      linkedAssetId: data.fundingMode === "linked" ? (data.linkedAssetId || null) : null,
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

  if (step === 1) {
    return (
      <div className="flex flex-col gap-4">
        <section className="glass-light p-4">
          <SectionHeading>Qual é o seu objetivo?</SectionHeading>
          <div className="grid grid-cols-2 gap-2">
            {GOAL_TYPES.map((g) => (
              <WizardRadioCard
                key={g.type}
                title={g.title}
                description={g.description}
                active={goalType === g.type}
                onSelect={() => handleTypeSelect(g.type)}
              />
            ))}
          </div>
        </section>
      </div>
    );
  }

  const stepContent =
    goalType === "debt_payoff" ? (
      <DebtPayoffStep
        debts={debts}
        onSubmit={handleDebtPayoff}
        loading={loading}
        error={submitError}
      />
    ) : goalType === "emergency_fund" ? (
      <EmergencyFundStep onSubmit={handleEmergencyFund} loading={loading} error={submitError} />
    ) : goalType === "savings" ? (
      <SavingsStep
        prefill={prefill}
        assets={assets}
        onSubmit={handleSavings}
        loading={loading}
        error={submitError}
      />
    ) : goalType === "financial_independence" ? (
      <FinancialIndependenceStep
        prefill={prefill}
        onSubmit={handleFinancialIndependence}
        loading={loading}
        error={submitError}
      />
    ) : null;

  if (!stepContent) return null;

  return (
    <div className="flex flex-col gap-3">
      <button
        type="button"
        onClick={handleBack}
        className="focus-ring inline-flex w-fit items-center gap-1.5 rounded-lg px-1 py-1 text-[0.8125rem] font-semibold text-[color:var(--text-secondary)] transition-colors hover:text-[color:var(--text-primary)]"
      >
        <ArrowLeft size={16} strokeWidth={2} aria-hidden />
        Trocar tipo de meta
      </button>
      {stepContent}
    </div>
  );
}
