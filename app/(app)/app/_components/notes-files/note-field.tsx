"use client";

import { Check } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import type { AttachableEntityType } from "@/domain/value-objects/attachable-entity-type";

import { saveEntityNoteAction } from "../../_actions/entity-notes.action";

import { ENTITY_COPY, FILES_COPY } from "./copy";

const noteInputClass =
  "w-full resize-y rounded-xl border-[1.5px] border-[color:var(--border-soft)] bg-[color:var(--surface-1)] px-[14px] py-[12px] text-[0.9375rem] text-[color:var(--text-primary)] outline-none transition-colors focus:border-[color:var(--color-brand-500)] focus:ring-2 focus:ring-[color:var(--color-brand-500)]/30";

type SaveState = "idle" | "editing" | "saved";

interface Props {
  entityType: AttachableEntityType;
  entityId: string;
  initialBody: string;
}

export function NoteField({ entityType, entityId, initialBody }: Props) {
  const [body, setBody] = useState(initialBody);
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const lastSaved = useRef(initialBody);
  const resetTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (resetTimer.current) clearTimeout(resetTimer.current);
    },
    [],
  );

  async function handleBlur() {
    if (body === lastSaved.current) return;
    const result = await saveEntityNoteAction({ entityType, entityId, body });
    if (result.ok) {
      lastSaved.current = body;
      setSaveState("saved");
      if (resetTimer.current) clearTimeout(resetTimer.current);
      resetTimer.current = setTimeout(() => setSaveState("idle"), 2000);
    }
  }

  return (
    <div>
      <textarea
        value={body}
        onChange={(e) => {
          setBody(e.target.value);
          setSaveState("editing");
        }}
        onBlur={handleBlur}
        placeholder={ENTITY_COPY[entityType].notePlaceholder}
        rows={3}
        maxLength={5000}
        className={noteInputClass}
      />
      <div className="mt-1 flex h-4 items-center text-[0.75rem] text-[color:var(--text-secondary)]">
        {saveState === "editing" ? (
          <span>{FILES_COPY.editing}</span>
        ) : saveState === "saved" ? (
          <span className="inline-flex items-center gap-1 text-[color:var(--semantic-positive)]">
            <Check size={13} strokeWidth={2.5} aria-hidden />
            {FILES_COPY.saved}
          </span>
        ) : null}
      </div>
    </div>
  );
}
