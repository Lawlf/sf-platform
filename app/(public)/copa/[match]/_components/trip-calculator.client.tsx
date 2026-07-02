"use client";

import { ArrowLeft, ArrowRight, BedDouble, Check, Info, MapPin, Ticket } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";

import { haversineKm } from "@/domain/services/geo-distance";
import { WorldCupTripCostService } from "@/domain/services/world-cup-trip-cost.service";
import { formatCents } from "@/shared/format/money-format";

import { HotelPicker } from "../../_components/hotel-picker.client";
import { OriginCombobox } from "../../_components/origin-combobox.client";
import { StadiumPicker } from "../../_components/stadium-picker.client";
import type { BrAirport } from "../../_lib/br-airports";
import {
  COPA_DESTINATION,
  COST_CONFIG,
  FX_REFERENCE,
  type CopaMatch,
  type HotelBand,
} from "../../_lib/copa-2026.config";

type Step = 1 | 2 | 3 | 4 | 5;

const STEPS: ReadonlyArray<{ id: 1 | 2 | 3 | 4; label: string }> = [
  { id: 1, label: "Origem" },
  { id: 2, label: "Assento" },
  { id: 3, label: "Hotel" },
  { id: 4, label: "Detalhes" },
];

// Copa 2030 fica ~48 meses à frente: fixa o horizonte e mostra o mensal factível.
function approxMonthly(cents: bigint): string {
  const perMonth = Number(cents) / 100 / 48;
  const rounded = Math.round(perMonth / 100) * 100;
  return rounded.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
}

function approxBrl(cents: bigint): string {
  const rounded = Math.round(Number(cents) / 100 / 1000) * 1000;
  return rounded.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
}

function formatUsdFromBrl(cents: bigint): string {
  const usd = Math.round(Number(cents) / 100 / FX_REFERENCE.usdToBrl / 100) * 100;
  return usd.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
}

function clampInt(raw: string, min: number, max: number, fallback: number): number {
  const n = Number.parseInt(raw, 10);
  if (Number.isNaN(n)) return fallback;
  return Math.max(min, Math.min(max, n));
}

const HOTEL_BANDS: ReadonlyArray<{ id: HotelBand; label: string; note: string }> = [
  { id: "simples", label: "Simples", note: "Econômico, um pouco mais longe" },
  { id: "medio", label: "Médio", note: "3 estrelas, bem localizado" },
  { id: "luxo", label: "Luxo", note: "Alto padrão, perto do estádio" },
];

const HOTEL_TIERS = HOTEL_BANDS.map((b) => ({
  id: b.id,
  label: b.label,
  note: b.note,
  nightlyCents: COST_CONFIG.hotelNightly[b.id],
}));

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between py-1.5 text-[0.875rem]">
      <span className="text-[color:var(--text-secondary)]">{label}</span>
      <span className="font-semibold text-[color:var(--text-primary)]">{value}</span>
    </div>
  );
}

function StepHeader({ title, hint }: { title: string; hint: string }) {
  return (
    <header className="flex flex-col gap-1">
      <h2
        className="text-lg font-extrabold text-[color:var(--text-primary)]"
        style={{ letterSpacing: "-0.02em" }}
      >
        {title}
      </h2>
      <p className="text-[0.8125rem] leading-relaxed text-[color:var(--text-secondary)]">{hint}</p>
    </header>
  );
}

