"use server";

import { addMonthsClamped } from "@/domain/services/debt-calendar.service";
import {
  buildForwardMilestones,
  type ForwardMilestone,
} from "@/domain/services/forward-milestones.service";
import { clock, repos } from "@/infrastructure/container";
import { getActiveProfileId } from "@/presentation/http/middleware/active-profile";
import { getCurrentUser } from "@/presentation/http/middleware/cached-current-user";

const WINDOW_MONTHS = 24;

export async function fetchForwardMilestones(): Promise<ForwardMilestone[]> {
  const user = await getCurrentUser();
  if (!user) return [];

  const profileId = await getActiveProfileId();
  const now = clock.now();
  const rangeEnd = addMonthsClamped(now, WINDOW_MONTHS + 1);

  const [debts, transactions] = await Promise.all([
    repos.debts.listForProfile(profileId, { status: "active" }),
    repos.transactions.listForProfileInRange(profileId, now, rangeEnd),
  ]);

  return buildForwardMilestones({ now, debts, transactions, windowMonths: WINDOW_MONTHS });
}
