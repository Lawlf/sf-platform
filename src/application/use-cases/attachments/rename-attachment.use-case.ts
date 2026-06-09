import type { EntityAttachmentRepository } from "@/domain/ports/repositories/entity-attachment.repository";

export interface RenameAttachmentDeps {
  attachments: Pick<EntityAttachmentRepository, "findById" | "rename">;
}

export type RenameAttachmentResult =
  | { ok: true; fileName: string }
  | { ok: false; message: string };

const MAX_NAME = 120;

function extOf(fileName: string): string {
  const m = /\.([a-zA-Z0-9]+)$/.exec(fileName);
  return m?.[1]?.toLowerCase() ?? "";
}

export async function renameAttachment(
  deps: RenameAttachmentDeps,
  input: { userId: string; attachmentId: string; newName: string },
): Promise<RenameAttachmentResult> {
  const found = await deps.attachments.findById(input.attachmentId, input.userId);
  if (!found) return { ok: false, message: "Arquivo não encontrado." };

  const ext = extOf(found.fileName);
  let base = input.newName.trim().replace(/[/\\\n\r\t]/g, "").slice(0, MAX_NAME);
  if (ext) {
    base = base.replace(new RegExp(`\\.${ext}$`, "i"), "").trim();
  }
  if (base.length === 0) return { ok: false, message: "O nome não pode ficar vazio." };

  const fileName = ext ? `${base}.${ext}` : base;
  await deps.attachments.rename(found.id, input.userId, fileName);
  return { ok: true, fileName };
}
