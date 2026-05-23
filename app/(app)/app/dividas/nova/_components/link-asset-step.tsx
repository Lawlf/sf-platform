"use client";

import { useQuery } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { useId } from "react";
import { Controller, type FieldValues, type UseFormReturn } from "react-hook-form";

import {
  listActiveAssetsForLinking,
  type ActiveAssetPayload,
} from "../_actions/list-active-assets.action";

import { WizardField, wizardInputClass } from "./wizard-field";
import { WizardMoneyField } from "./wizard-money-field";
import { WizardRadioCard } from "./wizard-radio-card";

export type LinkAssetChoice = "unset" | "no" | "existing" | "new";

export type NewAssetCategory = "vehicle" | "real_estate" | "other";

// Campos esperados no form de cada wizard de dívida. O wizard deve registrar pelo
// menos esses fields no schema do react-hook-form para que o passo funcione.
// Os opcionais aceitam `undefined` explicitamente porque o projeto usa
// `exactOptionalPropertyTypes: true`.
export interface LinkAssetFormSlice {
  linkAssetChoice: LinkAssetChoice;
  linkedAssetId?: string | null | undefined;
  linkedAssetAllocationCents?: bigint | null | undefined;
  newAssetCategory?: NewAssetCategory | undefined;
  newAssetLabel?: string | undefined;
  newAssetCurrentValueCents?: bigint | null | undefined;
  newAssetAcquiredAt?: string | null | undefined;
}

const ASSET_CATEGORY_OPTIONS: ReadonlyArray<{
  value: NewAssetCategory;
  title: string;
  description: string;
}> = [
  { value: "vehicle", title: "Veículo", description: "Carro, moto." },
  { value: "real_estate", title: "Imóvel", description: "Casa, apto." },
  { value: "other", title: "Outro", description: "Outro bem." },
];

const ASSET_CATEGORY_LABEL: Record<string, string> = {
  vehicle: "Veículo",
  real_estate: "Imóvel",
  investment: "Investimento",
  cash: "Reserva",
  other: "Outro",
};

export interface LinkAssetStepContentProps<TForm extends FieldValues = LinkAssetFormSlice> {
  // O componente é genérico: aceita qualquer form do react-hook-form que contenha
  // a slice LinkAssetFormSlice. As escritas usam `any` localmente para evitar
  // necessidade de typings exatos por wizard.
  form: UseFormReturn<TForm>;
  // Valor da dívida em centavos. Usado como pré-preenchimento de alocação quando o
  // usuário marca uma única dívida existente.
  debtPrincipalCents: bigint;
  enabled: boolean;
}

