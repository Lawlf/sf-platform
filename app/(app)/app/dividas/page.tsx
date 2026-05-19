import type { Route } from "next";
import Link from "next/link";

import { Button } from "@/app/components/ui/button";
import { listDebts } from "@/application/use-cases/debt/list-debts.use-case";
import { WebCryptoHasher } from "@/infrastructure/auth/web-crypto-hasher";
import { DrizzleDebtRepository } from "@/infrastructure/persistence/drizzle/repositories/drizzle-debt.repository";
import { DrizzleSessionRepository } from "@/infrastructure/persistence/drizzle/repositories/drizzle-session.repository";
import { DrizzleUserRepository } from "@/infrastructure/persistence/drizzle/repositories/drizzle-user.repository";
import { requireUser } from "@/presentation/http/middleware/require-user";
import { isOk } from "@/shared/errors";

import { PageShell } from "../_components/page-shell";

const KIND_LABEL: Record<string, string> = {
  financing: "Financiamento",
  personal_loan: "Empréstimo pessoal",
  credit_card: "Cartão de crédito",
  overdraft: "Cheque especial",
};

const STATUS_LABEL: Record<string, string> = {
  active: "Ativa",
  paid_off: "Quitada",
  written_off: "Baixada",
};

interface PageProps {
  searchParams: Promise<{ status?: string }>;
}

export default async function DividasPage({ searchParams }: PageProps) {
  const sp = await searchParams;
  const statusFilter =
    sp.status === "all" || sp.status === "paid_off" || sp.status === "written_off"
      ? sp.status
      : "active";

  const user = await requireUser({
    sessions: new DrizzleSessionRepository(),
    users: new DrizzleUserRepository(),
    hasher: new WebCryptoHasher(),
    now: new Date(),
  });

  const listed = await listDebts(
    { debts: new DrizzleDebtRepository() },
    { userId: user.id, status: statusFilter },
  );
  const debts = isOk(listed) ? listed.value : [];

  return (
    <PageShell title="Dívidas" description="Acompanhe e simule a quitação das suas dívidas.">
      <nav className="flex gap-2 text-xs">
        {(["active", "paid_off", "all"] as const).map((s) => (
          <Link
            key={s}
            href={s === "active" ? "/app/dividas" : (`/app/dividas?status=${s}` as Route)}
            className={`rounded-full border border-black/10 px-3 py-1 ${
              statusFilter === s ? "bg-[color:var(--color-brand-500)] text-white" : "bg-white/40"
            }`}
          >
            {s === "all" ? "Todas" : STATUS_LABEL[s]}
          </Link>
        ))}
      </nav>

      <Button asChild>
        <Link href="/app/dividas/nova">Cadastrar nova dívida</Link>
      </Button>

      {debts.length === 0 ? (
        <p className="text-sm opacity-70">
          Nenhuma dívida {statusFilter === "active" ? "ativa" : "encontrada"}.
        </p>
      ) : (
        <div className="flex flex-col gap-2">
          {debts.map((d) => (
            <Link
              key={d.id}
              href={`/app/dividas/${d.id}` as Route}
              className="glass-light flex items-center justify-between gap-4 p-4 transition-colors hover:bg-white/70"
            >
              <div className="text-sm">
                <p className="font-medium">{d.label}</p>
                <p className="opacity-70">
                  {KIND_LABEL[d.kind]} - saldo {d.currentBalance.format()}
                </p>
              </div>
              <span className="rounded-full bg-white/60 px-2 py-1 text-xs">
                {STATUS_LABEL[d.status]}
              </span>
            </Link>
          ))}
        </div>
      )}
    </PageShell>
  );
}
