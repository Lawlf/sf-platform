import { PageShell } from "../../_components/page-shell";

import { KindPicker } from "./_components/kind-picker";

export default function NovaDividaPage() {
  return (
    <PageShell title="Nova dívida" description="Escolha o tipo de dívida para começar.">
      <KindPicker />
    </PageShell>
  );
}
