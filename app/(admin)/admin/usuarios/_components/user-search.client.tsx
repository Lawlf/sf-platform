"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";

export function UserSearch() {
  const router = useRouter();
  const params = useSearchParams();
  const [q, setQ] = useState(params.get("q") ?? "");

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const next = new URLSearchParams();
    if (q.trim()) next.set("q", q.trim());
    router.push(`/admin/usuarios?${next.toString()}`);
  }

  return (
    <form onSubmit={submit} className="flex gap-2">
      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Buscar por email…"
        className="focus-ring w-full max-w-sm rounded-xl border border-[color:var(--border-soft)] bg-[color:var(--surface-1)] px-3 py-2 text-[0.875rem] text-[color:var(--text-primary)]"
      />
      <button
        type="submit"
        className="focus-ring rounded-xl border border-[color:var(--border-soft)] bg-[color:var(--surface-2)] px-4 py-2 text-[0.875rem] font-semibold text-[color:var(--text-primary)]"
      >
        Buscar
      </button>
    </form>
  );
}
