"use client";

import { type CSSProperties, type ReactNode } from "react";

import { formatCents } from "@/shared/format/money-format";

import { FX_REFERENCE, type HotelBand } from "../_lib/copa-2026.config";

interface HotelTier {
  id: HotelBand;
  label: string;
  note: string;
  nightlyCents: bigint;
}

// viewBox compartilhado: mesma escala e mesma linha de chão pros 3 prédios.
const THUMB_VIEWBOX = "120 30 200 320";

function usdFromBrl(cents: bigint): string {
  const usd = Number(cents) / 100 / FX_REFERENCE.usdToBrl;
  return usd.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
}

// Delay derivado do índice: pisca no idle de forma determinística, sem randomness.
function Win({
  x,
  y,
  w,
  h,
  i,
  glass = false,
}: {
  x: number;
  y: number;
  w: number;
  h: number;
  i: number;
  glass?: boolean;
}) {
  const twinkles = i % 3 === 0;
  const twinkleDelay = (i % 7) * 0.9;
  return (
    <rect
      x={x}
      y={y}
      width={w}
      height={h}
      rx={glass ? 0.5 : 1.4}
      className={`hp-win${twinkles ? " hp-win-tw" : ""}`}
      style={
        {
          fill: glass ? "var(--color-brand-200)" : "var(--color-brand-300)",
          "--tw-delay": `${twinkleDelay}s`,
        } as CSSProperties
      }
    />
  );
}

function BuildingSimples() {
  const cols = [148, 176, 204, 232];
  const rows = [232, 268];
  const wins: ReactNode[] = [];
  let i = 0;
  rows.forEach((ry) =>
    cols.forEach((cx) => {
      wins.push(<Win key={i} x={cx} y={ry} w={18} h={22} i={i} />);
      i++;
    }),
  );
  return (
    <g>
      <ellipse cx={200} cy={332} rx={118} ry={12} className="hp-shadow" />
      <path d="M126 210 L200 168 L274 210 Z" fill="var(--color-brand-700)" />
      <rect x={124} y={208} width={152} height={8} rx={2} fill="var(--color-brand-700)" />
      <rect x={132} y={216} width={136} height={116} rx={3} fill="var(--surface-solid)" stroke="var(--border-soft)" strokeWidth={1.5} />
      {wins}
      <rect x={186} y={300} width={28} height={32} rx={2} fill="var(--color-brand-700)" />
      <path d="M180 300 L220 300 L214 288 L186 288 Z" fill="var(--color-brand-500)" />
      <path d="M180 300 L220 300 L220 305 L180 305 Z" fill="var(--color-brand-600)" />
      <rect x={274} y={252} width={4} height={80} fill="var(--color-brand-700)" />
      <rect x={278} y={258} width={4} height={12} fill="var(--color-brand-700)" />
      <rect x={282} y={256} width={34} height={22} rx={3} fill="var(--color-brand-500)" stroke="var(--color-brand-700)" strokeWidth={1} />
      <text x={299} y={271} textAnchor="middle" fontSize={9} fontWeight={700} fill="#fff" style={{ letterSpacing: 0.5 }}>
        INN
      </text>
    </g>
  );
}

function BuildingMedio() {
  const cols = [156, 176, 196, 216, 236];
  const rows = [148, 174, 200, 226, 252];
  const wins: ReactNode[] = [];
  let i = 0;
  rows.forEach((ry) =>
    cols.forEach((cx) => {
      wins.push(<Win key={i} x={cx} y={ry} w={13} h={16} i={i} />);
      i++;
    }),
  );
  return (
    <g>
      <ellipse cx={200} cy={332} rx={104} ry={11} className="hp-shadow" />
      <rect x={140} y={122} width={120} height={14} rx={2} fill="var(--color-brand-700)" />
      <rect x={144} y={134} width={112} height={198} rx={3} fill="var(--surface-solid)" stroke="var(--border-soft)" strokeWidth={1.5} />
      <rect x={148} y={138} width={104} height={16} rx={2} fill="var(--color-brand-500)" />
      <text x={200} y={150} textAnchor="middle" fontSize={10} fontWeight={800} fill="#fff" style={{ letterSpacing: 3 }}>
        HOTEL
      </text>
      {wins}
      <rect x={152} y={218} width={17} height={2.5} fill="var(--color-brand-600)" />
      <rect x={231} y={218} width={17} height={2.5} fill="var(--color-brand-600)" />
      <rect x={168} y={296} width={64} height={9} rx={2} fill="var(--color-brand-600)" />
      <rect x={172} y={305} width={3} height={27} fill="var(--color-brand-700)" />
      <rect x={225} y={305} width={3} height={27} fill="var(--color-brand-700)" />
      <rect x={184} y={304} width={32} height={28} rx={2} fill="var(--color-brand-700)" />
    </g>
  );
}

