import { Eye, Sparkles, UserPlus } from "lucide-react";

import { RevealOnScroll } from "./reveal-on-scroll";

const steps = [
  {
    icon: UserPlus,
    n: "01",
    title: "Cadastre renda e dívidas",
    body: "Salário, freela, extras. Financiamento, cartão, cheque especial, empréstimo. Tudo em uma tela. Leva 1 minuto.",
    time: "1 minuto",
    visual: "step1",
  },
  {
    icon: Eye,
    n: "02",
    title: "Veja o diagnóstico",
    body: "CET ponderado real, percentual de renda comprometida, data projetada de quitação. Sem juridiquês.",
    time: "Imediato",
    visual: "step2",
  },
  {
    icon: Sparkles,
    n: "03",
    title: "Simule e ajuste",
    body: "Pague R$ 200 a mais e veja anos saindo da projeção. Teste quitar a menor dívida primeiro, depois a de juros mais altos. Compare antes de decidir o que rende mais.",
    time: "Quanto quiser",
    visual: "step3",
  },
] as const;

export function LandingHow() {
  return (
    <section id="como" className="relative py-20 sm:py-28">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid gap-12 lg:grid-cols-[1fr_1.4fr] lg:items-start">
          <RevealOnScroll className="lg:sticky lg:top-24">
            <h2
              className="text-4xl font-extrabold text-[color:var(--text-primary)] sm:text-5xl"
              style={{ letterSpacing: "-0.035em" }}
            >
              Você cadastra. A gente calcula. Você decide o próximo passo.
            </h2>
            <p className="mt-5 max-w-md text-base text-[color:var(--text-secondary)] sm:text-lg">
              O cadastro inteiro cabe em uma sessão de café. Você sai com um
              mapa do buraco e a primeira simulação rodando.
            </p>
          </RevealOnScroll>

          <RevealOnScroll stagger as="ol" className="relative space-y-4">
            {steps.map((step) => {
              const Icon = step.icon;
              return (
                <li
                  key={step.n}
                  className="relative overflow-hidden rounded-[1.5rem] border border-[color:var(--border-soft)] bg-[color:var(--surface-1)] p-5 backdrop-blur-xl sm:p-6"
                  style={{ boxShadow: "var(--shadow-glass-strong)" }}
                >
                  <div className="flex gap-5">
                    <div className="relative shrink-0">
                      <div
                        className="flex h-12 w-12 items-center justify-center rounded-2xl text-white shadow-lg sm:h-14 sm:w-14"
                        style={{
                          background:
                            "linear-gradient(135deg, #f28e25, #d96813)",
                        }}
                      >
                        <Icon className="h-5 w-5 sm:h-6 sm:w-6" strokeWidth={2} />
                      </div>
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-baseline justify-between gap-3">
                        <span
                          className="font-mono text-xs font-bold text-[color:var(--text-muted)]"
                          aria-hidden
                        >
                          {step.n}
                        </span>
                        <span className="rounded-full bg-[color:var(--color-brand-50)] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[color:var(--color-brand-800)]">
                          {step.time}
                        </span>
                      </div>
                      <h3
                        className="mt-1 text-xl font-extrabold text-[color:var(--text-primary)] sm:text-[22px]"
                        style={{ letterSpacing: "-0.025em" }}
                      >
                        {step.title}
                      </h3>
                      <p className="mt-2 text-[14.5px] leading-relaxed text-[color:var(--text-secondary)]">
                        {step.body}
                      </p>
                    </div>
                  </div>

                  <div className="mt-5">
                    {step.visual === "step1" && <Step1Visual />}
                    {step.visual === "step2" && <Step2Visual />}
                    {step.visual === "step3" && <Step3Visual />}
                  </div>
                </li>
              );
            })}
          </RevealOnScroll>
        </div>
      </div>
    </section>
  );
}

function Step1Visual() {
  return (
    <div className="rounded-2xl border border-[color:var(--border-soft)] bg-[color:var(--bg-warm)] p-4">
      <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[color:var(--text-muted)]">
        Nova dívida
      </p>
      <div className="mt-3 space-y-2">
        <MockField label="Tipo" value="Cartão de crédito" />
        <MockField label="Nome" value="Cartão Nubank" />
        <div className="grid grid-cols-2 gap-2">
          <MockField label="Saldo atual" value="R$ 4.820,00" />
          <MockField label="Juros ao mês" value="14,8%" />
        </div>
      </div>
      <button
        type="button"
        aria-hidden
        className="mt-4 inline-flex h-9 items-center justify-center rounded-full bg-[linear-gradient(135deg,#f28e25,#ef7a1a)] px-5 text-[12px] font-bold text-white shadow-[0_8px_18px_rgba(239,122,26,0.35)]"
      >
        Salvar dívida
      </button>
    </div>
  );
}

