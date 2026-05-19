import Link from "next/link";

import { Button } from "@/app/components/ui/button";

export default function HomePage() {
  return (
    <main className="flex min-h-screen items-center justify-center px-6">
      <section className="glass-light max-w-md p-8 text-center">
        <h1 className="text-3xl font-bold tracking-tight text-[color:var(--color-brand-800)]">
          Sabor Financeiro
        </h1>
        <p className="mt-2 text-sm opacity-80">Plataforma em construção.</p>
        <div className="mt-6 flex justify-center">
          <Button asChild>
            <Link href="/api/health">Verificar status</Link>
          </Button>
        </div>
      </section>
    </main>
  );
}
