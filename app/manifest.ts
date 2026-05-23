import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Sabor Financeiro",
    short_name: "Sabor",
    description: "O sabor de uma vida financeira saudável.",
    start_url: "/",
    display: "standalone",
    background_color: "#fdf8f3",
    theme_color: "#f28e25",
    lang: "pt-BR",
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