export function TripCalculator({ match }: { match: CopaMatch }) {
  const [step, setStep] = useState<Step>(1);
  const [origin, setOrigin] = useState<BrAirport | null>(null);
  const [categoryId, setCategoryId] = useState<string>(
    () => match.ticketCategories[match.ticketCategories.length - 1]?.id ?? match.ticketCategories[0]!.id,
  );
  const [nights, setNights] = useState("4");
  const [hotelBand, setHotelBand] = useState<HotelBand>("simples");
  const [people, setPeople] = useState("1");
  const [needsVisa, setNeedsVisa] = useState(true);

  const nightsNum = clampInt(nights, 1, 20, 4);
  const peopleNum = clampInt(people, 1, 4, 1);
  const ppl = BigInt(peopleNum);

  const category =
    match.ticketCategories.find((c) => c.id === categoryId) ??
    // invariante: toda partida cadastrada tem ao menos uma categoria de ingresso
    match.ticketCategories[0]!;

  const breakdown = useMemo(() => {
    if (!origin) return null;
    const distanceKm = haversineKm(origin, COPA_DESTINATION);
    return WorldCupTripCostService.estimate(
      {
        distanceKm,
        nights: nightsNum,
        ticketPriceCents: category.priceCents,
        people: peopleNum,
        needsVisa,
        monthlySavingCents: null,
      },
      {
        flightBaseCents: COST_CONFIG.flightBaseCents,
        flightPerKmCents: COST_CONFIG.flightPerKmCents,
        seasonSurge: COST_CONFIG.seasonSurge,
        hotelNightlyCents: COST_CONFIG.hotelNightly[hotelBand],
        dailyExtrasCents: COST_CONFIG.dailyExtrasCents,
        visaCents: COST_CONFIG.visaCents,
        insurancePerDayCents: COST_CONFIG.insurancePerDayCents,
        estimateSpreadPct: COST_CONFIG.estimateSpreadPct,
      },
    );
  }, [origin, nightsNum, hotelBand, peopleNum, needsVisa, category.priceCents]);

  const canContinue = step !== 1 || origin !== null;

  const topRef = useRef<HTMLDivElement>(null);
  const firstRender = useRef(true);
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    const el = topRef.current;
    if (!el) return;
    const y = el.getBoundingClientRect().top + window.scrollY - 80;
    window.scrollTo({ top: y, behavior: "smooth" });
  }, [step]);

  function goNext() {
    setStep((s) => (s < 5 ? ((s + 1) as Step) : s));
  }
  function goBack() {
    setStep((s) => (s > 1 ? ((s - 1) as Step) : s));
  }

  return (
    <div ref={topRef} className="flex flex-col gap-5 scroll-mt-24">
      <Stepper current={step} />

      {step < 5 && origin ? (
        <div className="flex flex-wrap gap-2 text-[0.75rem]">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-[color:var(--border-soft)] bg-[color:var(--surface-1)] px-3 py-1 font-medium text-[color:var(--text-secondary)] backdrop-blur-xl">
            <MapPin size={13} strokeWidth={2} aria-hidden />
            {origin.city}
          </span>
          {step >= 3 ? (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-[color:var(--border-soft)] bg-[color:var(--surface-1)] px-3 py-1 font-medium text-[color:var(--text-secondary)] backdrop-blur-xl">
              <Ticket size={13} strokeWidth={2} aria-hidden />
              {category.label}
            </span>
          ) : null}
          {step >= 4 ? (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-[color:var(--border-soft)] bg-[color:var(--surface-1)] px-3 py-1 font-medium text-[color:var(--text-secondary)] backdrop-blur-xl">
              <BedDouble size={13} strokeWidth={2} aria-hidden />
              {HOTEL_BANDS.find((b) => b.id === hotelBand)?.label}
            </span>
          ) : null}
        </div>
      ) : null}

      <div key={step} className="animate-in fade-in slide-in-from-bottom-2 duration-300">
        {step === 1 ? (
          <div className="flex flex-col gap-4">
            <StepHeader
              title="De onde você sai?"
              hint={`Não precisa ser sua cidade exata — escolha o aeroporto mais perto de você. A gente estima o custo até o ${match.venueName}, em Nova Jersey.`}
            />
            <OriginCombobox value={origin} onSelect={setOrigin} />
          </div>
        ) : null}

        {step === 2 ? (
          <div className="flex flex-col gap-4">
            <StepHeader
              title="Onde você quer sentar?"
              hint="Escolha a categoria do ingresso e veja onde fica no estádio."
            />
            <StadiumPicker
              categories={match.ticketCategories}
              selectedId={categoryId}
              onSelect={setCategoryId}
              venueName={match.venueName}
            />
          </div>
        ) : null}

        {step === 3 ? (
          <div className="flex flex-col gap-4">
            <StepHeader title="Onde você fica?" hint="Escolha o padrão do hotel. Os valores são por noite." />
            <HotelPicker tiers={HOTEL_TIERS} selectedId={hotelBand} onSelect={setHotelBand} />
          </div>
        ) : null}

        {step === 4 ? (
          <div className="flex flex-col gap-4">
            <StepHeader title="Detalhes da viagem" hint="Quantas noites, quantas pessoas vão e o visto americano." />

            <div className="grid grid-cols-2 gap-3">
              <label className="flex flex-col gap-1.5">
                <span className="text-[0.8125rem] font-semibold text-[color:var(--text-primary)]">Noites de hotel</span>
                <input
                  type="text"
                  inputMode="numeric"
                  value={nights}
                  onChange={(e) => setNights(e.target.value.replace(/\D/g, ""))}
                  onBlur={() => setNights(String(nightsNum))}
                  className="rounded-xl border border-[color:var(--border-soft)] bg-[color:var(--surface-1)] px-3 py-2.5 text-[0.9375rem] text-[color:var(--text-primary)] outline-none focus:border-[color:var(--color-brand-500)]"
                />
              </label>
              <label className="flex flex-col gap-1.5">
                <span className="text-[0.8125rem] font-semibold text-[color:var(--text-primary)]">Pessoas</span>
                <input
                  type="text"
                  inputMode="numeric"
                  value={people}
                  onChange={(e) => setPeople(e.target.value.replace(/\D/g, ""))}
                  onBlur={() => setPeople(String(peopleNum))}
                  className="rounded-xl border border-[color:var(--border-soft)] bg-[color:var(--surface-1)] px-3 py-2.5 text-[0.9375rem] text-[color:var(--text-primary)] outline-none focus:border-[color:var(--color-brand-500)]"
                />
              </label>
            </div>

            <div className="flex flex-col gap-2">
              <span className="text-[0.8125rem] font-semibold text-[color:var(--text-primary)]">Visto americano</span>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setNeedsVisa(true)}
                  aria-pressed={needsVisa}
                  className={`focus-ring rounded-full border px-4 py-2 text-[0.8125rem] font-semibold transition-colors ${
                    needsVisa
                      ? "border-[color:var(--color-brand-500)] bg-[color:var(--color-brand-500)]/[0.12] text-[color:var(--color-brand-700)]"
                      : "border-[color:var(--border-soft)] bg-[color:var(--surface-1)] text-[color:var(--text-secondary)]"
                  }`}
                >
                  Preciso tirar
                </button>
                <button
                  type="button"
                  onClick={() => setNeedsVisa(false)}
                  aria-pressed={!needsVisa}
                  className={`focus-ring rounded-full border px-4 py-2 text-[0.8125rem] font-semibold transition-colors ${
                    !needsVisa
                      ? "border-[color:var(--color-brand-500)] bg-[color:var(--color-brand-500)]/[0.12] text-[color:var(--color-brand-700)]"
                      : "border-[color:var(--border-soft)] bg-[color:var(--surface-1)] text-[color:var(--text-secondary)]"
                  }`}
                >
                  Já tenho
                </button>
              </div>
            </div>
          </div>
        ) : null}

        {step === 5 && breakdown ? (
          <div className="flex flex-col gap-4">
            <section
              className="sf-lift rounded-[1.5rem] border border-[color:var(--border-soft)] bg-[color:var(--surface-1)] p-5 backdrop-blur-xl"
              style={{ boxShadow: "var(--shadow-glass-strong)" }}
            >
              <p className="text-[0.8125rem] font-medium text-[color:var(--text-secondary)]">
                Custo estimado da viagem, para {peopleNum === 1 ? "1 pessoa" : `${peopleNum} pessoas`}
              </p>
              <p
                className="mt-1 text-2xl font-extrabold text-[color:var(--text-primary)] sm:text-3xl"
                style={{ letterSpacing: "-0.02em" }}
              >
                cerca de {approxBrl(breakdown.totalCents)}
              </p>
              <p className="mt-0.5 text-[0.8125rem] font-medium text-[color:var(--text-muted)]">
                ≈ {formatUsdFromBrl(breakdown.totalCents)}
              </p>

              <div className="mt-4 border-t border-[color:var(--border-soft)] pt-2">
                <Row label={`Voo ida e volta (${origin?.iata} para EWR)`} value={formatCents(breakdown.flightCents * ppl, "BRL")} />
                <Row label={`Hotel (${nightsNum} noites)`} value={formatCents(breakdown.hotelCents * ppl, "BRL")} />
                <Row label={`Ingresso (${category.label})`} value={formatCents(breakdown.ticketCents * ppl, "BRL")} />
                <Row label="Alimentação e transporte" value={formatCents(breakdown.extrasCents * ppl, "BRL")} />
                {breakdown.visaCents > 0n ? (
                  <Row label="Visto americano" value={formatCents(breakdown.visaCents * ppl, "BRL")} />
                ) : null}
                <Row label="Seguro viagem" value={formatCents(breakdown.insuranceCents * ppl, "BRL")} />
              </div>
            </section>

            <p className="flex items-start gap-2 text-[0.75rem] text-[color:var(--text-muted)]">
              <Info size={14} strokeWidth={1.75} className="mt-0.5 shrink-0" aria-hidden />
              <span>Estimativa. Voo e hotel mudam conforme a data e a antecedência. {FX_REFERENCE.label}. Volte e ajuste as opções, e confira a disponibilidade real antes de fechar.</span>
            </p>

            <div className="rounded-2xl border border-[color:var(--color-brand-500)]/30 bg-[color:var(--color-brand-500)]/[0.08] p-4">
              <p className="text-[0.875rem] leading-relaxed text-[color:var(--text-primary)]">
                Pra domingo, hoje só tem pacote de hospitalidade: sai caro e é logo ali. Mas a Copa 2030 é daqui a uns 4 anos. Guardando{" "}
                <strong>cerca de {approxMonthly(breakdown.totalCents)} por mês</strong>, uma viagem dessas cabe até lá.
              </p>
              <Link
                href="/entrar"
                className="sf-lift focus-ring mt-3 inline-flex items-center gap-1.5 rounded-full bg-[image:var(--gradient-brand)] px-4 py-2 text-[0.8125rem] font-semibold text-white shadow-[var(--shadow-brand)]"
              >
                Criar minha meta pra 2030
                <ArrowRight size={14} strokeWidth={2.5} aria-hidden />
              </Link>
            </div>
          </div>
        ) : null}
      </div>

      <nav className="flex items-center justify-between gap-3">
        {step > 1 ? (
          <button
            type="button"
            onClick={goBack}
            className="focus-ring inline-flex items-center gap-1.5 rounded-full border border-[color:var(--border-soft)] bg-[color:var(--surface-1)] px-4 py-2.5 text-sm font-semibold text-[color:var(--text-secondary)] backdrop-blur-xl transition-colors hover:text-[color:var(--text-primary)]"
          >
            <ArrowLeft size={16} strokeWidth={2.25} aria-hidden />
            Voltar
          </button>
        ) : (
          <span />
        )}

        {step < 5 ? (
          <button
            type="button"
            onClick={goNext}
            disabled={!canContinue}
            className="sf-lift focus-ring inline-flex items-center gap-2 rounded-full bg-[image:var(--gradient-brand)] px-5 py-2.5 text-sm font-semibold text-white shadow-[var(--shadow-brand)] transition-opacity disabled:cursor-not-allowed disabled:opacity-40"
          >
            {step === 4 ? "Ver o custo" : "Continuar"}
            <ArrowRight size={16} strokeWidth={2.25} aria-hidden />
          </button>
        ) : null}
      </nav>
    </div>
  );
}

