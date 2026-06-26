import type { ConservativeLevel } from "@/domain/services/safe-to-spend.service";

export type { ConservativeLevel };

export type ProfileType = "PF" | "PJ_MEI";
export type ProfileTaxClassification = "mei" | "manual";

export interface ProfileEntity {
  id: string;
  userId: string;
  type: ProfileType;
  linkedProfileId: string | null;
  displayName: string | null;
  isPrimary: boolean;
  checklistDebtDismissedAt?: Date | null;
  checklistGoalDismissedAt?: Date | null;
  taxClassification: ProfileTaxClassification | null;
  conservativeLevel: ConservativeLevel;
  createdAt: Date;
  updatedAt: Date;
}
