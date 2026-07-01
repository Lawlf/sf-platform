import { Users } from "lucide-react";
import type { Route } from "next";

import { ActionRow, ActionRowGroup } from "../../../_components/action-row";

export function HouseholdGoalNudge() {
  return (
    <ActionRowGroup>
      <ActionRow
        icon={Users}
        title="Essa meta é de vocês dois?"
        subtitle="Some a renda do casal e veja quanto falta juntos, no Nosso lar."
        href={"/app/lar" as Route}
      />
    </ActionRowGroup>
  );
}