function Stepper({ current }: { current: Step }) {
  return (
    <ol className="flex items-center gap-2" aria-label="Etapas">
      {STEPS.map((s, i) => {
        const done = current > s.id;
        const active = current === s.id;
        return (
          <li key={s.id} className="flex flex-1 items-center gap-2">
            <span className="flex items-center gap-2">
              <span
                aria-current={active ? "step" : undefined}
                className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[0.75rem] font-bold transition-colors ${
                  done
                    ? "bg-[color:var(--color-brand-500)] text-white"
                    : active
                      ? "border-2 border-[color:var(--color-brand-500)] text-[color:var(--color-brand-700)]"
                      : "border border-[color:var(--border-soft)] text-[color:var(--text-muted)]"
                }`}
              >
                {done ? <Check size={14} strokeWidth={3} aria-hidden /> : s.id}
              </span>
              <span
                className={`text-[0.8125rem] font-semibold ${
                  active || done ? "text-[color:var(--text-primary)]" : "text-[color:var(--text-muted)]"
                }`}
              >
                {s.label}
              </span>
            </span>
            {i < STEPS.length - 1 ? (
              <span
                className={`h-px flex-1 ${done ? "bg-[color:var(--color-brand-500)]" : "bg-[color:var(--border-soft)]"}`}
              />
            ) : null}
          </li>
        );
      })}
    </ol>
  );
}