function BuildingLuxo() {
  const cols = [176, 190, 204, 218];
  const wins: ReactNode[] = [];
  let i = 0;
  for (let r = 0; r < 14; r++) {
    const ry = 74 + r * 17;
    const isCrown = r < 3;
    const rowCols = isCrown ? [190, 204] : cols;
    rowCols.forEach((cx) => {
      wins.push(<Win key={i} x={cx} y={ry} w={9} h={12} i={i} glass />);
      i++;
    });
  }
  return (
    <g>
      <ellipse cx={200} cy={332} rx={92} ry={10} className="hp-shadow" />
      <rect x={199} y={40} width={2} height={30} fill="var(--text-muted)" />
      <circle cx={200} cy={40} r={2.4} fill="var(--color-brand-400)" className="hp-beacon" />
      <rect x={182} y={64} width={36} height={58} rx={2} fill="#7fa8c9" stroke="var(--border-soft)" strokeWidth={1} />
      <rect x={166} y={120} width={68} height={212} rx={2} fill="#6f9ec2" stroke="var(--border-soft)" strokeWidth={1} />
      <rect x={166} y={120} width={68} height={212} fill="url(#hpGlass)" opacity={0.5} />
      <g stroke="#5c88ad" strokeWidth={0.75} opacity={0.6}>
        <line x1={184} y1={120} x2={184} y2={332} />
        <line x1={200} y1={64} x2={200} y2={332} />
        <line x1={216} y1={120} x2={216} y2={332} />
      </g>
      {wins}
      <rect x={166} y={64} width={68} height={268} fill="url(#hpShimmer)" className="hp-shimmer" />
      <rect x={170} y={300} width={60} height={32} rx={1} fill="var(--color-brand-300)" className="hp-lobby" />
      <line x1={186} y1={300} x2={186} y2={332} stroke="var(--surface-solid)" strokeWidth={1} />
      <line x1={200} y1={300} x2={200} y2={332} stroke="var(--surface-solid)" strokeWidth={1} />
      <line x1={214} y1={300} x2={214} y2={332} stroke="var(--surface-solid)" strokeWidth={1} />
    </g>
  );
}

const BUILD: Record<HotelBand, () => ReactNode> = {
  simples: BuildingSimples,
  medio: BuildingMedio,
  luxo: BuildingLuxo,
};

export function HotelPicker({
  tiers,
  selectedId,
  onSelect,
}: {
  tiers: ReadonlyArray<HotelTier>;
  selectedId: HotelBand;
  onSelect: (id: HotelBand) => void;
}) {
  return (
    <div className="hp-root">
      <style>{CSS}</style>

      <svg width="0" height="0" aria-hidden="true" style={{ position: "absolute" }}>
        <defs>
          <linearGradient id="hpGlass" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#bcd8ec" />
            <stop offset="50%" stopColor="#8fb4d1" />
            <stop offset="100%" stopColor="#6f9ec2" />
          </linearGradient>
          <linearGradient id="hpShimmer" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#fff" stopOpacity={0} />
            <stop offset="45%" stopColor="#fff" stopOpacity={0} />
            <stop offset="50%" stopColor="#fff" stopOpacity={0.55} />
            <stop offset="55%" stopColor="#fff" stopOpacity={0} />
            <stop offset="100%" stopColor="#fff" stopOpacity={0} />
          </linearGradient>
        </defs>
      </svg>

      <div className="hp-tiers" role="group" aria-label="Escolha a categoria do hotel">
        {tiers.map((t) => {
          const selected = t.id === selectedId;
          const Building = BUILD[t.id];
          const price = formatCents(t.nightlyCents, "BRL");
          return (
            <button
              key={t.id}
              type="button"
              data-testid={`hotel-${t.id}`}
              aria-pressed={selected}
              aria-label={`${t.label}. ${t.note}. ${price} por noite`}
              className={`hp-tier${selected ? " is-selected" : ""}`}
              onClick={() => onSelect(t.id)}
            >
              {selected ? (
                <span className="hp-check" aria-hidden="true">
                  <svg viewBox="0 0 24 24" width={12} height={12}>
                    <path d="M5 12.5l4.2 4.2L19 7" fill="none" stroke="#fff" strokeWidth={2.6} strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </span>
              ) : null}
              <svg className="hp-thumb" viewBox={THUMB_VIEWBOX} preserveAspectRatio="xMidYMax meet" aria-hidden="true">
                <Building />
              </svg>
              <span className="hp-tier-label">{t.label}</span>
              <span className="hp-tier-note">{t.note}</span>
              <span className="hp-tier-price">{price}</span>
              <span className="hp-tier-usd">≈ {usdFromBrl(t.nightlyCents)}</span>
            </button>
          );
        })}
      </div>

      <p className="hp-caption">Diária estimada, fim de semana da Copa em Nova Jersey</p>
    </div>
  );
}

