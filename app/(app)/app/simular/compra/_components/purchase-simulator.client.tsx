"use client";

import { Coins, Receipt, TrendingDown, TrendingUp } from "lucide-react";
import { useRouter } from "next/navigation";
import { useId, useMemo, useState, useTransition } from "react";
import { useForm, useWatch } from "react-hook-form";

import { Button } from "@/app/components/ui/button";
import { PurchaseSimulationService } from "@/domain/services/purchase-simulation.service";

import { MoneyInput } from "../../../_components/money-input";
import { WizardField, wizardInputClass } from "../../../dividas/nova/_components/wizard-field";
import { WizardRadioCard } from "../../../dividas/nova/_components/wizard-radio-card";
import { savePurchaseAction } from "../_actions/save-purchase.action";

const DEFAULT_AMOUNT_CENTS = 800_000n; // R$ 8.000,00
const DEFAULT_MONTHS = 24;
const DEFAULT_DEP = 25;
const DEFAULT_OPP = 12;

interface FormValues {
  amountCents: bigint;
}

function brl(cents: bigint): string {
  const negative = cents < 0n;
  const abs = negative ? -cents : cents;
  const reais = Number(abs) / 100;
  return `${negative ? "-" : ""}${reais.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}`;
}

type AssetCategoryUi = "vehicle" | "real_estate" | "investment" | "cash" | "other";
type ExpenseCategoryUi =
  | "housing"
  | "utilities"
  | "food"
  | "transport"
  | "health"
  | "leisure"
  | "subscriptions"
  | "education"
  | "other";
type DepreciationKindUi = "appreciating" | "stable" | "depreciating" | "consumable";
type PaymentMethodUi = "cash" | "card";

const ASSET_CATEGORY_META: Record<AssetCategoryUi, { title: string; description: string }> = {
  vehicle: { title: "Veículo", description: "Carro, moto..." },
  real_estate: { title: "Imóvel", description: "Casa, apto..." },
  investment: { title: "Investimento", description: "RF, ações..." },
  cash: { title: "Reserva", description: "Conta, poupança." },
  other: { title: "Outro", description: "Qualquer bem." },
};

const EXPENSE_CATEGORY_META: Record<ExpenseCategoryUi, { title: string; description: string }> = {
  housing: { title: "Moradia", description: "Aluguel, condomínio." },
  utilities: { title: "Contas", description: "Luz, água, internet." },
  food: { title: "Alimentação", description: "Mercado, refeições." },
  transport: { title: "Transporte", description: "Combustível, app." },
  health: { title: "Saúde", description: "Plano, remédios." },
  leisure: { title: "Lazer", description: "Passeios, hobbies." },
  subscriptions: { title: "Assinaturas", description: "Streaming, apps." },
  education: { title: "Educação", description: "Cursos, livros." },
  other: { title: "Outros", description: "Demais despesas." },
};

function defaultDepKindForCategory(category: AssetCategoryUi): DepreciationKindUi {
  if (category === "real_estate") return "appreciating";
  if (category === "investment" || category === "cash") return "stable";
  return "depreciating";
}

