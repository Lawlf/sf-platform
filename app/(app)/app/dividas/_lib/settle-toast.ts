import { toast } from "sonner";

export interface SettleResult {
  outcome: "paid" | "acknowledged";
  paidOff: boolean;
  remainingFormatted: string | null;
}

export function showSettleToast(result: SettleResult): void {
  if (result.paidOff) {
    toast.success("Dívida quitada.");
    return;
  }
  if (result.outcome === "acknowledged") {
    toast.success("Marcado como pago.");
    return;
  }
  if (result.remainingFormatted) {
    toast.success("Pagamento registrado.", {
      description: `Ainda faltam ${result.remainingFormatted} nessa dívida.`,
    });
    return;
  }
  toast.success("Pagamento registrado.");
}
