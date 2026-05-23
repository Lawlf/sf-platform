import type { ReactNode } from "react";

import { ImmersiveBottomBar } from "../_components/immersive-bottom-bar";

export default function ConteudoImmersiveLayout({ children }: { children: ReactNode }) {
  return (
    <div className="sf-conteudo-enter relative">
      <main className="relative mx-auto flex min-h-screen w-full max-w-md flex-col gap-4 px-4 pb-28 pt-6 md:max-w-2xl lg:max-w-4xl">
        <div className="bg-blob-top-right" aria-hidden />
        {children}
      </main>
      <div className="md:hidden">
        <ImmersiveBottomBar />
      </div>
    </div>
  );
}
