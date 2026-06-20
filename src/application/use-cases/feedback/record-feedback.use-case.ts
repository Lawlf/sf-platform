import type { Clock } from "@/domain/ports/clock.port";

export interface RecordFeedbackDeps {
  feedback: {
    record(input: {
      id: string;
      userId: string;
      surface: string;
      sentiment: "up" | "down" | null;
      comment: string | null;
      kind: string | null;
      attachmentKeys: string[];
      createdAt: Date;
    }): Promise<void>;
  };
  clock: Clock;
  newId: () => string;
}

export type RecordFeedbackResult = { ok: true } | { ok: false; message: string };

const MAX_COMMENT = 2000;
const SURFACE_RE = /^[a-z0-9:_-]{1,64}$/;
const KINDS = ["problema", "sugestao", "duvida"] as const;

export async function recordFeedback(
  deps: RecordFeedbackDeps,
  input: {
    userId: string;
    surface: string;
    sentiment?: "up" | "down" | undefined;
    comment?: string | undefined;
    kind?: string | undefined;
    attachmentKeys?: string[] | undefined;
  },
): Promise<RecordFeedbackResult> {
  if (!SURFACE_RE.test(input.surface)) {
    return { ok: false, message: "Origem de feedback inválida." };
  }
  if (input.sentiment !== undefined && input.sentiment !== "up" && input.sentiment !== "down") {
    return { ok: false, message: "Resposta inválida." };
  }
  if (input.kind !== undefined && !(KINDS as readonly string[]).includes(input.kind)) {
    return { ok: false, message: "Tipo inválido." };
  }
  const trimmed = input.comment?.trim().slice(0, MAX_COMMENT) ?? "";
  if (input.sentiment === undefined && trimmed.length === 0) {
    return { ok: false, message: "Escreva sua mensagem." };
  }
  await deps.feedback.record({
    id: deps.newId(),
    userId: input.userId,
    surface: input.surface,
    sentiment: input.sentiment ?? null,
    comment: trimmed.length > 0 ? trimmed : null,
    kind: input.kind ?? null,
    attachmentKeys: input.attachmentKeys ?? [],
    createdAt: deps.clock.now(),
  });
  return { ok: true };
}