function todayIso(): string {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

export function PurchaseSimulatorClient() {
  const router = useRouter();
  const assetLabelId = useId();
  const purchaseDateId = useId();

  const form = useForm<FormValues>({
    defaultValues: { amountCents: DEFAULT_AMOUNT_CENTS },
  });
  const amountCentsRaw = useWatch({ control: form.control, name: "amountCents" });
  const amountCents = normalizeCents(amountCentsRaw);

  const [months, setMonths] = useState<number>(DEFAULT_MONTHS);
  const [depRate, setDepRate] = useState<number>(DEFAULT_DEP);
  const [oppRate, setOppRate] = useState<number>(DEFAULT_OPP);

  // Registro de compra
  const [showSaveForm, setShowSaveForm] = useState(false);
  const [assetLabel, setAssetLabel] = useState("");
  const [assetCategory, setAssetCategory] = useState<AssetCategoryUi>("other");
  const [expenseCategory, setExpenseCategory] = useState<ExpenseCategoryUi>("leisure");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethodUi>("cash");
  const [purchaseDate, setPurchaseDate] = useState<string>(todayIso());
  const [serverError, setServerError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const result = useMemo(
    () =>
      PurchaseSimulationService.simulate({
        amountCents,
        monthsHorizon: months,
        depreciationRatePctYear: depRate,
        opportunityRatePctYear: oppRate,
      }),
    [amountCents, months, depRate, oppRate],
  );

  return (
    <div className="flex flex-col gap-4">
      <section className="glass-light p-4">
        <h2 className="mb-3 text-[0.6875rem] font-bold uppercase tracking-[0.6px] text-[color:var(--color-brand-800)]">
          Dados da simulação
        </h2>

        <div className="flex flex-col gap-3">
          <MoneyInput control={form.control} name="amountCents" label="Valor da compra" required />

          <SliderField
            id="months"
            label="Horizonte"
            value={months}
            min={3}
            max={60}
            step={1}
            displayValue={`${months} meses`}
            onChange={setMonths}
          />

          <SliderField
            id="dep"
            label="Depreciação anual esperada"
            value={depRate}
            min={0}
            max={50}
            step={1}
            displayValue={`${depRate}% ao ano`}
            onChange={setDepRate}
          />

          <SliderField
            id="opp"
            label="Rendimento alternativo (CDI)"
            value={oppRate}
            min={6}
            max={20}
            step={0.5}
            displayValue={`${oppRate}% ao ano`}
            onChange={setOppRate}
          />
        </div>
      </section>

      <section className="grid gap-3 md:grid-cols-3">
        <ScenarioCard
          tone="negative"
          icon={TrendingDown}
          title="Comprou e manteve"
          headline={brl(result.scenarioKeep.finalValueCents)}
          subline={`Em ${months} meses, vale isso.`}
          detail={`Perda ${brl(result.scenarioKeep.netLossCents)}`}
        />
        <ScenarioCard
          tone="neutral"
          icon={Receipt}
          title="Comprou e revendeu"
          headline={brl(result.scenarioResell.finalValueCents)}
          subline={`Recuperação se revender em ${months} meses.`}
          detail={`Custo real ${brl(result.scenarioResell.realCostCents)}`}
        />
        <ScenarioCard
          tone="positive"
          icon={TrendingUp}
          title="Investiu em CDI"
          headline={brl(result.scenarioInvest.finalValueCents)}
          subline={`Mesmo valor rendendo ${oppRate}% ao ano.`}
          detail={`Lucro ${brl(result.scenarioInvest.profitCents)}`}
        />
      </section>

      <section className="rounded-2xl bg-[linear-gradient(135deg,#ef7a1a,#f28e25)] p-4 text-white shadow-[0_14px_32px_rgba(239,122,26,0.30)]">
        <div className="flex items-center justify-between gap-3">
          <div>
            <span className="text-[0.625rem] font-bold uppercase tracking-[0.7px] text-white/85">
              Custo de oportunidade
            </span>
            <div className="mt-1 text-[1.625rem] font-extrabold leading-none md:text-[1.875rem]">
              {brl(result.opportunityCostCents)}
            </div>
            <p className="mt-2 text-[0.75rem] font-medium text-white/85">
              Diferença entre investir e comprar e manter.
            </p>
          </div>
          <Coins size={38} strokeWidth={1.5} className="shrink-0 text-white/85" aria-hidden />
        </div>
      </section>

      {showSaveForm ? null : (
        <Button
          type="button"
          variant="outline"
          onClick={() => {
            setShowSaveForm(true);
            setServerError(null);
          }}
          aria-label="Registrar essa compra"
          className="w-full"
        >
          Registrar essa compra
        </Button>
      )}

      {showSaveForm ? (
        <section className="glass-light p-4">
          <div className="mb-3 flex items-start justify-between gap-3">
            <div>
              <h2 className="text-[0.6875rem] font-bold uppercase tracking-[0.6px] text-[color:var(--color-brand-800)]">
                Registrar como compra
              </h2>
              <p className="mt-1 text-[0.75rem] text-[color:var(--text-secondary)]">
                Cria um ativo no seu patrimônio.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShowSaveForm(false)}
              className="text-[0.75rem] font-semibold text-[color:var(--text-secondary)] underline-offset-2 hover:underline"
            >
              Cancelar
            </button>
          </div>

          <form
            noValidate
            onSubmit={(e) => {
              e.preventDefault();
              setServerError(null);
              if (paymentMethod !== "cash") {
                setServerError("Apenas 'À vista' está disponível por enquanto.");
                return;
              }
              if (assetLabel.trim().length === 0) {
                setServerError("Informe um nome para o ativo.");
                return;
              }
              if (amountCents <= 0n) {
                setServerError("Valor da compra deve ser maior que zero.");
                return;
              }

              const fd = new FormData();
              fd.set("assetLabel", assetLabel.trim());
              fd.set("assetCategory", assetCategory);
              fd.set("amountCents", amountCents.toString());
              fd.set("depreciationKind", defaultDepKindForCategory(assetCategory));
              fd.set("depreciationRatePctYear", String(depRate));
              fd.set("purchaseDate", purchaseDate);
              fd.set("expenseCategory", expenseCategory);
              fd.set("paymentMethod", paymentMethod);

              startTransition(async () => {
                const r = await savePurchaseAction(fd);
                if (r.ok) {
                  router.push("/app/patrimonio");
                } else {
                  setServerError(r.message);
                }
              });
            }}
            className="flex flex-col gap-3"
          >
            <WizardField label="Nome do ativo" htmlFor={assetLabelId}>
              <input
                id={assetLabelId}
                type="text"
                value={assetLabel}
                onChange={(e) => setAssetLabel(e.target.value)}
                placeholder="Ex: iPhone 17 Pro Max"
                required
                maxLength={120}
                className={wizardInputClass}
              />
            </WizardField>

            <WizardField label="Categoria do ativo">
              <div className="grid grid-cols-2 gap-2 md:grid-cols-5">
                {(Object.keys(ASSET_CATEGORY_META) as AssetCategoryUi[]).map((c) => (
                  <WizardRadioCard
                    key={c}
                    title={ASSET_CATEGORY_META[c].title}
                    description={ASSET_CATEGORY_META[c].description}
                    active={assetCategory === c}
                    onSelect={() => setAssetCategory(c)}
                  />
                ))}
              </div>
            </WizardField>

            <WizardField label="Categoria da despesa">
              <div className="grid grid-cols-2 gap-2 md:grid-cols-3">
                {(Object.keys(EXPENSE_CATEGORY_META) as ExpenseCategoryUi[]).map((c) => (
                  <WizardRadioCard
                    key={c}
                    title={EXPENSE_CATEGORY_META[c].title}
                    description={EXPENSE_CATEGORY_META[c].description}
                    active={expenseCategory === c}
                    onSelect={() => setExpenseCategory(c)}
                  />
                ))}
              </div>
            </WizardField>

            <WizardField label="Data da compra" htmlFor={purchaseDateId}>
              <input
                id={purchaseDateId}
                type="date"
                value={purchaseDate}
                onChange={(e) => setPurchaseDate(e.target.value)}
                required
                className={wizardInputClass}
              />
            </WizardField>

            <WizardField label="Forma de pagamento">
              <div className="grid grid-cols-2 gap-2">
                <WizardRadioCard
                  title="À vista"
                  description="Pagamento imediato."
                  active={paymentMethod === "cash"}
                  onSelect={() => setPaymentMethod("cash")}
                />
                <DisabledRadioCard title="Cartão parcelado" description="Em breve" />
              </div>
            </WizardField>

            {serverError ? (
              <div
                role="alert"
                className="rounded-xl border border-[color:var(--semantic-negative)]/30 bg-[color:var(--semantic-negative)]/10 px-3 py-2 text-[0.8125rem] text-[color:var(--semantic-negative)]"
              >
                {serverError}
              </div>
            ) : null}

            <Button type="submit" variant="brand" loading={pending} className="w-full">
              Confirmar registro
            </Button>
          </form>
        </section>
      ) : null}
    </div>
  );
}

function DisabledRadioCard({ title, description }: { title: string; description: string }) {
  return (
    <button
      type="button"
      disabled
      aria-pressed={false}
      className="cursor-not-allowed rounded-xl border-[1.5px] border-[color:var(--border-soft)] bg-[color:var(--surface-2)]/60 p-3 text-center opacity-70"
    >
      <div className="text-[0.8125rem] font-bold text-[color:var(--text-muted)]">{title}</div>
      <div className="mt-0.5 text-[0.625rem] text-[color:var(--text-muted)]">{description}</div>
    </button>
  );
}

function normalizeCents(value: unknown): bigint {
  if (typeof value === "bigint") return value;
  if (typeof value === "number" && Number.isFinite(value)) return BigInt(Math.round(value));
  if (typeof value === "string" && value !== "") {
    try {
      return BigInt(value);
    } catch {
      return 0n;
    }
  }
  return 0n;
}

interface SliderFieldProps {
  id: string;
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  displayValue: string;
  onChange: (v: number) => void;
}

function SliderField({
  id,
  label,
  value,
  min,
  max,
  step,
  displayValue,
  onChange,
}: SliderFieldProps) {
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between">
        <label
          htmlFor={id}
          className="text-[0.6875rem] font-bold uppercase tracking-[0.5px] text-[color:var(--text-secondary)]"
        >
          {label}
        </label>
        <span className="text-[0.75rem] font-bold text-[color:var(--color-brand-800)]">
          {displayValue}
        </span>
      </div>
      <input
        id={id}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="h-2 w-full cursor-pointer appearance-none rounded-full bg-[color:var(--surface-2)] accent-[color:var(--color-brand-500)]"
      />
    </div>
  );
}

