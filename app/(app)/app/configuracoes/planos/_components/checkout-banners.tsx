import { RetryPaymentButton } from "./retry-payment-button.client";

export function CheckoutCanceledBanner() {
  return (
    <div className="rounded-2xl border border-[color:var(--border-soft)] bg-[color:var(--surface-2)] p-4">
      <p className="text-[0.8125rem] font-semibold text-[color:var(--text-primary)]">
        Compra cancelada.
      </p>
      <p className="mt-1 text-[0.75rem] text-[color:var(--text-secondary)]">
        Nada foi cobrado. Você pode tentar de novo quando quiser.
      </p>
    </div>
  );
}

export function PastDueBanner({ accessUntil }: { accessUntil: string }) {
  return (
    <div className="rounded-2xl border border-amber-500/40 bg-amber-500/10 p-4">
      <p className="text-[0.8125rem] font-semibold text-amber-800">Pagamento falhou.</p>
      <p className="mt-1 text-[0.75rem] text-amber-800/80">
        Vamos tentar de novo automaticamente. Acesso Pro até {accessUntil}. Quer resolver agora?
      </p>
      <RetryPaymentButton />
    </div>
  );
}

export function CardUpdatedBanner() {
  return (
    <div className="rounded-2xl border border-emerald-500/40 bg-emerald-500/10 p-4">
      <p className="text-[0.8125rem] font-semibold text-emerald-700">Cartão atualizado.</p>
    </div>
  );
}
