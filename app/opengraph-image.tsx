import { ImageResponse } from "next/og";

export const alt = "Sabor Financeiro - Saia das dívidas com clareza";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const risingChart = (w: number, h: number, stroke = "#d96813") => {
  const markup = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
      <defs>
        <linearGradient id="g" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stop-color="${stroke}" stop-opacity="0.22"/>
          <stop offset="1" stop-color="${stroke}" stop-opacity="0"/>
        </linearGradient>
      </defs>
      <path d="M0 ${h * 0.82} C ${w * 0.18} ${h * 0.78}, ${w * 0.3} ${h * 0.62}, ${w * 0.45} ${h * 0.58} S ${w * 0.7} ${h * 0.46}, ${w * 0.82} ${h * 0.26} S ${w * 0.95} ${h * 0.16}, ${w} ${h * 0.1} L ${w} ${h} L 0 ${h} Z" fill="url(#g)"/>
      <path d="M0 ${h * 0.82} C ${w * 0.18} ${h * 0.78}, ${w * 0.3} ${h * 0.62}, ${w * 0.45} ${h * 0.58} S ${w * 0.7} ${h * 0.46}, ${w * 0.82} ${h * 0.26} S ${w * 0.95} ${h * 0.16}, ${w} ${h * 0.1}" fill="none" stroke="${stroke}" stroke-width="10" stroke-linecap="round" stroke-linejoin="round"/>
      <circle cx="${w}" cy="${h * 0.1}" r="13" fill="${stroke}"/>
    </svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(markup)}`;
};

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          background: "#fbf7f1",
          padding: "64px",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
          <div
            style={{
              width: "48px",
              height: "48px",
              borderRadius: "13px",
              background: "linear-gradient(135deg, #f28e25 0%, #d96813 100%)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "white",
              fontSize: "27px",
              fontWeight: 800,
            }}
          >
            S
          </div>
          <div style={{ fontSize: "25px", fontWeight: 700, color: "#1f1d1c" }}>
            Sabor Financeiro
          </div>
        </div>

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            marginTop: "36px",
            gap: "6px",
          }}
        >
          <div
            style={{
              fontSize: "62px",
              fontWeight: 800,
              color: "#1f1d1c",
              letterSpacing: "-0.04em",
              lineHeight: 1,
            }}
          >
            Banco mostra o saldo de hoje.
          </div>
          <div
            style={{
              fontSize: "62px",
              fontWeight: 800,
              color: "#d96813",
              letterSpacing: "-0.04em",
              lineHeight: 1,
            }}
          >
            Sabor mostra para onde vai.
          </div>
        </div>

        <div
          style={{
            display: "flex",
            flex: 1,
            alignItems: "flex-end",
            marginTop: "8px",
          }}
        >
          <img src={risingChart(1072, 240)} width={1072} height={240} alt="" />
        </div>

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            fontSize: "23px",
            color: "#6b665f",
          }}
        >
          <div>Patrimônio, dívida e renda mês a mês.</div>
          <div style={{ fontWeight: 600, color: "#1f1d1c" }}>
            saborfinanceiro.com.br
          </div>
        </div>
      </div>
    ),
    { ...size },
  );
}
