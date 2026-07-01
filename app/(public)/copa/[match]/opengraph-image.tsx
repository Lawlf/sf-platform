import { ImageResponse } from "next/og";

import { COPA_MATCHES, getCopaMatch } from "../_lib/copa-2026.config";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const dynamicParams = false;

export function generateStaticParams(): { match: string }[] {
  return COPA_MATCHES.map((m) => ({ match: m.slug }));
}

export default async function OgImage({ params }: { params: Promise<{ match: string }> }) {
  const { match: slug } = await params;
  const match = getCopaMatch(slug);
  const title = match ? `${match.homeTeam} x ${match.awayTeam}` : "Copa 2026";
  const subtitle = match ? `${match.stageLabel} · ${match.venueCity}` : "Quanto custa ir?";

  return new ImageResponse(
    (
      <div
        style={{
          height: "100%",
          width: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: "80px",
          background: "linear-gradient(135deg, #fff7ed, #ffedd5)",
        }}
      >
        <div style={{ fontSize: 34, fontWeight: 600, color: "#b45309" }}>
          Quanto custa ver o Brasil na Copa 2026
        </div>
        <div style={{ fontSize: 84, fontWeight: 800, color: "#1c1917", marginTop: 12, letterSpacing: "-0.03em" }}>
          {title}
        </div>
        <div style={{ fontSize: 38, color: "#57534e", marginTop: 8 }}>{subtitle}</div>
        <div style={{ fontSize: 30, color: "#ef7a1a", marginTop: 40, fontWeight: 700 }}>
          Sabor Financeiro
        </div>
      </div>
    ),
    { ...size },
  );
}
