import { repos } from "@/infrastructure/container";

import { fmtBRL, fmtDate } from "../_lib/format";

import { CreatePlanDialog } from "./_components/create-plan-dialog.client";
import { TogglePlanButton } from "./_components/toggle-plan-button.client";

const INTERVAL_LABEL: Record<string, string> = {
  month: "Mensal",
  year: "Anual",
  lifetime: "Vitalício",
};

export default async function PlanosPage() {
  const plans = await repos.plans.findAll();

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-[color:var(--text-primary)]">Planos</h1>
        <CreatePlanDialog />
      </div>

      <section className="glass-light overflow-x-auto rounded-2xl p-4">
        <table className="w-full border-collapse text-[0.8125rem]">
          <thead>
            <tr className="text-left text-[color:var(--text-muted)]">
              <th scope="col" className="pb-2">Nome</th>
              <th scope="col" className="pb-2">Slug</th>
              <th scope="col" className="pb-2">Intervalo</th>
              <th scope="col" className="pb-2">Preço</th>
              <th scope="col" className="pb-2">Provedor</th>
              <th scope="col" className="pb-2">Status</th>
              <th scope="col" className="pb-2">Atualizado</th>
              <th scope="col" className="pb-2">Ação</th>
            </tr>
          </thead>
          <tbody>
            {plans.map((p) => (
              <tr key={p.id} className="border-t border-[color:var(--border-soft)] align-middle">
                <td className="py-2 font-medium text-[color:var(--text-primary)]">{p.name}</td>
                <td className="py-2 text-[color:var(--text-secondary)]">{p.slug}</td>
                <td className="py-2 text-[color:var(--text-secondary)]">
                  {INTERVAL_LABEL[p.billingInterval] ?? p.billingInterval}
                </td>
                <td className="py-2 text-[color:var(--text-secondary)]">{fmtBRL(p.priceCents)}</td>
                <td className="py-2 text-[color:var(--text-secondary)]">{p.provider}</td>
                <td className="py-2">
                  <span
                    className={`rounded-full px-2 py-0.5 text-[0.6875rem] font-bold ${
                      p.active
                        ? "bg-[color:var(--semantic-positive)]/15 text-[color:var(--semantic-positive)]"
                        : "bg-[color:var(--surface-2)] text-[color:var(--text-muted)]"
                    }`}
                  >
                    {p.active ? "Ativo" : "Pausado"}
                  </span>
                </td>
                <td className="py-2 text-[color:var(--text-secondary)]">{fmtDate(p.updatedAt)}</td>
                <td className="py-2">
                  <TogglePlanButton planId={p.id} name={p.name} active={p.active} />
                </td>
              </tr>
            ))}
            {plans.length === 0 ? (
              <tr>
                <td colSpan={8} className="py-6 text-center text-[color:var(--text-muted)]">
                  Nenhum plano cadastrado.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </section>
    </div>
  );
}
