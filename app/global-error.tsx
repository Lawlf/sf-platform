"use client";

import { useEffect } from "react";

import "./globals.css";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <html lang="pt-BR" data-theme="dark">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          backgroundColor: "#1f1d1c",
          color: "#fdf8f3",
          fontFamily: "system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif",
          display: "flex",
          flexDirection: "column",
          alignItems: "stretch",
          justifyContent: "center",
          padding: "80px 24px",
        }}
      >
        <main
          style={{
            maxWidth: "640px",
            width: "100%",
            margin: "0 auto",
          }}
        >
          <div
            style={{
              width: "72px",
              height: "72px",
              borderRadius: "20px",
              background: "linear-gradient(135deg, #dc2626, #d96813)",
              boxShadow: "0 20px 40px -10px rgba(220, 38, 38, 0.45)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              marginBottom: "32px",
            }}
            aria-hidden
          >
            <svg
              width="34"
              height="34"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#ffffff"
              strokeWidth="2.25"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
              <path d="M12 9v4" />
              <path d="M12 17h.01" />
            </svg>
          </div>

          <p
            style={{
              fontSize: "12px",
              fontWeight: 700,
              textTransform: "uppercase",
              letterSpacing: "0.2em",
              color: "#f87171",
              margin: "0 0 12px",
            }}
          >
            Erro crítico
          </p>

          <h1
            style={{
              fontSize: "56px",
              fontWeight: 800,
              lineHeight: 1.02,
              letterSpacing: "-0.04em",
              margin: 0,
            }}
          >
            Essa página não carregou.
          </h1>

          <p
            style={{
              marginTop: "24px",
              maxWidth: "520px",
              fontSize: "17px",
              lineHeight: 1.55,
              color: "rgba(253,248,243,0.78)",
            }}
          >
            A página inteira parou de responder. Recarrega pra tentar de novo.
            Se continuar, a gente quer saber.
          </p>

          <div
            style={{
              marginTop: "32px",
              display: "flex",
              flexDirection: "row",
              flexWrap: "wrap",
              gap: "12px",
              alignItems: "center",
            }}
          >
            <button
              type="button"
              onClick={() => reset()}
              style={{
                height: "48px",
                padding: "0 24px",
                borderRadius: "999px",
                background: "linear-gradient(135deg, #f28e25, #ef7a1a)",
                color: "#ffffff",
                fontSize: "14px",
                fontWeight: 700,
                border: "none",
                cursor: "pointer",
                boxShadow: "0 12px 30px -8px rgba(239,122,26,0.5)",
              }}
            >
              Tentar de novo
            </button>
            {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
            <a
              href="/"
              style={{
                height: "48px",
                padding: "0 20px",
                display: "inline-flex",
                alignItems: "center",
                color: "rgba(253,248,243,0.78)",
                fontSize: "14px",
                fontWeight: 600,
                textDecoration: "none",
              }}
            >
              Voltar pra página inicial
            </a>
          </div>

          {error.digest ? (
            <p
              style={{
                marginTop: "40px",
                fontSize: "11px",
                color: "rgba(253,248,243,0.55)",
              }}
            >
              Código do erro:{" "}
              <span style={{ fontFamily: "ui-monospace, monospace" }}>
                {error.digest}
              </span>
            </p>
          ) : null}
        </main>
      </body>
    </html>
  );
}
