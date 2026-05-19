import type { Money } from "@/domain/value-objects/money.vo";

export type IncomeFrequency = "monthly" | "weekly" | "one_off";

export interface IncomeEntity {
  id: string;
  userId: string;
  label: string;
  amount: Money;
  frequency: IncomeFrequency;
  startDate: Date;
  endDate: Date | null;
  isActive: boolean;
}
