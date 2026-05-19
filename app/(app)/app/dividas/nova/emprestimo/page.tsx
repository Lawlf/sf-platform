import { PageShell } from "../../../_components/page-shell";

import { PersonalLoanForm } from "./_components/personal-loan-form";

export default function EmprestimoPage() {
  return (
    <PageShell
      title="Novo empréstimo"
      description="Consignado ou pessoal, com parcelas fixas mensais."
    >
      <PersonalLoanForm />
    </PageShell>
  );
}
