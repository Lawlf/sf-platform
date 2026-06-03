"use client";

import { useFormStatus } from "react-dom";

import { Spinner } from "@/app/components/ui/spinner";

export function AuthorizeSubmit() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      aria-busy={pending}
      className="focus-ring inline-flex items-center justify-center gap-2 rounded-2xl bg-[color:var(--color-brand-500)] px-4 py-3 text-[0.875rem] font-bold text-white transition-colors hover:bg-[color:var(--color-brand-600)] disabled:cursor-not-allowed disabled:opacity-70"
    >
      {pending ? <Spinner size={16} decorative /> : null}
      {pending ? "Autorizando" : "Autorizar conexão"}
    </button>
  );
}
