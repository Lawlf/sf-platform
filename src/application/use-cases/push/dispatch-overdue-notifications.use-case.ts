import type { NotificationPreferencesRepositoryPort } from "@/domain/ports/repositories/notification-preferences.repository";
import type { UserRepositoryPort } from "@/domain/ports/repositories/user.repository";
import { isOk, type Result } from "@/shared/errors/result";

import type { OverdueItem } from "@/application/use-cases/debt/get-overdue-debts.use-case";
import type { SendPushToUserDeps } from "./send-push-to-user.use-case";
import { sendPushToUser } from "./send-push-to-user.use-case";

export interface DispatchOverdueDeps extends SendPushToUserDeps {
  users: UserRepositoryPort;
  preferences: NotificationPreferencesRepositoryPort;
  detectOverdue: (input: {
    userId: string;
    profileId: string;
  }) => Promise<Result<{ created: OverdueItem[] }, never>>;
  resolveProfileId: (userId: string) => Promise<string>;
}

export interface DispatchOverdueResult {
  usersTargeted: number;
  pushesSent: number;
}

export async function dispatchOverdueNotifications(
  deps: DispatchOverdueDeps,
): Promise<DispatchOverdueResult> {
  const proUsers = await deps.users.findAllPro();
  let usersTargeted = 0;
  let pushesSent = 0;

  for (const user of proUsers) {
    const prefs = await deps.preferences.findForUser(user.id);
    if (prefs && (!prefs.pushEnabled || !prefs.debtDueEnabled)) continue;

    const profileId = await deps.resolveProfileId(user.id);
    const detected = await deps.detectOverdue({ userId: user.id, profileId });
    const created = isOk(detected) ? detected.value.created : [];
    if (created.length === 0) continue;

    const result = await sendPushToUser(deps, {
      userId: user.id,
      kind: "debtDueEnabled",
      payload: {
        title: created.length === 1 ? `Venceu o ${created[0]!.label}` : "Contas venceram",
        body:
          created.length === 1
            ? "Hoje era o dia. Você já pagou?"
            : `${created.length} compromissos venceram. Você já resolveu?`,
        url: "/app/dividas",
        tag: "debt-overdue",
      },
    });
    if (!result.skipped) {
      usersTargeted++;
      pushesSent += result.delivered;
    }
  }

  return { usersTargeted, pushesSent };
}
