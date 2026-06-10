import { listAttachments } from "@/application/use-cases/attachments/list-attachments.use-case";
import { getEntityNote } from "@/application/use-cases/notes/get-entity-note.use-case";
import type { AttachableEntityType } from "@/domain/value-objects/attachable-entity-type";
import { repos } from "@/infrastructure/container";

import type { AttachmentDto } from "../../_actions/entity-attachments.action";

import { AttachmentsList } from "./attachments-list";
import { AttachmentsPaywall } from "./attachments-paywall";
import { ENTITY_COPY } from "./copy";
import { NoteField } from "./note-field";

interface Props {
  entityType: AttachableEntityType;
  entityId: string;
  userId: string;
  isPro: boolean;
}

export async function EntityNotesAndFiles({ entityType, entityId, userId, isPro }: Props) {
  const copy = ENTITY_COPY[entityType];
  const note = await getEntityNote(
    { notes: repos.entityNotes },
    { userId, entityType, entityId },
  );

  let items: AttachmentDto[] = [];
  let totalBytes = 0;
  if (isPro) {
    const attachments = repos.entityAttachments;
    const [list, total] = await Promise.all([
      listAttachments({ attachments }, { userId, entityType, entityId }),
      attachments.totalBytesForUser(userId),
    ]);
    items = list.map((a) => ({
      id: a.id,
      fileName: a.fileName,
      contentType: a.contentType,
      sizeBytes: a.sizeBytes,
      createdAt: a.createdAt.toISOString(),
    }));
    totalBytes = total;
  }

  return (
    <section
      aria-label={copy.cardTitle}
      className="rounded-[18px] border border-[color:var(--border-soft)] bg-[color:var(--surface-1)] p-5 backdrop-blur-xl"
      style={{ boxShadow: "0 4px 16px -4px rgba(31,29,28,0.06)" }}
    >
      <h2 className="text-[0.9375rem] font-bold tracking-[-0.01em] text-[color:var(--text-primary)]">
        {copy.cardTitle}
      </h2>
      <p className="mt-1 text-[0.8125rem] leading-[1.5] text-[color:var(--text-secondary)]">
        {copy.subtitle}
      </p>

      <div className="mt-4">
        <NoteField entityType={entityType} entityId={entityId} initialBody={note?.body ?? ""} />
      </div>

      <div className="mt-4">
        {isPro ? (
          <AttachmentsList
            entityType={entityType}
            entityId={entityId}
            initialItems={items}
            initialTotalBytes={totalBytes}
          />
        ) : (
          <AttachmentsPaywall />
        )}
      </div>
    </section>
  );
}
