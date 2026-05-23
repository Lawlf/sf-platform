import { ImageResponse } from "next/og";

export const alt = "Sabor Financeiro - Compare Free e Pro";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function PrecosOg() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          padding: "64px",
          background: "linear-gradient(135deg, #fdf8f3 0%, #fbe9d4 100%)",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
          <div
            style={{
              width: "52px",
              height: "52px",
              borderRadius: "14px",
              background: "linear-gradient(135deg, #f28e25 0%, #d96813 100%)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "white",
              fontSize: "30px",
              fontWeight: 800,
            }}
          >
            S
          </div>
          <div style={{ fontSize: "26px", fontWeight: 700, color: "#1f1d1c" }}>
            Sabor Financeiro
          </div>
        </div>

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            fontSize: "68px",
            fontWeight: 800,
            color: "#1f1d1c",
            lineHeight: 1.05,
            letterSpacing: "-0.04em",
            marginTop: "40px",
          }}
        >
          <div style={{ display: "flex" }}>Tudo lado a lado.</div>
          <div style={{ display: "flex", color: "#d96813" }}>Sem letra miúda.</div>
        </div>

        <div
          style={{
            display: "flex",
            gap: "24px",
            marginTop: "44px",
          }}
        >
          <div
            style={{
              flex: 1,
              display: "flex",
              flexDirection: "column",
              padding: "28px 32px",
              borderRadius: "20px",
              background: "rgba(255, 255, 255, 0.6)",
              border: "1px solid rgba(31, 29, 28, 0.08)",
            }}
          >
            <div
              style={{
                fontSize: "22px",
                fontWeight: 700,
                color: "#4a4642",
              }}
            >
              Free
            </div>
            <div
              style={{
                fontSize: "48px",
                fontWeight: 800,
                color: "#1f1d1c",
                marginTop: "6px",
              }}
            >
              R$ 0
            </div>
            <div
              style={{
                fontSize: "18px",
                color: "#6b665f",
                marginTop: "4px",
              }}
            >
              pra sempre
            </div>
          </div>

          <div
            style={{
              flex: 1,
              display: "flex",
              flexDirection: "column",
              padding: "28px 32px",
              borderRadius: "20px",
              background: "linear-gradient(135deg, #f28e25 0%, #d96813 100%)",
              color: "white",
            }}
          >
            <div
              style={{
                fontSize: "22px",
                fontWeight: 700,
              }}
            >
              Pro
            </div>
            <div
              style={{
                fontSize: "48px",
                fontWeight: 800,
                marginTop: "6px",
              }}
            >
              R$ 14,90
            </div>
            <div
              style={{
                fontSize: "18px",
                marginTop: "4px",
                opacity: 0.92,
              }}
            >
              por mês
            </div>
          </div>
        </div>

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            fontSize: "20px",
            color: "#6b665f",
            marginTop: "auto",
          }}
        >
          <div>saborfinanceiro.com.br/precos</div>
          <div style={{ display: "flex", gap: "10px" }}>
            <span
              style={{
                padding: "5px 12px",
                borderRadius: "999px",
                background: "rgba(242, 142, 37, 0.14)",
                color: "#d96813",
                fontWeight: 600,
              }}
            >
              Sem fidelidade
            </span>
            <span
              style={{
                padding: "5px 12px",
                borderRadius: "999px",
                background: "rgba(242, 142, 37, 0.14)",
                color: "#d96813",
                fontWeight: 600,
              }}
            >
              Cancela quando quiser
            </span>
          </div>
        </div>
      </div>
    ),
    { ...size },
  );
}
