import Link from "next/link";

import { Button } from "@/app/components/ui/button";

export default function NotFound() {
  return (
    <main className="flex min-h-screen items-center justify-center px-6">
      <section className="glass-light max-w-md p-8 text-center">
        <h1 className="text-2xl font-semibold">Página não encontrada</h1>
        <p className="mt-2 text-sm opacity-80">Verifique o endereço ou volte ao início.</p>
        <div className="mt-6 flex justify-center">
          <Button asChild>
            <Link href="/">Voltar ao início</Link>
          </Button>
        </div>
      </section>
    </main>
  );
}
