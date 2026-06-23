import type { Metadata } from "next";
import type { Route } from "next";

import { WhyExistsContent } from "@/app/(public)/_components/why-exists-content";

import { BackButton } from "../../../_components/back-button.client";

export const metadata: Metadata = { title: "Por que existe" };

export default function PorQueExisteAppPage() {
  return (
    <main className="relative pb-8 pt-6">
      <div aria-hidden className="bg-blob-top-right" />
      <div className="mx-auto max-w-2xl px-6">
        <BackButton fallbackHref={"/app/configuracoes/sobre" as Route} />
      </div>
      <WhyExistsContent cta={{ href: "/app", label: "Ver meu mês" }} />
    </main>
  );
}
