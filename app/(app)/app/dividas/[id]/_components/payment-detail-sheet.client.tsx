"use client";

import { useEffect, useState } from "react";

import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/app/components/ui/sheet";
import { Spinner } from "@/app/components/ui/spinner";

import type { AttachmentDto } from "../../../_actions/entity-attachments.action";
import { listAttachmentsAction } from "../../../_actions/entity-attachments.action";
import { getEntityNoteAction } from "../../../_actions/entity-notes.action";
import { AttachmentsList } from "../../../_components/notes-files/attachments-list";
import { NoteField } from "../../../_components/notes-files/note-field";

export interface PaymentRowData {
  id: string;
  dateLabel: string;
  amountFormatted: string;
  principalFormatted: string;
  interestFormatted: string;
  isExtra: boolean;
  hasNoteOrAttachment: boolean;
}

interface LoadedDetail {
  noteBody: string;
  items: AttachmentDto[];
  totalBytes: number;
}

export function PaymentDetailSheet({
  payment,
  isPro,
  onClose,
}: {
  payment: PaymentRowData | null;
  isPro: boolean;
  onClose: () => void;
}) {
  const [detail, setDetail] = useState<LoadedDetail | null>(null);
  const [loadError, setLoadError] = useState(false);
  const paymentId = payment?.id ?? null;

  useEffect(() => {
    if (!paymentId) {
      setDetail(null);
      setLoadError(false);
      return;
    }
    let active = true;
    setDetail(null);
    setLoadError(false);
    void (async () => {
      try {
        const [note, files] = await Promise.all([
          getEntityNoteAction({ entityType: "debt_payment", entityId: paymentId }),
          listAttachmentsAction({ entityType: "debt_payment", entityId: paymentId }),
        ]);
        if (!active) return;
        setDetail({ noteBody: note.body, items: files.items, totalBytes: files.totalBytes });
      } catch {
        if (active) setLoadError(true);
      }
    })();
    return () => {
      active = false;
    };
  }, [paymentId, isPro]);

  return (
    <Sheet open={payment !== null} onOpenChange={(o) => (!o ? onClose() : undefined)}>
      <SheetContent side="bottom" className="max-h-[85vh] overflow-y-auto">
        {payment ? (
          <>
            <SheetHeader className="text-left">
              <SheetTitle className="text-[1.0625rem] font-bold text-[color:var(--text-primary)]">
                Pagamento de {payment.dateLabel}
              </SheetTitle>
              <SheetDescription className="sr-only">Detalhe do pagamento</SheetDescription>
            </SheetHeader>

            <div className="mt-2 text-[1.5rem] font-extrabold leading-tight text-[color:var(--text-primary)]">
              {payment.amountFormatted}
            </div>
            <p className="mt-1 text-[0.8125rem] text-[color:var(--text-secondary)]">
              {payment.principalFormatted} principal · {payment.interestFormatted} juros
              {payment.isExtra ? " · pagamento extra" : ""}
            </p>

            <div className="mt-5 border-t border-[color:var(--border-soft)] pt-5">
              {loadError ? (
                <p role="alert" className="text-[0.8125rem] text-[color:var(--semantic-negative)]">
                  Não consegui carregar agora. Feche e abra de novo pra tentar.
                </p>
              ) : detail === null ? (
                <div className="flex justify-center py-6">
                  <Spinner size={20} />
                </div>
              ) : (
                <div className="flex flex-col gap-4">
                  <NoteField
                    entityType="debt_payment"
                    entityId={payment.id}
                    initialBody={detail.noteBody}
                  />
                  <AttachmentsList
                    entityType="debt_payment"
                    entityId={payment.id}
                    initialItems={detail.items}
                    initialTotalBytes={detail.totalBytes}
                    isPro={isPro}
                  />
                </div>
              )}
            </div>
          </>
        ) : null}
      </SheetContent>
    </Sheet>
  );
}
