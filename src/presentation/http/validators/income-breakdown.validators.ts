import { z } from "zod";

import type { IncomeSourceBreakdown } from "@/domain/entities/income.entity";

const dailyLineSchema = z.object({
  label: z.string().max(40).optional(),
  count: z.number().int().min(0).max(400),
  valuePerShiftCents: z.number().int().min(0),
  hoursPerShift: z.number().min(0).max(24).optional(),
});

export const incomeSourceBreakdownSchema = z.discriminatedUnion(
  "basis",
  [
    z.object({ basis: z.literal("daily"), lines: z.array(dailyLineSchema).min(1).max(10) }),
    z.object({
      basis: z.literal("hourly"),
      hourlyCents: z.number().int().min(0),
      hoursPerWeek: z.number().min(0).max(168),
    }),
  ],
);

export function parseBreakdownJson(raw: string | null): IncomeSourceBreakdown | null {
  if (raw === null || raw === "") return null;
  try {
    const parsed = incomeSourceBreakdownSchema.safeParse(JSON.parse(raw));
    return parsed.success ? (parsed.data as IncomeSourceBreakdown) : null;
  } catch {
    return null;
  }
}
