import { readFileSync } from "node:fs";
import { join } from "node:path";

import { ImageResponse } from "next/og";

export const alt = "Sabor Financeiro - Compare Free e Pro";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const logo = `data:image/png;base64,${readFileSync(
  join(process.cwd(), "public/icons/icon-512.png"),
).toString("base64")}`;

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
          background: "#fbf7f1",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
          <img src={logo} width={56} height={56} alt="" />
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
              background: "#ffffff",
              border: "1px solid rgba(31, 29, 28, 0.08)",
            }}
          >
            <div style={{ fontSize: "22px", fontWeight: 700, color: "#4a4642" }}>
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
            <div style={{ fontSize: "18px", color: "#6b665f", marginTop: "4px" }}>
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
            <div style={{ fontSize: "22px", fontWeight: 700 }}>Pro</div>
            <div style={{ fontSize: "48px", fontWeight: 800, marginTop: "6px" }}>
              R$ 19,90
            </div>
            <div style={{ fontSize: "18px", marginTop: "4px", opacity: 0.92 }}>
              por mês
            </div>
          </div>
        </div>

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            fontSize: "22px",
            color: "#6b665f",
            marginTop: "auto",
          }}
        >
          <div>Sem fidelidade. Cancela quando quiser.</div>
          <div style={{ fontWeight: 600, color: "#1f1d1c" }}>
            saborfinanceiro.com.br/precos
          </div>
        </div>
      </div>
    ),
    { ...size },
  );
}
