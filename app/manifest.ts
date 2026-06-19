import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/app",
    name: "Sabor Financeiro",
    short_name: "Sabor",
    description: "O sabor de uma vida financeira saudável.",
    start_url: "/app",
    scope: "/",
    display: "standalone",
    display_override: ["standalone"],
    launch_handler: { client_mode: "navigate-existing" },
    background_color: "#fdf8f3",
    theme_color: "#f28e25",
    lang: "pt-BR",
    dir: "ltr",
    orientation: "portrait",
    categories: ["finance", "productivity", "education"],
    shortcuts: [
      {
        name: "Dívidas",
        short_name: "Dívidas",
        description: "Ver e gerenciar dívidas",
        url: "/app/dividas",
      },
      {
        name: "Renda",
        short_name: "Renda",
        description: "Ver e gerenciar renda",
        url: "/app/renda",
      },
      {
        name: "Simular",
        short_name: "Simular",
        description: "Simuladores financeiros",
        url: "/app/simular",
      },
    ],
    screenshots: [
      {
        src: "/screenshots/home-narrow.png",
        sizes: "860x1854",
        type: "image/png",
        form_factor: "narrow",
        label: "Painel mensal de patrimônio, dívida e renda",
      },
      {
        src: "/screenshots/home-wide.png",
        sizes: "3228x2058",
        type: "image/png",
        form_factor: "wide",
        label: "Painel mensal de patrimônio, dívida e renda",
      },
    ],
    icons: [
      {
        src: "/icons/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-maskable-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "maskable",
      },
      {
        src: "/icons/icon-maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
