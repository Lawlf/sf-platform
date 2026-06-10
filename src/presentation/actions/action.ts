import { revalidatePath } from "next/cache";
import type { z, ZodTypeAny } from "zod";

import { requireUser } from "@/presentation/http/middleware/cached-current-user";
import { DomainError } from "@/shared/errors/domain-error";
import { isErr, type Result } from "@/shared/errors/result";

import { revalidateGroups, type RevalidateGroup } from "./revalidate-groups";

export type ActionResult<T = void> =
  | { ok: true; data: T }
  | { ok: false; message: string };

const GENERIC_ERROR = "Algo deu errado. Tente novamente.";

export class ActionError extends DomainError {
  readonly code = "ACTION_ERROR";
}

function isNextControlFlowError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "digest" in error &&
    typeof (error as { digest: unknown }).digest === "string" &&
    (error as { digest: string }).digest.startsWith("NEXT_")
  );
}

export function unwrap<T, E extends Error>(r: Result<T, E>): T {
  if (isErr(r)) throw r.error;
  return r.value;
}

export function action<S extends ZodTypeAny, T>(cfg: {
  schema: S;
  revalidates?: readonly RevalidateGroup[];
  revalidatePaths?: (data: NoInfer<T>, input: NoInfer<z.output<S>>) => readonly string[];
  handler: (input: z.output<S>, ctx: { userId: string }) => Promise<T>;
}): (raw?: FormData | unknown) => Promise<ActionResult<T>> {
  return async (raw?) => {
    const user = await requireUser();
    const input = raw instanceof FormData ? Object.fromEntries(raw.entries()) : raw;
    const parsed = cfg.schema.safeParse(input);
    if (!parsed.success) {
      return { ok: false, message: parsed.error.issues[0]?.message ?? "Entrada inválida." };
    }
    try {
      const data = await cfg.handler(parsed.data, { userId: user.id });
      if (cfg.revalidates?.length) revalidateGroups(cfg.revalidates);
      if (cfg.revalidatePaths) {
        for (const p of cfg.revalidatePaths(data, parsed.data)) revalidatePath(p);
      }
      return { ok: true, data };
    } catch (error) {
      if (isNextControlFlowError(error)) throw error;
      if (error instanceof DomainError) return { ok: false, message: error.message };
      console.error(error);
      return { ok: false, message: GENERIC_ERROR };
    }
  };
}