const EASE = "cubic-bezier(0.22, 1, 0.36, 1)";

const CSS = `
.hp-root{ width:100%; font-family:inherit; color:var(--text-primary); -webkit-font-smoothing:antialiased; }

.hp-tiers{
  display:grid;
  grid-template-columns:repeat(3, minmax(0, 1fr));
  gap:8px;
}
.hp-tier{
  position:relative;
  min-width:0;
  display:flex;
  flex-direction:column;
  align-items:flex-start;
  gap:2px;
  text-align:left;
  padding:8px 8px 10px;
  border-radius:14px;
  cursor:pointer;
  background:var(--surface-1);
  border:1.5px solid var(--border-soft);
  color:var(--text-primary);
  transition:transform .18s ${EASE}, box-shadow .18s ${EASE}, background .18s ease, border-color .18s ease;
}
@media (hover:hover){
  .hp-tier:hover{ background:var(--surface-2); box-shadow:var(--shadow-glass-strong); }
}
.hp-tier:focus-visible{ outline:2px solid var(--color-brand-500); outline-offset:2px; }
.hp-tier.is-selected{
  background:var(--surface-2);
  border-color:var(--color-brand-500);
  box-shadow:var(--shadow-brand);
}

.hp-thumb{ display:block; width:100%; height:96px; margin-bottom:4px; }
.hp-shadow{ fill:rgba(0,0,0,.16); }
.hp-win{ opacity:.9; }
.hp-win-tw{ animation:hp-tw 4.2s ease-in-out infinite; animation-delay:var(--tw-delay,0s); }
@keyframes hp-tw{ 0%,100%{ opacity:.9; } 50%{ opacity:.55; } }
.hp-shimmer{ opacity:0; transform:translateX(-70px); animation:hp-shim 5.5s ease-in-out infinite; }
@keyframes hp-shim{
  0%{ transform:translateX(-70px); opacity:0; }
  12%{ opacity:.9; }
  40%{ transform:translateX(70px); opacity:0; }
  100%{ transform:translateX(70px); opacity:0; }
}
.hp-beacon{ animation:hp-tw 2.6s ease-in-out infinite; }
.hp-lobby{ animation:hp-tw 5s ease-in-out infinite; }

.hp-check{
  position:absolute;
  top:7px; right:7px;
  width:18px; height:18px;
  border-radius:50%;
  display:flex; align-items:center; justify-content:center;
  background:var(--color-brand-500);
  box-shadow:var(--shadow-brand);
  z-index:1;
}
.hp-tier-label{ font-size:13px; font-weight:700; line-height:1.15; }
.hp-tier-note{ font-size:10.5px; color:var(--text-muted); line-height:1.2; overflow-wrap:anywhere; }
.hp-tier-price{ font-size:12px; font-weight:800; color:var(--color-brand-700); margin-top:3px; overflow-wrap:anywhere; }
.hp-tier-usd{ font-size:10px; font-weight:600; color:var(--text-muted); }

.hp-caption{
  margin:10px 2px 0;
  font-size:11.5px;
  color:var(--text-secondary);
  text-align:center;
  line-height:1.35;
}

@media (prefers-reduced-motion:reduce){
  .hp-win-tw,.hp-shimmer,.hp-beacon,.hp-lobby,.hp-tier{ animation:none !important; transition:none !important; }
}
`;
