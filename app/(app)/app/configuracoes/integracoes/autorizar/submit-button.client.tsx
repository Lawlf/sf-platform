"use client";

import { Loader2 } from "lucide-react";
import { useFormStatus } from "react-dom";

export function AuthorizeSubmit() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      aria-busy={pending}
      className="focus-ring inline-flex items-center justify-center gap-2 rounded-2xl bg-[color:var(--color-brand-500)] px-4 py-3 text-[0.875rem] font-bold text-white transition-colors hover:bg-[color:var(--color-brand-600)] disabled:cursor-not-allowed disabled:opacity-70"
    >
      {pending ? <Loader2 size={16} strokeWidth={2} className="animate-spin" aria-hidden /> : null}
      {pending ? "Autorizando" : "Autorizar conexão"}
    </button>
  );
}
