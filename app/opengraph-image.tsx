import { ImageResponse } from "next/og";

export const alt = "Sabor Financeiro - Saia das dívidas com clareza";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "72px",
          background: "linear-gradient(135deg, #fdf8f3 0%, #fbe9d4 100%)",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
          <div
            style={{
              width: "56px",
              height: "56px",
              borderRadius: "16px",
              background: "linear-gradient(135deg, #f28e25 0%, #d96813 100%)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "white",
              fontSize: "32px",
              fontWeight: 800,
            }}
          >
            S
          </div>
          <div style={{ fontSize: "28px", fontWeight: 700, color: "#1f1d1c" }}>
            Sabor Financeiro
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
          <div
            style={{
              fontSize: "76px",
              fontWeight: 800,
              color: "#1f1d1c",
              lineHeight: 1.02,
              letterSpacing: "-0.04em",
            }}
          >
            Banco mostra saldo.
          </div>
          <div
            style={{
              fontSize: "76px",
              fontWeight: 800,
              color: "#d96813",
              lineHeight: 1.02,
              letterSpacing: "-0.04em",
            }}
          >
            Sabor mostra trajetória.
          </div>
          <div
            style={{
              fontSize: "30px",
              color: "#4a4642",
              marginTop: "16px",
              maxWidth: "880px",
              lineHeight: 1.3,
            }}
          >
            Painel macro de patrimônio, dívida e renda. Sem conectar banco.
          </div>
        </div>

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            fontSize: "22px",
            color: "#6b665f",
          }}
        >
          <div>saborfinanceiro.com.br</div>
          <div style={{ display: "flex", gap: "12px" }}>
            <span
              style={{
                padding: "6px 14px",
                borderRadius: "999px",
                background: "rgba(242, 142, 37, 0.12)",
                color: "#d96813",
                fontWeight: 600,
              }}
            >
              LGPD
            </span>
            <span
              style={{
                padding: "6px 14px",
                borderRadius: "999px",
                background: "rgba(242, 142, 37, 0.12)",
                color: "#d96813",
                fontWeight: 600,
              }}
            >
              PWA
            </span>
          </div>
        </div>
      </div>
    ),
    { ...size },
  );
}
