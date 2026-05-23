import type { Route } from "next";
import Link from "next/link";

import { GoogleG } from "@/app/components/icons/google-g";

export function OAuthButtons() {
  return (
    <div className="flex flex-col gap-2">
      <Link
        href={"/api/auth/google/start" as Route}
        aria-label="Entrar com Google"
        className="focus-ring inline-flex w-full items-center justify-center gap-2.5 rounded-xl border-[1.5px] border-[color:var(--border-soft)] bg-[color:var(--surface-1)] px-4 py-3 text-[14px] font-semibold text-[color:var(--text-primary)] transition-colors hover:bg-[color:var(--surface-1)]"
      >
        <GoogleG size={18} />
        Entrar com Google
      </Link>
    </div>
  );
}
