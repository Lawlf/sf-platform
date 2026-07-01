import { ImageResponse } from "next/og";

import { COPA_MATCHES, getCopaMatch } from "../_lib/copa-2026.config";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const dynamicParams = false;

export function generateStaticParams(): { match: string }[] {
  return COPA_MATCHES.map((m) => ({ match: m.slug }));
}

function Bowl() {
  return (
    <svg
      width={680}
      height={680}
      viewBox="0 0 400 400"
      fill="none"
      style={{ position: "absolute", right: -150, bottom: -130 }}
    >
      <ellipse cx={200} cy={210} rx={196} ry={150} fill="#f6b259" />
      <ellipse cx={200} cy={200} rx={150} ry={112} fill="#f28e25" />
      <ellipse cx={200} cy={192} rx={104} ry={76} fill="#ef7a1a" />
      <ellipse cx={200} cy={186} rx={60} ry={40} fill="#2f8f4e" />
      <line x1={200} y1={150} x2={200} y2={222} stroke="#ffffff" strokeOpacity={0.6} strokeWidth={2} />
      <ellipse cx={200} cy={186} rx={15} ry={9} fill="none" stroke="#ffffff" strokeOpacity={0.5} strokeWidth={2} />
    </svg>
  );
}

export default async function OgImage({ params }: { params: Promise<{ match: string }> }) {
  const { match: slug } = await params;
  const match = getCopaMatch(slug);
  const eyebrow = match ? `Copa do Mundo 2026 · ${match.stageLabel}` : "Copa do Mundo 2026";
  const line1 = match ? match.homeTeam : "Quanto custa";
  const line2 = match ? `× ${match.awayTeam}` : "ir à Copa?";
  const venue = match ? `${match.venueName} · ${match.venueCity}` : "Sabor Financeiro";

  return new ImageResponse(
    (
      <div
        style={{
          height: "100%",
          width: "100%",
          display: "flex",
          position: "relative",
          overflow: "hidden",
          background: "linear-gradient(135deg, #fff7ed 0%, #ffe6c9 60%, #ffd9a8 100%)",
        }}
      >
        <Bowl />
        <div
          style={{
            position: "relative",
            zIndex: 2,
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            width: "100%",
            height: "100%",
            padding: "68px 72px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center" }}>
            <div
              style={{
                width: 40,
                height: 40,
                borderRadius: 40,
                marginRight: 14,
                background: "linear-gradient(135deg, #f28e25, #d96813)",
              }}
            />
            <div style={{ fontSize: 30, fontWeight: 800, color: "#1c1917" }}>Sabor Financeiro</div>
            <div style={{ fontSize: 30, color: "#57534e", marginLeft: 10 }}>· calculadora grátis</div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", maxWidth: 720 }}>
            <div
              style={{
                fontSize: 29,
                fontWeight: 800,
                letterSpacing: 2,
                color: "#d96813",
                textTransform: "uppercase",
              }}
            >
              {eyebrow}
            </div>
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                marginTop: 12,
                fontSize: 100,
                fontWeight: 800,
                letterSpacing: -3,
                lineHeight: 0.98,
                color: "#1c1917",
              }}
            >
              <div>{line1}</div>
              <div>{line2}</div>
            </div>
            <div style={{ fontSize: 33, color: "#57534e", marginTop: 20 }}>{venue}</div>
          </div>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              alignSelf: "flex-start",
              background: "linear-gradient(135deg, #f28e25, #ef7a1a)",
              color: "#ffffff",
              padding: "16px 28px",
              borderRadius: 999,
              boxShadow: "0 14px 30px rgba(239,122,26,0.45)",
            }}
          >
            <div style={{ fontSize: 32, fontWeight: 800 }}>Quanto custa ir?</div>
            <div style={{ fontSize: 26, fontWeight: 600, marginLeft: 12, opacity: 0.95 }}>
              a partir de R$ 20 mil
            </div>
          </div>
        </div>
      </div>
    ),
    { ...size },
  );
}
