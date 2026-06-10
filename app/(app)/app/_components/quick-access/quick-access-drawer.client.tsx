"use client";

import { useQuery } from "@tanstack/react-query";
import dynamic from "next/dynamic";
import { Suspense, type ReactNode } from "react";

import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/app/components/ui/sheet";
import { Spinner } from "@/app/components/ui/spinner";

import { fetchActiveDebtsForSim, type SimDebt } from "../../_actions/sim-debts.action";

const PayoffForm = dynamic(() =>
  import("../../simular/quitacao/_components/payoff-form").then((m) => m.PayoffForm),
);
const ExtraForm = dynamic(() =>
  import("../../simular/extra/_components/extra-form").then((m) => m.ExtraForm),
);
const StrategyForm = dynamic(() =>
  import("../../simular/estrategia/_components/strategy-form").then((m) => m.StrategyForm),
);
const PurchaseSimulatorClient = dynamic(() =>
  import("../../simular/compra/_components/purchase-simulator.client").then(
    (m) => m.PurchaseSimulatorClient,
  ),
);
const IncomeForm = dynamic(() =>
  import("../../renda/_components/income-form").then((m) => m.IncomeForm),
);
const AssetWizardClient = dynamic(() =>
  import("../../patrimonio/novo/_components/asset-wizard.client").then((m) => m.AssetWizardClient),
);

interface DrawerConfig {
  title: string;
  description: string;
}

export const QUICK_ACCESS_DRAWER_CONFIG: Record<string, DrawerConfig> = {
  sim_quitacao: { title: "Projeção de quitação", description: "Quanto tempo até zerar a dívida?" },
  sim_extra: { title: "Pagamento extra", description: "Quanto adianta pagar mais por mês?" },
  sim_estrategia: {
    title: "Qual dívida pagar primeiro",
    description: "Menor saldo ou juro mais alto?",
  },
  sim_compra: {
    title: "Vale a pena comprar?",
    description: "Compare comprar agora vs investir o valor.",
  },
  add_income: {
    title: "Adicionar renda",
    description: "Salário, dividendos, freelances. Cadastre uma nova fonte.",
  },
  add_asset: {
    title: "Adicionar um bem",
    description: "Registre um bem ou investimento no seu patrimônio.",
  },
};

export const QUICK_ACCESS_DRAWER_KEYS = new Set(Object.keys(QUICK_ACCESS_DRAWER_CONFIG));

export function QuickAccessDrawer({
  itemKey,
  onClose,
}: {
  itemKey: string | null;
  onClose: () => void;
}) {
  const config = itemKey ? QUICK_ACCESS_DRAWER_CONFIG[itemKey] : undefined;
  const open = Boolean(config);

  return (
    <Sheet open={open} onOpenChange={(next) => (next ? null : onClose())}>
      <SheetContent side="bottom" className="max-h-[88vh] overflow-y-auto px-6 pb-8 pt-3">
        <div
          className="mx-auto mb-5 h-1 w-10 rounded-full bg-[color:var(--border-strong)] md:hidden"
          aria-hidden
        />
        {config ? (
          <>
            <SheetHeader className="gap-1">
              <SheetTitle>{config.title}</SheetTitle>
              <SheetDescription className="text-[0.75rem] text-[color:var(--text-secondary)]">
                {config.description}
              </SheetDescription>
            </SheetHeader>
            <div className="mt-4">
              {open ? (
                <Suspense
                  fallback={
                    <div className="flex h-32 items-center justify-center">
                      <Spinner size={20} />
                    </div>
                  }
                >
                  <DrawerBody itemKey={itemKey!} onClose={onClose} />
                </Suspense>
              ) : null}
            </div>
          </>
        ) : null}
      </SheetContent>
    </Sheet>
  );
}

function DrawerBody({ itemKey, onClose }: { itemKey: string; onClose: () => void }) {
  switch (itemKey) {
    case "sim_quitacao":
      return <DebtsGate>{(debts) => <PayoffForm debts={debts} />}</DebtsGate>;
    case "sim_extra":
      return <DebtsGate>{(debts) => <ExtraForm debts={debts} />}</DebtsGate>;
    case "sim_estrategia":
      return <DebtsGate>{(debts) => <StrategyForm debts={debts} />}</DebtsGate>;
    case "sim_compra":
      return <PurchaseSimulatorClient />;
    case "add_income":
      return <IncomeForm />;
    case "add_asset":
      return <AssetWizardClient onClose={onClose} />;
    default:
      return null;
  }
}

/** Loads active debts on demand; the debt-based simulators need them as props. */
function DebtsGate({ children }: { children: (debts: SimDebt[]) => ReactNode }) {
  const { data, isLoading } = useQuery({
    queryKey: ["sim-active-debts"],
    queryFn: fetchActiveDebtsForSim,
    staleTime: 5 * 60 * 1000,
  });

  if (isLoading || !data) {
    return <div className="h-32 animate-pulse rounded-2xl bg-[color:var(--surface-3)]" />;
  }
  if (data.length === 0) {
    return (
      <p className="rounded-2xl border border-[color:var(--border-soft)] bg-[color:var(--surface-3)] px-4 py-3 text-[0.8125rem] text-[color:var(--text-secondary)]">
        Cadastre uma dívida ativa para simular.
      </p>
    );
  }
  return <>{children(data)}</>;
}