export function LinkAssetStepContent<TForm extends FieldValues = LinkAssetFormSlice>({
  form,
  debtPrincipalCents,
  enabled,
}: LinkAssetStepContentProps<TForm>) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const f = form as UseFormReturn<any>;
  const choice = (f.watch("linkAssetChoice") as LinkAssetChoice) ?? "unset";
  const newAssetCategory = f.watch("newAssetCategory") as NewAssetCategory | undefined;
  const linkedAssetId = f.watch("linkedAssetId") as string | null | undefined;

  const labelInputId = useId();
  const valueInputId = useId();
  const acquiredAtInputId = useId();
  const allocationInputId = useId();

  const { data: assets, isLoading } = useQuery<ActiveAssetPayload[]>({
    queryKey: ["active-assets"],
    queryFn: () => listActiveAssetsForLinking(),
    enabled: enabled && choice === "existing",
    staleTime: 30_000,
  });

  function handlePickNo() {
    f.setValue("linkAssetChoice", "no" as LinkAssetChoice, { shouldDirty: true });
    f.setValue("linkedAssetId", null, { shouldDirty: true });
    f.setValue("linkedAssetAllocationCents", null, { shouldDirty: true });
    f.setValue("newAssetCategory", undefined, { shouldDirty: true });
    f.setValue("newAssetLabel", "", { shouldDirty: true });
    f.setValue("newAssetCurrentValueCents", null, { shouldDirty: true });
    f.setValue("newAssetAcquiredAt", null, { shouldDirty: true });
  }

  function handlePickExisting() {
    f.setValue("linkAssetChoice", "existing" as LinkAssetChoice, { shouldDirty: true });
    f.setValue("newAssetCategory", undefined, { shouldDirty: true });
    f.setValue("newAssetLabel", "", { shouldDirty: true });
    f.setValue("newAssetCurrentValueCents", null, { shouldDirty: true });
    f.setValue("newAssetAcquiredAt", null, { shouldDirty: true });
  }

  function handlePickNew() {
    f.setValue("linkAssetChoice", "new" as LinkAssetChoice, { shouldDirty: true });
    f.setValue("linkedAssetId", null, { shouldDirty: true });
    f.setValue("linkedAssetAllocationCents", null, { shouldDirty: true });
  }

  function selectAsset(assetId: string) {
    f.setValue("linkedAssetId", assetId, { shouldDirty: true });
    // Pre-fill: alocação = principal da dívida (caso típico v1: 1 dívida ↔ 1 ativo).
    f.setValue("linkedAssetAllocationCents", debtPrincipalCents, { shouldDirty: true });
  }

  return (
    <>
      <Controller
        control={f.control}
        name="linkAssetChoice"
        render={() => (
          <WizardField label="Vincular a um bem">
            <div className="grid grid-cols-3 gap-2">
              <WizardRadioCard
                title="Não"
                description="Sem bem vinculado."
                active={choice === "no"}
                onSelect={handlePickNo}
              />
              <WizardRadioCard
                title="Já cadastrei"
                description="Escolher da lista."
                active={choice === "existing"}
                onSelect={handlePickExisting}
              />
              <WizardRadioCard
                title="Cadastrar novo"
                description="Criar agora aqui."
                active={choice === "new"}
                onSelect={handlePickNew}
              />
            </div>
          </WizardField>
        )}
      />

      {choice === "existing" ? (
        <div className="flex flex-col gap-2">
          {isLoading ? (
            <div className="flex items-center gap-2 rounded-xl border border-[color:var(--border-soft)] bg-[color:var(--surface-1)] px-3 py-3 text-[0.8125rem] text-[color:var(--text-primary)] opacity-70">
              <Loader2 size={14} strokeWidth={2} className="animate-spin" aria-hidden />
              Carregando bens...
            </div>
          ) : !assets || assets.length === 0 ? (
            <div className="rounded-xl border border-[color:var(--border-soft)] bg-[color:var(--surface-1)] px-3 py-3 text-[0.8125rem] text-[color:var(--text-primary)] opacity-75">
              Nenhum bem ativo encontrado. Escolha &quot;Cadastrar novo&quot; acima ou volte depois.
            </div>
          ) : (
            assets.map((asset) => {
              const selected = linkedAssetId === asset.id;
              return (
                <div
                  key={asset.id}
                  className={`rounded-xl border-[1.5px] p-3 transition-colors ${
                    selected
                      ? "border-[color:var(--color-brand-500)] bg-[color:var(--color-brand-500)]/12"
                      : "border-[color:var(--border-soft)] bg-[color:var(--surface-1)]"
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => selectAsset(asset.id)}
                    aria-pressed={selected}
                    className="flex w-full items-start justify-between gap-2 text-left focus-visible:outline-none"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="text-[0.8125rem] font-bold text-[color:var(--text-primary)]">
                        {asset.label}
                      </div>
                      <div className="mt-0.5 text-[0.6875rem] text-[color:var(--text-primary)] opacity-65">
                        {ASSET_CATEGORY_LABEL[asset.category] ?? asset.category} ·{" "}
                        {asset.currentValue.formatted}
                      </div>
                    </div>
                    <span
                      className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md border-[1.5px] text-[0.6875rem] font-bold ${
                        selected
                          ? "border-[color:var(--color-brand-500)] bg-[color:var(--color-brand-500)] text-white"
                          : "border-[color:var(--border-soft)] bg-[color:var(--surface-1)]"
                      }`}
                      aria-hidden
                    >
                      {selected ? "✓" : ""}
                    </span>
                  </button>

                  {selected ? (
                    <div className="mt-3">
                      <label
                        htmlFor={allocationInputId}
                        className="mb-1 block text-[0.6875rem] font-semibold uppercase tracking-[0.5px] text-[color:var(--text-primary)] opacity-80"
                      >
                        Quanto desta dívida pertence a este bem?
                      </label>
                      <WizardMoneyField
                        control={f.control}
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                        name={"linkedAssetAllocationCents" as any}
                        id={allocationInputId}
                      />
                    </div>
                  ) : null}
                </div>
              );
            })
          )}
        </div>
      ) : null}

      {choice === "new" ? (
        <div className="mt-2 flex flex-col gap-2 rounded-2xl border border-[color:var(--border-soft)] bg-[color:var(--surface-1)] p-3">
          <div className="text-[0.8125rem] font-bold text-[color:var(--text-primary)]">Novo bem</div>
          <div className="text-[0.6875rem] text-[color:var(--text-primary)] opacity-65">
            Vamos cadastrar o bem e já vincular a esta dívida.
          </div>

          <Controller
            control={f.control}
            name="newAssetCategory"
            render={({ field }) => (
              <WizardField label="Tipo do bem">
                <div className="grid grid-cols-3 gap-2">
                  {ASSET_CATEGORY_OPTIONS.map((opt) => (
                    <WizardRadioCard
                      key={opt.value}
                      title={opt.title}
                      description={opt.description}
                      active={field.value === opt.value}
                      onSelect={() => field.onChange(opt.value)}
                    />
                  ))}
                </div>
              </WizardField>
            )}
          />

          {newAssetCategory ? (
            <>
              <WizardField label="Nome do bem" htmlFor={labelInputId}>
                <input
                  id={labelInputId}
                  {...f.register("newAssetLabel")}
                  placeholder="Ex: Honda Civic 2020"
                  className={wizardInputClass}
                />
              </WizardField>

              <WizardField label="Valor atual estimado" htmlFor={valueInputId}>
                <WizardMoneyField
                  control={f.control}
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  name={"newAssetCurrentValueCents" as any}
                  id={valueInputId}
                  placeholder="R$ 0,00"
                />
              </WizardField>

              <WizardField
                label="Data da aquisição (opcional)"
                htmlFor={acquiredAtInputId}
                helper="Quando você comprou o bem. Ajuda a calcular depreciação."
              >
                <input
                  id={acquiredAtInputId}
                  type="date"
                  {...f.register("newAssetAcquiredAt")}
                  className={wizardInputClass}
                />
              </WizardField>
            </>
          ) : null}
        </div>
      ) : null}
    </>
  );
}