function MockField({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-[color:var(--border-soft)] bg-[color:var(--surface-1)] px-3 py-2">
      <p className="text-[9px] font-semibold uppercase tracking-wide text-[color:var(--text-muted)]">
        {label}
      </p>
      <p className="text-[13px] font-bold text-[color:var(--text-primary)]">
        {value}
      </p>
    </div>
  );
}

function Step2Visual() {
  return (
    <div className="rounded-2xl border border-[color:var(--border-soft)] bg-[color:var(--bg-warm)] p-4">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        <MockKpi
          label="Juros, ao ano"
          value="312%"
          tone="negative"
          sub="Cartão rotativo"
        />
        <MockKpi
          label="Renda comprometida"
          value="42%"
          tone="warning"
          sub="Zona atenção"
        />
        <MockKpi
          label="Sai do vermelho"
          value="Mar/2031"
          tone="primary"
          sub="No ritmo atual"
        />
      </div>
      <div className="mt-3 flex items-center gap-2 rounded-xl border border-[color:var(--border-soft)] bg-[color:var(--surface-1)] px-3 py-2">
        <span
          aria-hidden
          className="h-2 w-2 rounded-full bg-[color:var(--color-negative)]"
        />
        <p className="text-[11px] font-medium text-[color:var(--text-secondary)]">
          O cartão rotativo está puxando 60% do custo total.
        </p>
      </div>
    </div>
  );
}

function MockKpi({
  label,
  value,
  tone,
  sub,
}: {
  label: string;
  value: string;
  tone: "negative" | "warning" | "primary";
  sub: string;
}) {
  const color =
    tone === "negative"
      ? "var(--color-negative)"
      : tone === "warning"
        ? "var(--color-warning)"
        : "var(--color-brand-700)";
  return (
    <div className="rounded-xl border border-[color:var(--border-soft)] bg-[color:var(--surface-1)] px-3 py-2.5">
      <p className="text-[9px] font-semibold uppercase tracking-wide text-[color:var(--text-muted)]">
        {label}
      </p>
      <p
        className="mt-0.5 text-[16px] font-extrabold leading-tight"
        style={{ letterSpacing: "-0.02em", color }}
      >
        {value}
      </p>
      <p className="text-[9px] text-[color:var(--text-muted)]">{sub}</p>
    </div>
  );
}

function Step3Visual() {
  return (
    <div className="rounded-2xl border border-[color:var(--border-soft)] bg-[color:var(--bg-warm)] p-4">
      <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[color:var(--text-muted)]">
        Pagamento extra mensal
      </p>
      <div className="mt-3 flex items-baseline gap-2">
        <span
          className="text-[28px] font-extrabold text-[color:var(--color-brand-700)]"
          style={{ letterSpacing: "-0.03em" }}
        >
          + R$ 200
        </span>
        <span className="text-[11px] font-medium text-[color:var(--text-muted)]">
          /mês
        </span>
      </div>
      <div className="mt-2 h-1 rounded-full bg-[color:var(--color-brand-100)]">
        <div
          className="h-full w-2/5 rounded-full"
          style={{
            background: "linear-gradient(90deg, #f28e25, #ef7a1a)",
          }}
        />
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2">
        <div className="rounded-xl border border-[color:var(--border-soft)] bg-[color:var(--surface-1)] px-3 py-2.5">
          <p className="text-[9px] font-semibold uppercase tracking-wide text-[color:var(--text-muted)]">
            Antes
          </p>
          <p
            className="mt-0.5 text-[14px] font-bold text-[color:var(--text-secondary)] line-through decoration-[color:var(--color-negative)]/60"
            style={{ letterSpacing: "-0.01em" }}
          >
            Mar/2031
          </p>
        </div>
        <div className="rounded-xl border border-[color:var(--color-positive)]/30 bg-[color:var(--color-positive)]/8 px-3 py-2.5">
          <p className="text-[9px] font-semibold uppercase tracking-wide text-[color:var(--color-positive)]">
            Depois
          </p>
          <p
            className="mt-0.5 text-[15px] font-extrabold text-[color:var(--color-positive)]"
            style={{ letterSpacing: "-0.02em" }}
          >
            Set/2030
          </p>
        </div>
      </div>
      <p className="mt-3 text-[11px] font-medium text-[color:var(--text-secondary)]">
        6 meses a menos. R$ 3.840 de juros economizados.
      </p>
    </div>
  );
}
