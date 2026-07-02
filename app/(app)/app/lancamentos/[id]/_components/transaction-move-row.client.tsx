"use client";

import { useQueryClient } from "@tanstack/react-query";
import { Wallet } from "lucide-react";
import { useEffect, useState, useTransition } from "react";
import { toast } from "sonner";

import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/app/components/ui/sheet";

import { ActionRow } from "../../../_components/action-row";
import { queryKeys } from "../../../_lib/query-keys";
import {
  listCashAccounts,
  type CashAccountOption,
} from "../../../linha-do-tempo/_actions/list-cash-accounts.action";
import { moveTransactionsAction } from "../../_actions/move-transactions.action";

interface Props {
  transactionId: string;
  currentAccountId: string | null;
  currentAccountLabel: string | null;
}

export function TransactionMoveRow({ transactionId, currentAccountId, currentAccountLabel }: Props) {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [accounts, setAccounts] = useState<CashAccountOption[] | null>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    if (!open || accounts !== null) return;
    void listCashAccounts().then(setAccounts);
  }, [open, accounts]);

  function move(targetAccountId: string, label: string) {
    startTransition(async () => {
      const r = await moveTransactionsAction({
        transactionIds: [transactionId],
        targetAccountId,
      });
      if (!r.ok) {
        toast.error(r.message);
        return;
      }
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["timeline"] }),
        queryClient.invalidateQueries({ queryKey: queryKeys.walletBalance }),
        queryClient.invalidateQueries({ queryKey: queryKeys.netWorth }),
      ]);
      toast.success(`Movido pra ${label}.`);
      setOpen(false);
    });
  }

  const options = (accounts ?? []).filter((a) => a.id !== currentAccountId);

  return (
    <>
      <ActionRow
        icon={Wallet}
        title="Mover para outra conta"
        subtitle={currentAccountLabel ? `Hoje em ${currentAccountLabel}` : ""}
        onClick={() => setOpen(true)}
      />
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="bottom" className="flex flex-col gap-1 px-3 pb-8 pt-3">
          <div
            className="mx-auto mb-3 h-1 w-10 rounded-full bg-[color:var(--border-strong)] md:hidden"
            aria-hidden
          />
          <SheetHeader className="px-3">
            <SheetTitle>Mover para onde?</SheetTitle>
          </SheetHeader>
          {options.length === 0 ? (
            <p className="px-3 py-6 text-center text-[0.8125rem] text-[color:var(--text-muted)]">
              Não tem outra conta pra mover.
            </p>
          ) : (
            options.map((a) => (
              <button
                key={a.id}
                type="button"
                disabled={pending}
                onClick={() => move(a.id, a.label)}
                className="focus-ring flex items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors hover:bg-[color:var(--surface-2)] disabled:opacity-50"
              >
                <Wallet size={16} strokeWidth={2} aria-hidden className="text-[color:var(--text-secondary)]" />
                <span className="text-[0.875rem] font-semibold text-[color:var(--text-primary)]">
                  {a.label}
                </span>
              </button>
            ))
          )}
        </SheetContent>
      </Sheet>
    </>
  );
}
