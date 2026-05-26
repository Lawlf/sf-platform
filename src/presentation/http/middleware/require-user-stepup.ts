import { cookies } from "next/headers";

import { USER_STEP_COOKIE, verifyUserStepUp } from "@/infrastructure/auth/user-stepup";
import { loadEnv } from "@/infrastructure/config/env";

export async function isUserSteppedUp(userId: string): Promise<boolean> {
  const token = (await cookies()).get(USER_STEP_COOKIE)?.value;
  const v = token ? await verifyUserStepUp(token, loadEnv().SESSION_COOKIE_SECRET) : null;
  return Boolean(v && v.userId === userId);
}
