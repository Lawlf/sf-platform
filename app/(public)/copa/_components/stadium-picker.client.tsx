"use client";

import { Check } from "lucide-react";

import { formatCents } from "@/shared/format/money-format";

import { FX_REFERENCE, type TicketCategory } from "../_lib/copa-2026.config";

const VB_W = 800;
const VB_H = 560;
const CX = 400;

const PITCH = { cx: CX, cy: 344, rx: 138, ry: 60 };

interface TierGeo {
  cy: number;
  inRx: number;
  inRy: number;
  outRx: number;
  outRy: number;
  h: number;
  color: string;
  delay: string;
}

// Anéis puramente ilustrativos: a bacia não representa o assento exato.
const TIERS: readonly [TierGeo, TierGeo, TierGeo] = [
  { cy: 338, inRx: 150, inRy: 66, outRx: 206, outRy: 92, h: 15, color: "var(--color-brand-600)", delay: "0.18s" },
  { cy: 322, inRx: 216, inRy: 96, outRx: 286, outRy: 128, h: 22, color: "var(--color-brand-500)", delay: "0.26s" },
  { cy: 302, inRx: 296, inRy: 132, outRx: 372, outRy: 166, h: 30, color: "var(--color-brand-400)", delay: "0.34s" },
];

// Posições ilustrativas do pino, do mais próximo do campo pro mais afastado.
const INSIDE_SPOTS: ReadonlyArray<{ x: number; y: number }> = [
  { x: 400, y: 396 },
  { x: 336, y: 420 },
  { x: 464, y: 420 },
  { x: 400, y: 448 },
];
const OUTSIDE_SPOT = { x: 400, y: 512 };

function arcPts(
  cx: number,
  cy: number,
  rx: number,
  ry: number,
  a0: number,
  a1: number,
  steps: number,
): [number, number][] {
  const out: [number, number][] = [];
  for (let i = 0; i <= steps; i++) {
    const t = a0 + ((a1 - a0) * i) / steps;
    const r = (t * Math.PI) / 180;
    out.push([cx + rx * Math.cos(r), cy + ry * Math.sin(r)]);
  }
  return out;
}

function toPath(pts: [number, number][], close: boolean): string {
  return "M " + pts.map((p) => p[0].toFixed(2) + " " + p[1].toFixed(2)).join(" L ") + (close ? " Z" : "");
}

function fullEllipse(cx: number, cy: number, rx: number, ry: number): string {
  return toPath(arcPts(cx, cy, rx, ry, 0, 360, 72), true);
}

function annulus(g: TierGeo): string {
  const outer = toPath(arcPts(CX, g.cy, g.outRx, g.outRy, 0, 360, 72), true);
  const inner = toPath(arcPts(CX, g.cy, g.inRx, g.inRy, 360, 0, 72), true);
  return outer + " " + inner;
}

