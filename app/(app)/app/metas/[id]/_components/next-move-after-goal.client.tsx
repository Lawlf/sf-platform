"use client";

import { useEffect, useState } from "react";
import type { Route } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { fetchPrescription } from "@/app/(app)/app/_actions/prescription-queries";
import { moveCtaFor } from "@/app/(app)/app/_components/move-cta";
import { Spinner } from "@/app/components/ui/spinner";

type Payload = Awaited<ReturnType<typeof fetchPrescription>>;

export function NextMoveAfterGoal() {
  const [data, setData] = useState<Payload | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let active = true;
    fetchPrescription().then((d) => {
      if (active) {
        setData(d);
        setLoaded(true);
      }
    });
    return () => {
      active = false;
    };
  }, []);

  if (!loaded)
    return (
      <div className="flex justify-center py-4">
        <Spinner size={20} />
      </div>
    );

  if (!data || !data.hasPlan || !data.isPro || !data.prescription) {
    return (
      <Link
        href={"/app/metas/nova" as Route}
        className="inline-flex items-center gap-1.5 text-sm font-semibold text-[color:var(--color-brand-800)] hover:underline"
      >
        Criar nova meta <ArrowRight size={16} aria-hidden />
      </Link>
    );
  }

  const move = data.prescription.dominant;
  if (!move) {
    return (
      <Link
        href={"/app/metas/nova" as Route}
        className="inline-flex items-center gap-1.5 text-sm font-semibold text-[color:var(--color-brand-800)] hover:underline"
      >
        Criar nova meta <ArrowRight size={16} aria-hidden />
      </Link>
    );
  }

  const cta = moveCtaFor({ type: move.type, targetDebtId: move.targetDebtId ?? null });

  return (
    <div className="flex flex-col gap-1">
      <p className="text-sm opacity-80">Seu próximo movimento:</p>
      {cta ? (
        <Link
          href={cta.href as Route}
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-[color:var(--color-brand-800)] hover:underline"
        >
          {cta.label} <ArrowRight size={16} aria-hidden />
        </Link>
      ) : (
        <Link
          href={"/app/metas/nova" as Route}
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-[color:var(--color-brand-800)] hover:underline"
        >
          Criar nova meta <ArrowRight size={16} aria-hidden />
        </Link>
      )}
    </div>
  );
}
