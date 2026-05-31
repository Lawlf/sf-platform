import type { Metadata } from "next";
import type { ReactNode } from "react";

import { requireUser } from "@/presentation/http/middleware/cached-current-user";

export const metadata: Metadata = {
  robots: { index: false, follow: false, nocache: true },
};

export default async function OnboardingLayout({ children }: { children: ReactNode }) {
  // Auth gate, but no app chrome (no sidebar/topbar).
  await requireUser();

  return (
    <div className="bg-warm-gradient relative min-h-screen">
      <div className="bg-blob-bottom-left hidden md:block" aria-hidden />
      <div className="bg-blob-mid" aria-hidden />
      <main className="relative mx-auto flex min-h-screen w-full max-w-[560px] flex-col px-5 py-8">
        {children}
      </main>
    </div>
  );
}
