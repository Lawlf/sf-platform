"use client";

import { WizardField } from "./wizard-field";
import { WizardRadioCard } from "./wizard-radio-card";

type Scenario = "new" | "ongoing";

interface Props {
  label: string;
  active: Scenario;
  onSelect: (next: Scenario) => void;
  newTitle?: string;
  newDescription?: string;
  ongoingTitle?: string;
  ongoingDescription?: string;
}

export function ScenarioPicker({
  label,
  active,
  onSelect,
  newTitle = "Não, acabei de contratar",
  newDescription = "Comecei agora",
  ongoingTitle = "Sim, estou pagando",
  ongoingDescription = "Já paguei parcelas",
}: Props) {
  return (
    <WizardField label={label}>
      <div className="grid grid-cols-2 gap-2">
        <WizardRadioCard
          title={newTitle}
          description={newDescription}
          active={active === "new"}
          onSelect={() => onSelect("new")}
        />
        <WizardRadioCard
          title={ongoingTitle}
          description={ongoingDescription}
          active={active === "ongoing"}
          onSelect={() => onSelect("ongoing")}
        />
      </div>
    </WizardField>
  );
}
