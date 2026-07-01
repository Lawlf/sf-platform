import { Coins } from "lucide-react";
import type { Route } from "next";

import { ActionRow, ActionRowGroup } from "../../../_components/action-row";

export function LinkedAssetCard({ assets }: { assets: { id: string; label: string }[] }) {
  if (assets.length === 0) return null;

  return (
    <section className="flex flex-col gap-2">
      <h2 className="px-1 text-sm font-semibold text-[color:var(--text-primary)]">
        {assets.length === 1 ? "Bem ligado a essa dívida" : "Bens ligados a essa dívida"}
      </h2>
      <ActionRowGroup>
        {assets.map((a) => (
          <ActionRow
            key={a.id}
            icon={Coins}
            title={a.label}
            subtitle="Ver o custo total"
            href={`/app/patrimonio/${a.id}` as Route}
          />
        ))}
      </ActionRowGroup>
    </section>
  );
}
