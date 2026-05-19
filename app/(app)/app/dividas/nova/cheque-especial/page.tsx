import { PageShell } from "../../../_components/page-shell";

import { OverdraftForm } from "./_components/overdraft-form";

export default function ChequeEspecialPage() {
  return (
    <PageShell title="Novo cheque especial" description="Limite usado no banco com juros diários.">
      <OverdraftForm />
    </PageShell>
  );
}
