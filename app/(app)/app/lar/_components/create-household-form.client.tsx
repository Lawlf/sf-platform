"use client";

import { Home } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { Button } from "@/app/components/ui/button";

import { createHouseholdAction } from "../../_actions/household-actions";

export function CreateHouseholdForm() {
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) {
      setError("Dê um nome ao lar.");
      return;
    }
    setError(null);
    startTransition(async () => {
      const result = await createHouseholdAction({ name: trimmed });
      if (!result.ok) {
        setError(result.message);
      } else {
        setName("");
        router.refresh();
      }
    });
  }

  return (
    <section className="flex flex-col gap-4 rounded-2xl border border-dashed border-[color:var(--color-brand-500)]/50 bg-[color:var(--surface-1)] p-5">
      <div className="flex items-center gap-3">
        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[color:var(--color-brand-500)]/[0.14] text-[color:var(--color-brand-800)]">
          <Home size={18} strokeWidth={1.75} aria-hidden />
        </span>
        <div>
          <h2 className="text-base font-bold text-[color:var(--text-primary)]">Criar um lar</h2>
          <p className="text-[0.75rem] text-[color:var(--text-secondary)]">
            Convide sua família ou parceiro para acompanhar juntos.
          </p>
        </div>
      </div>
      <form onSubmit={handleSubmit} className="flex flex-col gap-2">
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Nome do lar (ex.: Família Silva)"
          disabled={pending}
          className="focus-ring rounded-lg border border-[color:var(--border-soft)] bg-[color:var(--surface-2)] px-3 py-2 text-[0.875rem] text-[color:var(--text-primary)] placeholder:text-[color:var(--text-muted)] disabled:opacity-50"
        />
        {error ? (
          <p className="text-[0.75rem] font-semibold text-[color:var(--semantic-negative)]">{error}</p>
        ) : null}
        <Button type="submit" loading={pending} className="mt-1">
          Criar lar
        </Button>
      </form>
    </section>
  );
}