function skirt(g: TierGeo): string {
  const top = arcPts(CX, g.cy, g.outRx, g.outRy, 0, 180, 60);
  const bot = arcPts(CX, g.cy + g.h, g.outRx, g.outRy, 180, 0, 60);
  return toPath(top.concat(bot), true);
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function usdFromBrl(cents: bigint): string {
  const usd = Number(cents) / 100 / FX_REFERENCE.usdToBrl;
  return usd.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
}

export function StadiumPicker({
  categories,
  selectedId,
  onSelect,
  venueName,
}: {
  categories: ReadonlyArray<TicketCategory>;
  selectedId: string;
  onSelect: (id: string) => void;
  venueName?: string;
}) {
  const spots = new Map<string, { x: number; y: number }>();
  let insideRank = 0;
  for (const cat of categories) {
    if (cat.outsideVenue) {
      spots.set(cat.id, OUTSIDE_SPOT);
    } else {
      spots.set(cat.id, INSIDE_SPOTS[Math.min(insideRank, INSIDE_SPOTS.length - 1)]!);
      insideRank += 1;
    }
  }

  const selected = categories.find((c) => c.id === selectedId) ?? categories[0]!;
  const pin = spots.get(selected.id) ?? INSIDE_SPOTS[0]!;
  const pinLabel = selected.outsideVenue ? "Fora do estádio" : "Sua área";

  return (
    <div style={{ width: "100%", margin: "0 auto", fontFamily: "inherit", color: "var(--text-primary)" }}>
      <style>{css}</style>

      <div style={{ position: "relative", width: "100%", maxWidth: 440, margin: "0 auto" }}>
        <svg
          viewBox={`0 0 ${VB_W} ${VB_H}`}
          width="100%"
          height="auto"
          role="img"
          aria-label="Ilustração do estádio. As posições são aproximadas."
          style={{ display: "block", overflow: "visible" }}
        >
          <defs>
            <radialGradient id="sp-vig" cx="50%" cy="46%" r="60%">
              <stop offset="0%" stopColor="rgba(255,255,255,0)" />
              <stop offset="100%" stopColor="rgba(0,0,0,0.22)" />
            </radialGradient>
            <filter id="sp-soft" x="-30%" y="-30%" width="160%" height="160%">
              <feGaussianBlur stdDeviation="9" />
            </filter>
          </defs>

          <ellipse cx={CX} cy={506} rx={370} ry={40} fill="rgba(0,0,0,0.18)" filter="url(#sp-soft)" />

          {[...TIERS].reverse().map((g) => {
            const stri = [0.4, 0.72].map((f) => ({
              rx: lerp(g.inRx, g.outRx, f),
              ry: lerp(g.inRy, g.outRy, f),
            }));
            return (
              <g key={g.cy} className="sp-tier" style={{ animationDelay: g.delay }}>
                <path d={skirt(g)} fill={g.color} className="sp-riser" />
                <path d={annulus(g)} fill={g.color} fillRule="evenodd" />
                <g fill="none" stroke="rgba(255,255,255,0.28)" strokeWidth={1.4}>
                  {stri.map((s, i) => (
                    <path key={i} d={fullEllipse(CX, g.cy, s.rx, s.ry)} />
                  ))}
                </g>
              </g>
            );
          })}

          <path
            className="sp-roof"
            d={toPath(arcPts(CX, TIERS[2].cy - 7, TIERS[2].outRx + 9, TIERS[2].outRy + 9, 182, 358, 60), false)}
            fill="none"
            stroke="var(--color-brand-300)"
            strokeWidth={11}
            strokeLinecap="round"
            opacity={0.85}
          />

          <g className="sp-pitch">
            <ellipse cx={PITCH.cx} cy={PITCH.cy} rx={PITCH.rx} ry={PITCH.ry} fill="#2f8f4e" />
            <ellipse cx={PITCH.cx} cy={PITCH.cy} rx={PITCH.rx} ry={PITCH.ry} fill="url(#sp-vig)" />
            <g stroke="rgba(255,255,255,0.5)" strokeWidth={1.4} fill="none">
              <line x1={PITCH.cx} y1={PITCH.cy - PITCH.ry} x2={PITCH.cx} y2={PITCH.cy + PITCH.ry} />
              <ellipse cx={PITCH.cx} cy={PITCH.cy} rx={30} ry={13} />
            </g>
          </g>

          <g key={selected.id}>
            <line
              className="sp-sight"
              x1={pin.x}
              y1={pin.y}
              x2={PITCH.cx}
              y2={PITCH.cy}
              stroke="var(--text-muted)"
              strokeWidth={1.6}
              strokeDasharray="5 6"
              opacity={0.7}
            />
            <g className="sp-pin" style={{ transformBox: "view-box", transformOrigin: `${pin.x}px ${pin.y}px` }}>
              <g transform={`translate(${pin.x}, ${pin.y - 64})`}>
                <rect x={-84} y={-20} width={168} height={34} rx={17} fill="var(--surface-solid)" stroke="var(--border-soft)" strokeWidth={1} />
                <text x={0} y={2} textAnchor="middle" fontSize={19} fontWeight={600} fill="var(--text-primary)" style={{ letterSpacing: 0.2 }}>
                  {pinLabel}
                </text>
              </g>
              <g transform={`translate(${pin.x}, ${pin.y})`}>
                <ellipse cx={0} cy={2} rx={9} ry={3} fill="rgba(0,0,0,0.25)" />
                <path
                  d="M 0 -2 C 12 -2 16 -14 16 -22 C 16 -33 8 -40 0 -40 C -8 -40 -16 -33 -16 -22 C -16 -14 -12 -2 0 -2 Z"
                  fill="var(--color-brand-700)"
                />
                <circle cx={0} cy={-24} r={6.5} fill="var(--surface-solid)" />
              </g>
            </g>
          </g>
        </svg>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 14 }}>
        {categories.map((c) => {
          const isSel = c.id === selectedId;
          return (
            <button
              key={c.id}
              type="button"
              data-testid={`ticket-${c.id}`}
              aria-pressed={isSel}
              aria-label={`${c.label}. ${c.note}. ${formatCents(c.priceCents, "BRL")}.`}
              onClick={() => onSelect(c.id)}
              style={{
                position: "relative",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 12,
                textAlign: "left",
                cursor: "pointer",
                borderRadius: 14,
                padding: "11px 13px",
                border: isSel ? "2px solid var(--color-brand-600)" : "1px solid var(--border-soft)",
                background: isSel ? "var(--surface-2)" : "var(--surface-1)",
                boxShadow: isSel ? "var(--shadow-brand)" : "var(--shadow-glass-strong)",
                color: "var(--text-primary)",
                transition: "border-color .2s ease, background .2s ease, box-shadow .2s ease",
                font: "inherit",
              }}
            >
              <span style={{ minWidth: 0 }}>
                <span style={{ display: "flex", alignItems: "center", gap: 7 }}>
                  {isSel ? (
                    <span
                      aria-hidden="true"
                      style={{
                        display: "grid",
                        placeItems: "center",
                        width: 18,
                        height: 18,
                        borderRadius: "50%",
                        background: "var(--color-brand-600)",
                        flexShrink: 0,
                      }}
                    >
                      <Check size={11} strokeWidth={3} color="var(--surface-solid)" />
                    </span>
                  ) : null}
                  <span style={{ fontSize: 14, fontWeight: 700, lineHeight: 1.15 }}>{c.label}</span>
                </span>
                <span style={{ display: "block", fontSize: 11.5, color: "var(--text-secondary)", marginTop: 2, lineHeight: 1.25 }}>
                  {c.note}
                </span>
              </span>
              <span style={{ textAlign: "right", flexShrink: 0 }}>
                <span style={{ display: "block", fontSize: 14, fontWeight: 800, color: "var(--color-brand-700)" }}>
                  {formatCents(c.priceCents, "BRL")}
                </span>
                <span style={{ display: "block", fontSize: 10.5, fontWeight: 600, color: "var(--text-muted)" }}>
                  ≈ {usdFromBrl(c.priceCents)}
                </span>
              </span>
            </button>
          );
        })}
      </div>

      <p style={{ textAlign: "center", fontSize: 11.5, color: "var(--text-muted)", margin: "12px 0 0", lineHeight: 1.4 }}>
        Ilustração do {venueName ?? "estádio"}, posições aproximadas. Pacotes de hospitalidade, preço a partir de.
      </p>
    </div>
  );
}

const css = `
.sp-tier{
  opacity:.72;
  animation:sp-rise .55s cubic-bezier(.22,1,.36,1) backwards;
}
.sp-riser{filter:brightness(.8);}
.sp-pitch{animation:sp-pitch .5s cubic-bezier(.22,1,.36,1) backwards;}
.sp-roof{animation:sp-fade .4s ease .42s backwards;}
.sp-pin{animation:sp-drop .55s cubic-bezier(.34,1.56,.64,1) both;}
.sp-sight{animation:sp-fade .3s ease .5s backwards;}

@keyframes sp-rise{from{opacity:0;transform:translateY(42px) scale(.96);}to{opacity:.72;transform:none;}}
@keyframes sp-pitch{from{opacity:0;transform:scale(.9);}to{opacity:1;transform:none;}}
@keyframes sp-fade{from{opacity:0;}to{opacity:1;}}
@keyframes sp-drop{0%{opacity:0;transform:translateY(-46px);}60%{opacity:1;transform:translateY(6px);}100%{opacity:1;transform:translateY(0);}}

@media (prefers-reduced-motion: reduce){
  .sp-tier,.sp-pitch,.sp-roof,.sp-pin,.sp-sight{animation:none !important;}
}
`;
