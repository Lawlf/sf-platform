import { getUpcomingDueDates } from "@/application/use-cases/dashboard/get-upcoming-due-dates.use-case";
import type { Clock } from "@/domain/ports/clock.port";
import { clock, repos } from "@/infrastructure/container";
import { getCurrentUser } from "@/presentation/http/middleware/cached-current-user";
import { getActiveProfileId } from "@/presentation/http/middleware/active-profile";
import { isOk } from "@/shared/errors/result";

export interface UpcomingDuePayload {
  debtId: string;
  label: string;
  daysUntil: number;
  amountFormatted: string | null;
}

const BANNER_HORIZON_DAYS = 7;

export async function fetchUpcomingDues(): Promise<UpcomingDuePayload[]> {
  const user = await getCurrentUser();
  if (!user) return [];

  const profileId = await getActiveProfileId();
  const today = startOfLocalDay(clock.now());
  const dayClock: Clock = { now: () => today };

  const result = await getUpcomingDueDates(
    { debts: repos.debts, clock: dayClock },
    { userId: user.id, profileId, horizonDays: BANNER_HORIZON_DAYS },
  );
  const dues = isOk(result) ? result.value : [];

  return dues.map((d) => ({
    debtId: d.debtId,
    label: d.label,
    daysUntil: calendarDaysBetween(today, startOfLocalDay(d.dueDate)),
    amountFormatted: d.amount ? d.amount.format() : null,
  }));
}

export async function fetchHasDueDatedDebt(): Promise<boolean> {
  const user = await getCurrentUser();
  if (!user) return false;

  const profileId = await getActiveProfileId();
  const debts = await repos.debts.listForProfile(profileId, { status: "active" });
  return debts.some((d) => {
    if (d.kind === "credit_card") return true;
    if (d.kind === "personal_loan") return true;
    if (d.kind === "recurring") return d.recurringFrequency === "monthly";
    return false;
  });
}

function startOfLocalDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function calendarDaysBetween(from: Date, to: Date): number {
  const a = Date.UTC(from.getFullYear(), from.getMonth(), from.getDate());
  const b = Date.UTC(to.getFullYear(), to.getMonth(), to.getDate());
  return Math.round((b - a) / 86400000);
}
