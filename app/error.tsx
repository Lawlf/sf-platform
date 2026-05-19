"use client";

import { useEffect } from "react";

import { Button } from "@/app/components/ui/button";

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
    <main className="flex min-h-screen items-center justify-center px-6">
      <section className="glass-light max-w-md p-8 text-center">
        <h1 className="text-2xl font-semibold">Algo deu errado</h1>
        <p className="mt-2 text-sm opacity-80">
          Tente novamente. Se o erro continuar, fale com o suporte.
        </p>
        <div className="mt-6 flex justify-center">
          <Button onClick={() => reset()}>Tentar novamente</Button>
        </div>
      </section>
    </main>
  );
}
