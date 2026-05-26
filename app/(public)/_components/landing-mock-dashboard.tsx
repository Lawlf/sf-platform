import {
  BookOpen,
  ChevronRight,
  Coins,
  HomeIcon,
  LineChart,
  PlusCircle,
  ShoppingBag,
  TrendingUp,
  Wallet,
} from "lucide-react";

export function LandingMockDashboard() {
  return (
    <div aria-hidden className="relative mx-auto w-full max-w-[340px]">
      <div
        aria-hidden
        className="absolute -inset-6 -z-10 rounded-[3.5rem]"
        style={{
          background:
            "radial-gradient(55% 50% at 50% 35%, rgba(242,142,37,0.32), transparent 70%)",
          filter: "blur(28px)",
        }}
      />

      <div
        className="relative aspect-[9/21.5] rounded-[3rem] p-[8px]"
        style={{
          background: "linear-gradient(160deg, #2a2725 0%, #1a1816 60%, #2a2725 100%)",
          boxShadow:
            "0 50px 90px -25px rgba(31,29,28,0.55), 0 0 0 1px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.08)",
        }}
      >
        <div
          aria-hidden
          className="pointer-events-none absolute inset-[8px] rounded-[2.5rem]"
          style={{
            boxShadow: "inset 0 0 0 1.5px rgba(255,255,255,0.04)",
          }}
        />

        <div
          className="relative flex h-full w-full flex-col overflow-hidden rounded-[2.5rem] bg-[color:var(--bg-app)]"
        >
          <div
            aria-hidden
            className="absolute left-1/2 top-[10px] z-30 flex h-[26px] w-[96px] -translate-x-1/2 items-center justify-end rounded-full bg-black px-2"
          >
            <span
              aria-hidden
              className="h-[7px] w-[7px] rounded-full"
              style={{
                background:
                  "radial-gradient(circle at 30% 30%, #4a4a4a 0%, #1a1a1a 70%)",
              }}
            />
          </div>

          <div className="flex h-[44px] items-center justify-between px-7 pt-3 text-[12px] font-semibold tabular-nums text-[color:var(--text-primary)]">
            <span>9:41</span>
            <div className="flex items-center gap-[5px]">
              <SignalIcon />
              <WifiIcon />
              <BatteryIcon />
            </div>
          </div>

          <div className="flex flex-1 flex-col overflow-hidden">
            <div className="flex items-center justify-between border-b border-[color:var(--border-soft)] px-3 py-2">
              <div className="flex items-center gap-2 rounded-full bg-[color:var(--color-brand-500)]/[0.12] py-1 pl-1 pr-3 text-[11px] font-semibold text-[color:var(--color-brand-800)]">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[linear-gradient(135deg,#f28e25,#ef7a1a)] text-[10px] font-bold text-white shadow-[0_2px_8px_rgba(239,122,26,0.35)]">
                  AF
                </span>
                <span>Arthur</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[color:var(--surface-1)] text-[color:var(--text-primary)]">
                  <BellSmall />
                </div>
                <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[color:var(--surface-1)] text-[color:var(--text-primary)]">
                  <SettingsSmall />
                </div>
              </div>
            </div>

            <div className="flex-1 space-y-2.5 overflow-hidden px-3 pt-2.5 pb-2">
              <div>
                <h3
                  className="text-[14px] font-extrabold text-[color:var(--text-primary)]"
                  style={{ letterSpacing: "-0.02em" }}
                >
                  Bom dia, Arthur
                </h3>
                <p className="text-[10px] text-[color:var(--text-secondary)]">
                  Aqui está sua situação agora.
                </p>
              </div>

              <div className="relative overflow-hidden rounded-2xl border border-[color:var(--color-brand-500)]/20 bg-[linear-gradient(135deg,#ef7a1a_0%,#f28e25_55%,#f4a13a_100%)] px-4 py-3 shadow-[0_12px_28px_rgba(239,122,26,0.28)]">
                <span
                  aria-hidden
                  className="pointer-events-none absolute -right-10 -top-12 h-32 w-32 rounded-full bg-[radial-gradient(circle,rgba(255,255,255,0.20),transparent_70%)]"
                />
                <div className="relative flex items-center justify-between gap-2">
                  <div className="flex-1">
                    <span className="text-[9px] font-bold uppercase tracking-[0.7px] text-white/85">
                      Saldo livre do mês
                    </span>
                    <div
                      className="mt-1 text-[26px] font-extrabold leading-none text-white"
                      style={{ letterSpacing: "-0.03em" }}
                    >
                      R$ 2.184,20
                    </div>
                    <span className="mt-2 inline-flex items-center gap-1 rounded-full bg-white/20 px-2 py-0.5 text-[9px] font-bold text-white backdrop-blur">
                      <span
                        className="sf-pulse-soft h-1.5 w-1.5 rounded-full bg-[color:var(--semantic-warning)]"
                        aria-hidden
                      />
                      Atenção
                    </span>
                  </div>
                  <ChevronRight
                    size={16}
                    strokeWidth={2.25}
                    className="shrink-0 text-white/85"
                    aria-hidden
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-1.5">
                <MockQuickAction icon={ShoppingBag} label="Compra, conta ou dívida" />
                <MockQuickAction icon={TrendingUp} label="Nova renda" />
                <MockQuickAction icon={Coins} label="Novo ativo" />
              </div>

              <p className="px-1 pt-1 text-[9px] font-semibold uppercase tracking-[0.06em] text-[color:var(--text-muted)]">
                Sua saúde financeira
              </p>

              <section className="rounded-2xl border border-[color:var(--border-soft)] bg-[color:var(--surface-1)] px-4 py-3 backdrop-blur-xl">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-semibold uppercase tracking-wide text-[color:var(--text-secondary)]">
                    Renda comprometida
                  </span>
                  <span
                    className="text-[18px] font-extrabold leading-none text-[color:var(--semantic-warning)]"
                    style={{ letterSpacing: "-0.02em" }}
                  >
                    42
                    <span className="ml-0.5 text-[11px] font-semibold opacity-70">
                      %
                    </span>
                  </span>
                </div>
                <div
                  className="relative mt-2.5 h-2.5 overflow-hidden rounded-full"
                  style={{
                    background:
                      "linear-gradient(90deg, #bbf7d0 0% 15%, #dcfce7 15% 30%, #fef3c7 30% 50%, #fee2e2 50% 100%)",
                  }}
                >
                  <div
                    className="absolute inset-y-0 left-0 rounded-full"
                    style={{
                      width: "42%",
                      background: "linear-gradient(90deg, #ca8a04, #eab308)",
                    }}
                  />
                  <div
                    className="absolute -bottom-0.5 -top-0.5 w-0.5 rounded"
                    style={{
                      left: "calc(42% - 1px)",
                      background: "var(--text-primary)",
                      boxShadow: "0 0 0 2px var(--bg-app)",
                    }}
                  />
                </div>
                <div className="mt-1.5 flex justify-between text-[8px] text-[color:var(--text-muted)]">
                  <span>Excelente</span>
                  <span>Saudável</span>
                  <span>Atenção</span>
                  <span>Crítico</span>
                </div>
                <div className="mt-2 flex items-center gap-1.5 text-[11px] font-semibold text-[color:var(--semantic-warning)]">
                  <span className="h-1.5 w-1.5 rounded-full bg-[color:var(--semantic-warning)]" />
                  Atenção: comprometimento médio.
                </div>
              </section>

              <p className="px-1 pt-1 text-[9px] font-semibold uppercase tracking-[0.06em] text-[color:var(--text-muted)]">
                Mais
              </p>

              <MockLink
                icon={LineChart}
                title="Linha do tempo"
                subtitle="Trajetória mês a mês."
              />
              <MockLink
                icon={TrendingUp}
                title="Análises e mercado"
                subtitle="Selic, CDI, CET das suas dívidas."
              />
              <div aria-hidden className="h-[72px]" />
            </div>

            <div className="pointer-events-none absolute inset-x-2 bottom-[26px] z-20">
              <nav
                aria-label="Mock navegação"
                className="relative flex items-end justify-around rounded-2xl border border-[color:var(--border-soft)] bg-[color:var(--surface-1)] px-1.5 py-1.5 backdrop-blur-xl"
                style={{ boxShadow: "var(--shadow-glass-strong)" }}
              >
                <MockNavItem icon={HomeIcon} label="Início" active />
                <MockNavItem icon={Wallet} label="Dívidas" />
                <MockNavFab icon={PlusCircle} label="Simular" />
                <MockNavItem icon={Coins} label="Patrim." />
                <MockNavItem icon={BookOpen} label="Conteúdo" />
              </nav>
            </div>

            <div className="absolute inset-x-0 bottom-0 z-20 flex h-[20px] items-end justify-center pb-2">
              <span
                aria-hidden
                className="h-[5px] w-[120px] rounded-full bg-[color:var(--text-primary)]/55"
              />
            </div>
          </div>
        </div>
      </div>

      <div
        aria-hidden
        className="absolute -left-[3px] top-[110px] h-[64px] w-[3px] rounded-l-md"
        style={{ background: "linear-gradient(90deg, #1a1816, #3a3633)" }}
      />
      <div
        aria-hidden
        className="absolute -left-[3px] top-[200px] h-[100px] w-[3px] rounded-l-md"
        style={{ background: "linear-gradient(90deg, #1a1816, #3a3633)" }}
      />
      <div
        aria-hidden
        className="absolute -right-[3px] top-[160px] h-[100px] w-[3px] rounded-r-md"
        style={{ background: "linear-gradient(90deg, #3a3633, #1a1816)" }}
      />
    </div>
  );
}

function MockQuickAction({
  icon: Icon,
  label,
}: {
  icon: typeof ShoppingBag;
  label: string;
}) {
  return (
    <div className="flex flex-col items-start gap-1.5 rounded-xl border border-[color:var(--border-soft)] bg-[color:var(--surface-1)] p-2 backdrop-blur">
      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-[color:var(--color-brand-500)]/[0.14] text-[color:var(--color-brand-800)]">
        <Icon size={12} strokeWidth={1.75} aria-hidden />
      </span>
      <span className="text-[9.5px] font-bold leading-tight text-[color:var(--text-primary)]">
        {label}
      </span>
    </div>
  );
}

function MockNavItem({
  icon: Icon,
  label,
  active = false,
}: {
  icon: typeof HomeIcon;
  label: string;
  active?: boolean;
}) {
  return (
    <div
      className={`relative flex flex-1 flex-col items-center justify-center gap-0.5 rounded-md px-1 py-1 ${
        active
          ? "text-[color:var(--color-brand-800)]"
          : "text-[color:var(--text-primary)]"
      }`}
    >
      {active ? (
        <span
          aria-hidden
          className="pointer-events-none absolute left-1/2 top-1/2 -z-10 h-12 w-12 -translate-x-1/2 -translate-y-1/2 rounded-full"
          style={{
            background:
              "radial-gradient(circle, rgba(242,142,37,0.28) 0%, rgba(242,142,37,0.12) 40%, transparent 75%)",
          }}
        />
      ) : null}
      <Icon size={15} strokeWidth={active ? 2.25 : 1.75} aria-hidden />
      <span
        className={`text-[8.5px] ${active ? "font-bold" : "font-medium"}`}
      >
        {label}
      </span>
    </div>
  );
}

function MockNavFab({
  icon: Icon,
  label,
}: {
  icon: typeof PlusCircle;
  label: string;
}) {
  return (
    <div className="-mt-5 flex flex-col items-center gap-0.5">
      <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[linear-gradient(135deg,#f28e25,#ef7a1a)] text-white shadow-[0_8px_18px_rgba(239,122,26,0.45)]">
        <Icon size={20} strokeWidth={1.75} aria-hidden />
      </span>
      <span className="text-[8.5px] font-semibold text-[color:var(--color-brand-700)]">
        {label}
      </span>
    </div>
  );
}

function MockLink({
  icon: Icon,
  title,
  subtitle,
}: {
  icon: typeof LineChart;
  title: string;
  subtitle: string;
}) {
  return (
    <div className="flex items-center justify-between gap-2 rounded-2xl border border-[color:var(--border-soft)] bg-[color:var(--surface-1)] px-3 py-2 backdrop-blur-xl">
      <div className="flex items-center gap-2">
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[color:var(--color-brand-500)]/[0.14] text-[color:var(--color-brand-800)]">
          <Icon size={13} strokeWidth={1.75} aria-hidden />
        </span>
        <div>
          <div className="text-[11px] font-bold leading-tight text-[color:var(--text-primary)]">
            {title}
          </div>
          <div className="text-[9px] leading-tight text-[color:var(--text-muted)]">
            {subtitle}
          </div>
        </div>
      </div>
      <ChevronRight
        size={12}
        strokeWidth={2.25}
        className="text-[color:var(--color-brand-800)]"
        aria-hidden
      />
    </div>
  );
}

function SignalIcon() {
  return (
    <svg
      width="15"
      height="10"
      viewBox="0 0 15 10"
      fill="currentColor"
      aria-hidden
    >
      <rect x="0" y="7" width="2.5" height="3" rx="0.5" />
      <rect x="3.5" y="5" width="2.5" height="5" rx="0.5" />
      <rect x="7" y="3" width="2.5" height="7" rx="0.5" />
      <rect x="10.5" y="0" width="2.5" height="10" rx="0.5" />
    </svg>
  );
}

function WifiIcon() {
  return (
    <svg
      width="14"
      height="10"
      viewBox="0 0 14 10"
      fill="none"
      aria-hidden
    >
      <path
        d="M1 3.5a9 9 0 0 1 12 0"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
      />
      <path
        d="M3 6a6 6 0 0 1 8 0"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
      />
      <circle cx="7" cy="8.5" r="1" fill="currentColor" />
    </svg>
  );
}

function BatteryIcon() {
  return (
    <svg
      width="24"
      height="11"
      viewBox="0 0 24 12"
      fill="none"
      aria-hidden
    >
      <rect
        x="0.5"
        y="0.75"
        width="20"
        height="10.5"
        rx="2.5"
        stroke="currentColor"
        strokeOpacity="0.45"
      />
      <rect x="2" y="2.25" width="16" height="7.5" rx="1.5" fill="currentColor" />
      <rect
        x="21.25"
        y="4"
        width="1.75"
        height="4"
        rx="0.5"
        fill="currentColor"
        fillOpacity="0.45"
      />
    </svg>
  );
}

function BellSmall() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M10.3 21a1.94 1.94 0 0 0 3.4 0"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function SettingsSmall() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.75" />
      <path
        d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