interface ScenarioCardProps {
  tone: "positive" | "negative" | "neutral";
  icon: React.ComponentType<{
    size?: number;
    strokeWidth?: number;
    className?: string;
    "aria-hidden"?: boolean;
  }>;
  title: string;
  headline: string;
  subline: string;
  detail: string;
}

function ScenarioCard({ tone, icon: Icon, title, headline, subline, detail }: ScenarioCardProps) {
  const pillClasses =
    tone === "positive"
      ? "bg-[color:var(--semantic-positive)]/[0.14] text-[color:var(--semantic-positive)]"
      : tone === "negative"
        ? "bg-[color:var(--semantic-negative)]/[0.14] text-[color:var(--semantic-negative)]"
        : "bg-[color:var(--color-brand-500)]/[0.14] text-[color:var(--color-brand-800)]";
  const headlineColor =
    tone === "positive"
      ? "text-[color:var(--semantic-positive)]"
      : tone === "negative"
        ? "text-[color:var(--semantic-negative)]"
        : "text-[color:var(--text-primary)]";

  return (
    <article className="glass-light p-4">
      <div className="flex items-center gap-2">
        <span
          className={`flex h-8 w-8 items-center justify-center rounded-lg ${pillClasses}`}
          aria-hidden
        >
          <Icon size={16} strokeWidth={2} />
        </span>
        <h3 className="text-[0.75rem] font-bold text-[color:var(--text-primary)]">{title}</h3>
      </div>
      <div className={`mt-3 text-[1.375rem] font-extrabold leading-none ${headlineColor}`}>
        {headline}
      </div>
      <p className="mt-2 text-[0.6875rem] text-[color:var(--text-secondary)]">{subline}</p>
      <p className="mt-1 text-[0.6875rem] font-bold text-[color:var(--text-primary)]">{detail}</p>
    </article>
  );
}
