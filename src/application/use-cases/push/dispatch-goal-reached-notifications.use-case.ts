import type { UserRepositoryPort } from "@/domain/ports/repositories/user.repository";

import type { ReachedGoal } from "../goal/capture-goal-snapshots.use-case";

import type { SendPushToUserDeps } from "./send-push-to-user.use-case";
import { sendPushToUser } from "./send-push-to-user.use-case";

export interface DispatchGoalReachedDeps extends SendPushToUserDeps {
  users: UserRepositoryPort;
}

export interface DispatchGoalReachedResult {
  pushesSent: number;
}

/**
 * Para cada meta recentemente atingida, envia uma push notification Pro.
 * Respeita o master switch (pushEnabled) e o toggle monthlySummaryEnabled,
 * que cobre eventos macro mensais (metas incluidas).
 */
export async function dispatchGoalReachedNotifications(
  deps: DispatchGoalReachedDeps,
  reached: ReachedGoal[],
): Promise<DispatchGoalReachedResult> {
  if (reached.length === 0) return { pushesSent: 0 };

  // Index Pro users to avoid sending pushes to Free users.
  const proUsers = await deps.users.findAllPro();
  const proUserIds = new Set(proUsers.map((u) => u.id));

  let pushesSent = 0;

  for (const goal of reached) {
    if (!proUserIds.has(goal.userId)) continue;

    const result = await sendPushToUser(deps, {
      userId: goal.userId,
      kind: "monthlySummaryEnabled",
      payload: {
        title: "Você bateu sua meta",
        body: `"${goal.title}" foi concluída. Parabéns!`,
        url: "/app/metas",
        tag: `goal-reached-${goal.goalId}`,
      },
    });

    pushesSent += result.delivered;
  }

  return { pushesSent };
}
