import { PageShell } from "../../../_components/page-shell";

import { CreditCardForm } from "./_components/credit-card-form";

export default function CartaoPage() {
  return (
    <PageShell title="Novo cartão de crédito" description="Fatura, parcelamentos e saldo rotativo.">
      <CreditCardForm />
    </PageShell>
  );
}
