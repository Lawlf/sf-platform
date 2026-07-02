"use client";

import { useQueryClient } from "@tanstack/react-query";
import { EyeOff } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { toast } from "sonner";

import { ActionRow } from "../../../_components/action-row";
import { queryKeys } from "../../../_lib/query-keys";
import { bulkExcludeAction } from "../../_actions/bulk-exclude.action";

interface Props {
  transactionId: string;
  excluded: boolean;
}

export function TransactionExcludeToggle({ transactionId, excluded }: Props) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [pending, startTransition] = useTransition();

  function onClick() {
    startTransition(async () => {
      const r = await bulkExcludeAction({ transactionIds: [transactionId], excluded: !excluded });
      if (!r.ok) {
        toast.error(r.message);
        return;
      }
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["timeline"] }),
        queryClient.invalidateQueries({ queryKey: queryKeys.dashboardSnapshot }),
      ]);
      toast.success(excluded ? "Voltou a contar no mês." : "Tirado do mês.");
      router.refresh();
    });
  }

  return (
    <ActionRow
      icon={EyeOff}
      title="Não contar no mês"
      subtitle={
        excluded
          ? "Ativado — some dos totais do mês"
          : "Transferência entre contas ou algo que você quer ignorar"
      }
      onClick={() => {
        if (!pending) onClick();
      }}
      trailing={
        <span
          className={`rounded-full px-2 py-0.5 text-[0.625rem] font-bold uppercase tracking-wide ${
            excluded
              ? "bg-[color:var(--color-brand-500)]/15 text-[color:var(--color-brand-700)]"
              : "bg-[color:var(--surface-3)] text-[color:var(--text-muted)]"
          }`}
        >
          {excluded ? "Ativado" : "Desativado"}
        </span>
      }
    />
  );
}
