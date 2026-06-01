import posthog from "posthog-js";

const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;

// App financeiro: autocapture pode trazer o texto do elemento clicado
// ($el_text), e um card de patrimônio/dívida mostraria um valor ali.
// Removemos texto e atributos legíveis dos eventos, mantendo só tag,
// classe, href e seletor (sabemos O QUE foi clicado, não o valor exibido).
const TEXT_PROPS = ["$el_text", "$elements_chain"];

if (key) {
  posthog.init(key, {
    api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST ?? "/ingest",
    ui_host: "https://us.posthog.com",
    person_profiles: "identified_only",
    capture_pageview: false,
    capture_pageleave: true,
    autocapture: true,
    // Nada é enviado até o usuário aceitar no banner (LGPD opt-in).
    opt_out_capturing_by_default: true,
    persistence: "localStorage+cookie",
    // App financeiro: mascara TODO texto e input no replay para nunca
    // capturar patrimônio, dívida ou renda do usuário.
    session_recording: {
      maskAllInputs: true,
      maskTextSelector: "*",
    },
    sanitize_properties: (properties) => {
      for (const prop of TEXT_PROPS) {
        if (prop in properties) delete properties[prop];
      }
      if (Array.isArray(properties.$elements)) {
        properties.$elements = properties.$elements.map(
          (el: Record<string, unknown>) => {
            const { $el_text, ...rest } = el;
            void $el_text;
            return rest;
          },
        );
      }
      return properties;
    },
    // npm/ESM import não expõe window.posthog (só o snippet inline faz).
    // A toolbar (bookmarklet) precisa dele para carregar.
    loaded: (ph) => {
      (window as unknown as { posthog: typeof ph }).posthog = ph;
    },
  });
}
