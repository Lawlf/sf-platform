"use client";

import { useEffect, useId, useState } from "react";
import { Controller } from "react-hook-form";

import { valueCryptoCents } from "@/domain/services/crypto-valuation.service";
import { formatCents } from "@/shared/format/money-format";

import { HowItWorksSheet } from "../../../../_components/how-it-works-sheet";
import { WizardField, wizardInputClass } from "@/ui/wizard-field";
import { WizardMoneyField } from "../../../../dividas/nova/_components/wizard-money-field";
import { WizardRadioCard } from "@/ui/wizard-radio-card";
import { WizardShell, type WizardStep } from "../../../../dividas/nova/_components/wizard-shell";
import {
  YIELD_TYPES,
  defaultRateForKind,
  shouldShowDepreciationSection,
  type AssetWizardForm,
  type DepreciationKind,
  type YieldType,
} from "../asset-wizard.client";

import { CryptoCombobox } from "./crypto-combobox";
import { TickerCombobox } from "./ticker-combobox";

const DEPRECIATION_KINDS: readonly DepreciationKind[] = [
  "appreciating",
  "stable",
  "depreciating",
  "consumable",
];

const DEPRECIATION_KIND_META: Record<DepreciationKind, { title: string; description: string }> = {
  appreciating: { title: "Valoriza", description: "Imóveis bem localizados, terrenos." },
  stable: { title: "Fica igual", description: "Investimentos, ouro, conta poupança." },
  depreciating: { title: "Perde valor", description: "Carros, eletrônicos, móveis." },
  consumable: { title: "Acaba", description: "Viagens, eventos, refeições caras." },
};

const YIELD_TYPE_META: Record<YieldType, { title: string; description: string }> = {
  none: { title: "Não rende", description: "Conta corrente, dinheiro vivo." },
  cdi: { title: "% do CDI", description: "Ex: 100% CDI, 110% CDI." },
  fixed_pct_year: { title: "Taxa fixa", description: "Ex: 8,5% ao ano." },
};

export interface DetailsStepProps {
  form: AssetWizardForm;
  visualStep: WizardStep;
  onBack: () => void;
  onNext: () => void;
  nextIcon: React.ReactNode;
  totalSteps?: number;
}