// Valida o estado do passo "vincular ativo" e retorna mensagem de erro pronta
// para exibição, ou null se está OK. Centralizado aqui para os wizards reusarem.
export function validateLinkAssetStep(values: LinkAssetFormSlice): string | null {
  const choice = values.linkAssetChoice;
  if (choice === "existing") {
    if (!values.linkedAssetId) return "Escolha um bem da lista.";
    const alloc = values.linkedAssetAllocationCents ?? null;
    if (alloc === null || alloc <= 0n) {
      return "Informe quanto da dívida pertence ao bem.";
    }
  }
  if (choice === "new") {
    if (!values.newAssetCategory) return "Escolha o tipo do bem.";
    const label = (values.newAssetLabel ?? "").trim();
    if (label.length === 0) return "Informe o nome do bem.";
    const value = values.newAssetCurrentValueCents ?? null;
    if (value === null || value <= 0n) return "Informe o valor atual do bem.";
  }
  return null;
}

// Pode prosseguir do passo? Diferente do validador, usa o critério permissivo
// (botão "Próximo" só aparece se já há sinal mínimo de intenção).
export function canAdvanceLinkAssetStep(values: LinkAssetFormSlice): boolean {
  const choice = values.linkAssetChoice;
  if (choice === "unset") return false;
  if (choice === "no") return true;
  if (choice === "existing") {
    if (!values.linkedAssetId) return false;
    const alloc = values.linkedAssetAllocationCents ?? null;
    if (alloc === null || alloc <= 0n) return false;
    return true;
  }
  // new
  if (!values.newAssetCategory) return false;
  const label = (values.newAssetLabel ?? "").trim();
  if (label.length === 0) return false;
  const value = values.newAssetCurrentValueCents ?? null;
  if (value === null || value <= 0n) return false;
  return true;
}