export function DetailsStep({
  form,
  visualStep,
  onBack,
  onNext,
  nextIcon,
  totalSteps,
}: DetailsStepProps) {
  const labelInputId = useId();
  const valueInputId = useId();
  const purchasePriceId = useId();
  const acquiredAtId = useId();
  const brandId = useId();
  const modelId = useId();
  const yearId = useId();
  const colorId = useId();
  const cityId = useId();
  const sqmId = useId();
  const rentId = useId();
  const institutionId = useId();
  const cashInstitutionId = useId();
  const yieldRatePctId = useId();
  const descriptionId = useId();
  const depreciationRateId = useId();
  const tickerId = useId();
  const sharesId = useId();
  const cryptoQtyId = useId();
  const fixedRateId = useId();
  const [showValueCurve, setShowValueCurve] = useState(false);
  const [showMoreFields, setShowMoreFields] = useState(false);
  const [showRate, setShowRate] = useState(false);
  const [showCryptoExtra, setShowCryptoExtra] = useState(() => {
    const avg = form.getValues("avgPriceCents");
    return avg != null && avg > 0n;
  });
  const [showRename, setShowRename] = useState(false);
  const avgPriceId = useId();
  const cryptoPriceId = useId();

  const category = form.watch("category");
  const investmentType = form.watch("investmentType");
  const currency = form.watch("currency");
  const yieldType = form.watch("yieldType");
  const ticker = form.watch("ticker");
  const lastQuoteCents = form.watch("lastQuoteCents");
  const tickerCompanyName = form.watch("tickerCompanyName");
  const cryptoSharesRaw = form.watch("shares");
  const cryptoCoinId = form.watch("coinId");
  const cryptoAvgCents = form.watch("avgPriceCents");
  const isCrypto = category === "investment" && investmentType === "crypto";
  const cryptoCoinSelected = isCrypto && typeof cryptoCoinId === "string" && cryptoCoinId.length > 0;
  const cryptoQtyNum = cryptoSharesRaw
    ? Number.parseFloat(cryptoSharesRaw.replace(",", "."))
    : Number.NaN;
  const cryptoQtyValid = Number.isFinite(cryptoQtyNum) && cryptoQtyNum > 0;
  const cryptoCurrentTotalCents =
    isCrypto && lastQuoteCents != null && cryptoQtyValid
      ? valueCryptoCents(cryptoQtyNum, lastQuoteCents)
      : null;
  const cryptoPaidTotalCents =
    isCrypto && cryptoAvgCents != null && cryptoAvgCents > 0n && cryptoQtyValid
      ? valueCryptoCents(cryptoQtyNum, cryptoAvgCents)
      : null;
  const errors = form.formState.errors;

  useEffect(() => {
    if (!isCrypto) return;
    if (cryptoCurrentTotalCents !== null) {
      form.setValue("currentValueCents", cryptoCurrentTotalCents, { shouldDirty: true });
    }
    form.setValue("purchasePriceCents", cryptoPaidTotalCents, { shouldDirty: true });
  }, [isCrypto, cryptoCurrentTotalCents, cryptoPaidTotalCents, form]);

  function handleYieldTypeChange(next: YieldType) {
    form.setValue("yieldType", next, { shouldDirty: true });
    if (next === "cdi") {
      const current = form.getValues("yieldRatePct");
      if (!current || current.trim() === "") {
        form.setValue("yieldRatePct", "100", { shouldDirty: false });
      }
    } else if (next === "none") {
      form.setValue("yieldRatePct", "", { shouldDirty: false });
    }
  }

  async function handleNext() {
    const valid = await form.trigger(["label"]);
    if (!valid) return;
    onNext();
  }

  const description =
    category === "investment" && investmentType === "stocks"
      ? "O código da ação (tipo PETR4), quantas você tem e quanto pagou em média."
      : category === "vehicle"
        ? "Marca, modelo e ano (opcionais) ajudam a identificar."
        : category === "real_estate"
          ? "Cidade e aluguel mensal (opcionais)."
          : category === "cash"
            ? "Onde está e se rende algum juros."
            : category === "investment"
              ? "Instituição e descrição."
              : "Detalhes do bem.";

  return (
    <WizardShell
      currentStep={visualStep}
      title="Detalhes do bem"
      description={description}
      onBack={onBack}
      totalSteps={totalSteps}
      primary={{
        label: "Próximo",
        onClick: () => {
          void handleNext();
        },
        icon: nextIcon,
      }}
    >
      {/* Nome universal primeiro — exceto cripto, onde o nome vem depois da
          busca da moeda (auto-preenchido e editável). */}
      {isCrypto ? null : (
        <WizardField label="Nome" htmlFor={labelInputId} error={errors.label?.message}>
          <input
            id={labelInputId}
            {...form.register("label")}
            placeholder={
              category === "vehicle"
                ? "Ex: Honda Civic 2020"
                : category === "real_estate"
                  ? "Ex: Apto Vila Mariana"
                  : category === "investment"
                    ? investmentType === "stocks"
                      ? "Ex: Carteira de ações"
                      : "Ex: Tesouro IPCA+ 2035"
                    : category === "cash"
                      ? "Ex: Saldo Nubank"
                      : "Ex: Playstation 6"
            }
            className={wizardInputClass}
          />
        </WizardField>
      )}

      {/* Stocks-specific fields: ticker combobox + quantity + average price */}
      {category === "investment" && investmentType === "stocks" ? (
        <section className="flex flex-col gap-3 rounded-2xl border border-[color:var(--border-soft)] bg-[color:var(--surface-1)] p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="text-[0.8125rem] font-semibold text-[color:var(--text-primary)]">
                Ação (B3)
              </div>
              <div className="mt-1 text-[0.6875rem] text-[color:var(--text-primary)] opacity-60">
                Procure pelo ticker ou nome da empresa. A cotação salva aparece ao lado.
              </div>
            </div>
            <HowItWorksSheet topic="acoes" variant="brand" />
          </div>

          <WizardField label="Ticker" htmlFor={tickerId} error={errors.ticker?.message}>
            <TickerCombobox
              id={tickerId}
              value={ticker ?? ""}
              onChangeText={(text) => {
                form.setValue("ticker", text, { shouldDirty: true, shouldValidate: false });
                form.setValue("lastQuoteCents", null, { shouldDirty: false });
                form.setValue("tickerCompanyName", "", { shouldDirty: false });
              }}
              onSelect={(selected, lastPrice, companyName) => {
                form.setValue("ticker", selected, { shouldDirty: true, shouldValidate: true });
                form.setValue("lastQuoteCents", lastPrice, { shouldDirty: false });
                form.setValue("tickerCompanyName", companyName ?? "", { shouldDirty: false });
              }}
              ariaInvalid={Boolean(errors.ticker)}
            />
          </WizardField>

          {tickerCompanyName || (lastQuoteCents !== null && lastQuoteCents !== undefined) ? (
            <div className="-mt-2 mb-1 rounded-xl border border-[color:var(--border-soft)] bg-[color:var(--surface-1)] px-3 py-2 text-[0.75rem] text-[color:var(--text-primary)]">
              {tickerCompanyName ? <div className="font-semibold">{tickerCompanyName}</div> : null}
              {lastQuoteCents !== null && lastQuoteCents !== undefined ? (
                <div className="text-[0.6875rem] opacity-75">
                  Última cotação salva: {formatCents(lastQuoteCents)}
                </div>
              ) : null}
            </div>
          ) : null}

          <WizardField
            label="Quantidade de ações"
            htmlFor={sharesId}
            error={errors.shares?.message}
          >
            <input
              id={sharesId}
              type="number"
              inputMode="numeric"
              step={1}
              min={1}
              {...form.register("shares")}
              placeholder="100"
              className={wizardInputClass}
            />
          </WizardField>

          <WizardField
            label="Preço médio de compra (por ação)"
            htmlFor={avgPriceId}
            helper="Quanto você pagou em média por cada ação."
          >
            <WizardMoneyField
              control={form.control}
              name="avgPriceCents"
              id={avgPriceId}
              placeholder="R$ 0,00"
            />
          </WizardField>

          <button
            type="button"
            onClick={() => {
              form.setValue("ticker", "", { shouldDirty: false, shouldValidate: false });
              form.setValue("lastQuoteCents", null, { shouldDirty: false });
              form.setValue("tickerCompanyName", "", { shouldDirty: false });
              form.setValue("investmentType", "other", { shouldDirty: true });
            }}
            className="focus-ring w-fit text-[0.75rem] font-semibold text-[color:var(--color-brand-500)] hover:underline"
          >
            Não sei os detalhes, só sei quanto vale
          </button>
        </section>
      ) : null}

      {/* Cripto: busca primeiro; preço editável; nome atrás de "Renomear". */}
      {isCrypto ? (
        <>
          <WizardField label="Qual moeda?" htmlFor={tickerId} error={errors.ticker?.message}>
            <CryptoCombobox
              id={tickerId}
              value={ticker ?? ""}
              onChangeText={(text) => {
                form.setValue("ticker", text, { shouldDirty: true, shouldValidate: false });
                form.setValue("coinId", "", { shouldDirty: false });
                form.setValue("lastQuoteCents", null, { shouldDirty: false });
                form.setValue("tickerCompanyName", "", { shouldDirty: false });
              }}
              onSelect={(symbol, coinId, unitPriceCents, name) => {
                form.setValue("ticker", symbol, { shouldDirty: true, shouldValidate: true });
                form.setValue("coinId", coinId, { shouldDirty: true });
                form.setValue("lastQuoteCents", unitPriceCents, { shouldDirty: false });
                form.setValue("tickerCompanyName", name ?? "", { shouldDirty: false });
                if (name) form.setValue("label", name, { shouldDirty: true });
              }}
              ariaInvalid={Boolean(errors.ticker)}
            />
          </WizardField>

          {!cryptoCoinSelected ? (
            <button
              type="button"
              onClick={() => {
                form.setValue("ticker", "", { shouldDirty: false, shouldValidate: false });
                form.setValue("coinId", "", { shouldDirty: false });
                form.setValue("shares", "", { shouldDirty: false });
                form.setValue("investmentType", "other", { shouldDirty: true });
              }}
              className="focus-ring -mt-1 w-fit text-[0.75rem] font-semibold text-[color:var(--color-brand-500)] hover:underline"
            >
              Não acho minha moeda
            </button>
          ) : null}

          <WizardField
            label="Quanto você tem"
            htmlFor={cryptoQtyId}
            error={errors.shares?.message}
            helper="Em moedas, não em reais."
          >
            <input
              id={cryptoQtyId}
              type="number"
              inputMode="decimal"
              step="any"
              min={0}
              {...form.register("shares")}
              placeholder="Ex: 0,2"
              className={wizardInputClass}
            />
          </WizardField>

          {cryptoCoinSelected ? (
            <WizardField
              label="Preço da moeda hoje"
              htmlFor={cryptoPriceId}
              helper="A gente já buscou. Mude se estiver diferente onde você comprou."
            >
              <WizardMoneyField
                control={form.control}
                name="lastQuoteCents"
                id={cryptoPriceId}
                placeholder="R$ 0,00"
              />
            </WizardField>
          ) : null}

          {cryptoCurrentTotalCents !== null ? (
            <div className="glass-tier-1 relative overflow-hidden px-4 py-3 text-white">
              <div
                className="absolute -bottom-8 -right-6 h-24 w-24 rounded-full bg-white/[0.12]"
                aria-hidden
              />
              <div className="relative text-[0.625rem] font-semibold uppercase tracking-wide opacity-90">
                Valor atual
              </div>
              <div className="relative mt-1 text-[1.5rem] font-extrabold leading-none">
                {formatCents(cryptoCurrentTotalCents)}
              </div>
              <div className="relative mt-1 text-[0.6875rem] opacity-80">
                {cryptoSharesRaw} {(ticker ?? "").toUpperCase()} pela cotação de hoje
              </div>
            </div>
          ) : null}

          {cryptoCoinSelected ? (
            showRename ? (
              <WizardField label="Nome" htmlFor={labelInputId} error={errors.label?.message}>
                <input
                  id={labelInputId}
                  {...form.register("label")}
                  placeholder="Ex: Minha cripto da reserva"
                  className={wizardInputClass}
                />
              </WizardField>
            ) : (
              <button
                type="button"
                onClick={() => setShowRename(true)}
                className="focus-ring w-fit text-[0.75rem] font-semibold text-[color:var(--color-brand-500)] hover:underline"
              >
                Renomear
              </button>
            )
          ) : null}
        </>
      ) : null}

      {(category === "vehicle" || category === "real_estate") && !showMoreFields ? (
        <button
          type="button"
          onClick={() => setShowMoreFields(true)}
          className="focus-ring w-fit text-[0.8125rem] font-semibold text-[color:var(--color-brand-500)] hover:underline"
        >
          {category === "vehicle"
            ? "Adicionar detalhes (marca, modelo, ano)"
            : "Adicionar detalhes (cidade, m², aluguel)"}
        </button>
      ) : null}

      {/* Vehicle fields */}
      {category === "vehicle" && showMoreFields ? (
        <>
          <WizardField label="Marca (opcional)" htmlFor={brandId}>
            <input
              id={brandId}
              {...form.register("brand")}
              placeholder="Ex: Honda"
              className={wizardInputClass}
            />
          </WizardField>
          <WizardField label="Modelo (opcional)" htmlFor={modelId}>
            <input
              id={modelId}
              {...form.register("model")}
              placeholder="Ex: Civic LXR"
              className={wizardInputClass}
            />
          </WizardField>
          <WizardField label="Ano (opcional)" htmlFor={yearId}>
            <input
              id={yearId}
              type="number"
              inputMode="numeric"
              {...form.register("year")}
              placeholder="2020"
              className={wizardInputClass}
            />
          </WizardField>
          <WizardField label="Cor (opcional)" htmlFor={colorId}>
            <input
              id={colorId}
              {...form.register("color")}
              placeholder="Prata"
              className={wizardInputClass}
            />
          </WizardField>
        </>
      ) : null}

      {/* Real estate fields */}
      {category === "real_estate" && showMoreFields ? (
        <>
          <WizardField label="Cidade (opcional)" htmlFor={cityId}>
            <input
              id={cityId}
              {...form.register("addressCity")}
              placeholder="Ex: São Paulo"
              className={wizardInputClass}
            />
          </WizardField>
          <WizardField label="Metros quadrados (opcional)" htmlFor={sqmId}>
            <input
              id={sqmId}
              type="number"
              inputMode="numeric"
              {...form.register("squareMeters")}
              placeholder="80"
              className={wizardInputClass}
            />
          </WizardField>
          <WizardField label="Aluguel mensal (opcional)" htmlFor={rentId}>
            <WizardMoneyField
              control={form.control}
              name="rentMonthlyCents"
              id={rentId}
              placeholder="R$ 0,00"
            />
          </WizardField>
        </>
      ) : null}

      {/* Investment (non-stocks) institution + free-form */}
      {category === "investment" && investmentType !== "stocks" && investmentType !== "crypto" ? (
        <WizardField label="Instituição (opcional)" htmlFor={institutionId}>
          <input
            id={institutionId}
            {...form.register("institution")}
            placeholder="Ex: XP, Nubank, Binance"
            className={wizardInputClass}
          />
        </WizardField>
      ) : null}

      {category === "investment" && investmentType === "fixed_income" ? (
        showRate ? (
          <WizardField
            label="Sabe quanto rende por ano? (opcional)"
            htmlFor={fixedRateId}
            helper="Sem isso, a gente só guarda o valor. Com isso, mostramos uma projeção."
          >
            <input
              id={fixedRateId}
              type="number"
              inputMode="decimal"
              step={0.1}
              min={0}
              max={100}
              placeholder="ex: 11% ao ano"
              {...form.register("annualRatePct")}
              className={wizardInputClass}
            />
          </WizardField>
        ) : (
          <button
            type="button"
            onClick={() => setShowRate(true)}
            className="focus-ring w-fit text-[0.8125rem] font-semibold text-[color:var(--color-brand-500)] hover:underline"
          >
            Sabe quanto rende por ano? (opcional)
          </button>
        )
      ) : null}

      {/* Cash fields */}
      {category === "cash" ? (
        <>
          <WizardField label="Onde está (opcional)" htmlFor={cashInstitutionId}>
            <input
              id={cashInstitutionId}
              {...form.register("institution")}
              placeholder="Ex: Nubank, Itaú, Carteira"
              className={wizardInputClass}
            />
          </WizardField>

          <WizardField label="Esse dinheiro rende algo?">
            <div className="grid grid-cols-3 gap-2">
              {YIELD_TYPES.map((t) => (
                <WizardRadioCard
                  key={t}
                  title={YIELD_TYPE_META[t].title}
                  description={YIELD_TYPE_META[t].description}
                  active={(yieldType ?? "none") === t}
                  onSelect={() => handleYieldTypeChange(t)}
                />
              ))}
            </div>
          </WizardField>

          {yieldType === "cdi" ? (
            <WizardField
              label="Quantos % do CDI?"
              htmlFor={yieldRatePctId}
              helper="Ex: 100 (100% CDI), 110 (110% CDI)."
              error={errors.yieldRatePct?.message}
            >
              <input
                id={yieldRatePctId}
                type="number"
                inputMode="decimal"
                step={1}
                min={0}
                max={500}
                placeholder="100"
                {...form.register("yieldRatePct")}
                className={wizardInputClass}
              />
            </WizardField>
          ) : null}

          {yieldType === "fixed_pct_year" ? (
            <WizardField
              label="% ao ano"
              htmlFor={yieldRatePctId}
              helper="Ex: 8,5 (taxa fixa de 8,5% ao ano)."
              error={errors.yieldRatePct?.message}
            >
              <input
                id={yieldRatePctId}
                type="number"
                inputMode="decimal"
                step={0.1}
                min={0}
                max={100}
                placeholder="8,5"
                {...form.register("yieldRatePct")}
                className={wizardInputClass}
              />
            </WizardField>
          ) : null}
        </>
      ) : null}

      {/* Other fields */}
      {category === "other" ? (
        <WizardField label="Descrição (opcional)" htmlFor={descriptionId}>
          <textarea
            id={descriptionId}
            {...form.register("description")}
            placeholder="Ex: Joia de família, herança da avó. Detalhes do produto, marca, ano, condição..."
            rows={3}
            className={`${wizardInputClass} min-h-[80px] resize-y`}
          />
        </WizardField>
      ) : null}

      {/* Valor atual: não aparece na cripto (derivado de quantidade x preço editável). */}
      {isCrypto ? null : (
        <WizardField
          label="Valor atual"
          htmlFor={valueInputId}
          error={errors.currentValueCents?.message}
          helper={
            category === "investment" && investmentType === "stocks"
              ? "Se preenchido com quantidade × preço médio, calculamos automaticamente."
              : undefined
          }
        >
          <WizardMoneyField
            control={form.control}
            name="currentValueCents"
            id={valueInputId}
            placeholder={formatCents(0n, currency ?? "BRL")}
            currency={currency ?? "BRL"}
            onCurrencyChange={(next) => form.setValue("currency", next, { shouldDirty: true })}
          />
        </WizardField>
      )}

      {isCrypto ? (
        showCryptoExtra ? (
          <>
            <WizardField
              label="Preço médio de compra (por moeda)"
              htmlFor={avgPriceId}
              helper="Quanto você pagou em média por cada moeda. A corretora costuma mostrar esse número."
            >
              <WizardMoneyField
                control={form.control}
                name="avgPriceCents"
                id={avgPriceId}
                placeholder="R$ 0,00"
              />
            </WizardField>
            {cryptoPaidTotalCents !== null && cryptoCurrentTotalCents !== null
              ? (() => {
                  const delta = cryptoCurrentTotalCents - cryptoPaidTotalCents;
                  const isNeg = delta < 0n;
                  const abs = isNeg ? -delta : delta;
                  const sign = delta === 0n ? "" : isNeg ? "−" : "+";
                  const deltaColor =
                    delta === 0n
                      ? "text-[color:var(--text-muted)]"
                      : isNeg
                        ? "text-[color:var(--semantic-negative)]"
                        : "text-[color:var(--semantic-positive)]";
                  return (
                    <div className="rounded-xl bg-[color:var(--surface-1)] px-3 py-2.5">
                      <div className="text-[0.75rem] text-[color:var(--text-primary)] opacity-80">
                        Pagou {formatCents(cryptoPaidTotalCents)} · Vale agora{" "}
                        {formatCents(cryptoCurrentTotalCents)}
                      </div>
                      <div className={`mt-0.5 text-[0.875rem] font-bold ${deltaColor}`}>
                        {sign}
                        {formatCents(abs)}
                      </div>
                    </div>
                  );
                })()
              : null}
          </>
        ) : (
          <button
            type="button"
            onClick={() => setShowCryptoExtra(true)}
            className="focus-ring w-fit text-[0.8125rem] font-semibold text-[color:var(--color-brand-500)] hover:underline"
          >
            Informar quanto paguei (opcional)
          </button>
        )
      ) : (
        <>
          {category === "investment" && investmentType === "stocks" ? null : (
            <WizardField
              label="Quanto você pagou? (opcional)"
              htmlFor={purchasePriceId}
              helper="Útil pra saber se valorizou ou perdeu valor."
            >
              <WizardMoneyField
                control={form.control}
                name="purchasePriceCents"
                id={purchasePriceId}
                placeholder="R$ 0,00"
              />
            </WizardField>
          )}

          {shouldShowDepreciationSection(category) ? (
            <WizardField
              label="Data de aquisição (opcional)"
              htmlFor={acquiredAtId}
              helper="Sem data, o valor não muda com o tempo."
              error={errors.acquiredAt?.message}
            >
              <input
                id={acquiredAtId}
                type="date"
                {...form.register("acquiredAt")}
                className={wizardInputClass}
              />
            </WizardField>
          ) : null}
        </>
      )}

      {/* Depreciation section, hidden for cash and investment. Colapsada por
          padrão: a curva default por categoria já é aplicada pelo wizard. */}
      {shouldShowDepreciationSection(category) && !showValueCurve ? (
        <button
          type="button"
          onClick={() => setShowValueCurve(true)}
          className="focus-ring w-fit text-[0.8125rem] font-semibold text-[color:var(--color-brand-500)] hover:underline"
        >
          O valor muda com o tempo? Ajustar
        </button>
      ) : null}

      {shouldShowDepreciationSection(category) && showValueCurve ? (
        <section className="flex flex-col gap-2 rounded-2xl border border-[color:var(--border-soft)] bg-[color:var(--surface-1)] p-4">
          <div>
            <div className="text-[0.8125rem] font-semibold text-[color:var(--text-primary)]">
              O valor muda com o tempo?
            </div>
            <div className="mt-1 text-[0.6875rem] text-[color:var(--text-primary)] opacity-60">
              Como o valor desse ativo muda com o tempo. O valor atual recalcula conforme o tempo
              passa.
            </div>
          </div>

          <Controller
            control={form.control}
            name="depreciationKind"
            render={({ field }) => (
              <WizardField label="O que acontece com o valor">
                <div className="grid grid-cols-2 gap-2">
                  {DEPRECIATION_KINDS.map((k) => (
                    <WizardRadioCard
                      key={k}
                      title={DEPRECIATION_KIND_META[k].title}
                      description={DEPRECIATION_KIND_META[k].description}
                      active={field.value === k}
                      onSelect={() => {
                        field.onChange(k);
                        form.setValue(
                          "depreciationRatePctYear",
                          String(defaultRateForKind(k, category)),
                          { shouldDirty: false },
                        );
                      }}
                    />
                  ))}
                </div>
              </WizardField>
            )}
          />

          <WizardField
            label="Quanto muda por ano (%)"
            htmlFor={depreciationRateId}
            helper="Quanto o valor muda por ano. Carro costuma cair uns 15%."
            error={errors.depreciationRatePctYear?.message}
          >
            <input
              id={depreciationRateId}
              type="number"
              step={0.5}
              min={-50}
              max={100}
              inputMode="decimal"
              {...form.register("depreciationRatePctYear")}
              className={wizardInputClass}
            />
          </WizardField>
        </section>
      ) : null}
    </WizardShell>
  );
}
