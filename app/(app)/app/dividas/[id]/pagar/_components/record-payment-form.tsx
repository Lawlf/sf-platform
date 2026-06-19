"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useQueryClient } from "@tanstack/react-query";
import { Paperclip, X } from "lucide-react";
import type { Route } from "next";
import { useRouter } from "next/navigation";
import { useId, useRef, useState, useTransition } from "react";
import { useForm, useWatch } from "react-hook-form";
import { z } from "zod";

import { Button } from "@/app/components/ui/button";
import { ALLOWED_CONTENT_TYPES, MAX_FILE_BYTES } from "@/application/use-cases/attachments/attachment-limits";

import {
  confirmAttachmentUploadAction,
  requestAttachmentUploadAction,
} from "../../../../_actions/entity-attachments.action";
import { saveEntityNoteAction } from "../../../../_actions/entity-notes.action";
import { MoneyInput } from "../../../../_components/money-input";
import { queryKeys } from "../../../../_lib/query-keys";
import { WizardField, wizardInputClass } from "../../../nova/_components/wizard-field";
import { WizardRadioCard } from "../../../nova/_components/wizard-radio-card";
import { recordPaymentAction } from "../_actions/record-payment.action";

const formSchema = z
  .object({
    paidAt: z.string().min(1, "Informe a data."),
    principalCents: z.bigint().nonnegative(),
    interestCents: z.bigint().nonnegative(),
    isExtra: z.boolean(),
  })
  .refine(({ principalCents, interestCents }) => principalCents + interestCents > 0n, {
    message: "Informe um valor maior que zero.",
    path: ["principalCents"],
  });

type FormValues = z.infer<typeof formSchema>;

interface Props {
  debtId: string;
  defaultPaidAt: string;
  defaults: { amountCents: string; principalCents: string; interestCents: string } | null;
  currentBalanceFormatted: string;
  isPro: boolean;
}

export function RecordPaymentForm({
  debtId,
  defaultPaidAt,
  defaults,
  currentBalanceFormatted,
  isPro,
}: Props) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [pending, startTransition] = useTransition();
  const [serverError, setServerError] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const createdPaymentId = useRef<string | null>(null);
  const paidAtId = useId();
  const noteId = useId();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      paidAt: defaultPaidAt,
      principalCents: defaults ? BigInt(defaults.principalCents) : 0n,
      interestCents: defaults ? BigInt(defaults.interestCents) : 0n,
      isExtra: false,
    },
  });

  const principal = useWatch({ control: form.control, name: "principalCents" }) ?? 0n;
  const interest = useWatch({ control: form.control, name: "interestCents" }) ?? 0n;
  const isExtra = useWatch({ control: form.control, name: "isExtra" }) ?? false;
  const totalCents = (principal as bigint) + (interest as bigint);

  function pickFile(picked: File | null) {
    setFileError(null);
    if (!picked) {
      setFile(null);
      return;
    }
    if (!(ALLOWED_CONTENT_TYPES as readonly string[]).includes(picked.type)) {
      setFileError("Use PDF ou imagem (JPG, PNG, WEBP).");
      return;
    }
    if (picked.size > MAX_FILE_BYTES) {
      setFileError("Arquivo acima de 10 MB. Tente um menor.");
      return;
    }
    setFile(picked);
  }

  async function uploadComprovante(paymentId: string, picked: File): Promise<boolean> {
    const req = await requestAttachmentUploadAction({
      entityType: "debt_payment",
      entityId: paymentId,
      fileName: picked.name,
      contentType: picked.type,
      sizeBytes: picked.size,
    });
    if (!req.ok) return false;
    const res = await fetch(req.uploadUrl, {
      method: "PUT",
      body: picked,
      headers: { "Content-Type": picked.type },
    });
    if (!res.ok) return false;
    const confirmed = await confirmAttachmentUploadAction({
      entityType: "debt_payment",
      entityId: paymentId,
      attachmentId: req.attachmentId,
      storageKey: req.storageKey,
      fileName: picked.name,
      contentType: picked.type,
      sizeBytes: picked.size,
    });
    return confirmed.ok;
  }

  async function onSubmit(values: FormValues) {
    setServerError(null);
    setFileError(null);
    startTransition(async () => {
      let paymentId = createdPaymentId.current;
      if (!paymentId) {
        const fd = new FormData();
        fd.set("debtId", debtId);
        fd.set("paidAt", values.paidAt);
        fd.set("principalCents", values.principalCents.toString());
        fd.set("interestCents", values.interestCents.toString());
        fd.set("amountCents", (values.principalCents + values.interestCents).toString());
        fd.set("isExtra", values.isExtra ? "true" : "false");
        const r = await recordPaymentAction(fd);
        if (!r.ok) {
          setServerError(r.message);
          return;
        }
        createdPaymentId.current = r.data.paymentId;
        paymentId = r.data.paymentId;
        await Promise.all([
          queryClient.invalidateQueries({ queryKey: queryKeys.debts("active") }),
          queryClient.invalidateQueries({ queryKey: queryKeys.debts("all") }),
          queryClient.invalidateQueries({ queryKey: queryKeys.debts("paid_off") }),
          queryClient.invalidateQueries({ queryKey: queryKeys.dashboardSnapshot }),
          queryClient.invalidateQueries({ queryKey: ["timeline"] }),
        ]);
      }

      const trimmedNote = note.trim();
      if (trimmedNote) {
        await saveEntityNoteAction({
          entityType: "debt_payment",
          entityId: paymentId,
          body: trimmedNote,
        });
      }

      if (file && isPro) {
        const uploaded = await uploadComprovante(paymentId, file);
        if (!uploaded) {
          setFileError("Não consegui anexar o arquivo. Toque em registrar de novo pra tentar.");
          return;
        }
      }

      router.push(`/app/dividas/${debtId}` as Route);
    });
  }

  return (
    <form noValidate onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-4">
      <section className="rounded-2xl border border-[color:var(--border-soft)] bg-[color:var(--surface-1)] p-4 backdrop-blur-xl">
        <div className="flex items-baseline justify-between gap-3">
          <span className="text-[0.6875rem] font-semibold uppercase tracking-wide text-[color:var(--text-secondary)]">
            Quanto falta pagar
          </span>
          <span className="text-[1.125rem] font-extrabold text-[color:var(--text-primary)]">
            {currentBalanceFormatted}
          </span>
        </div>
      </section>

      <section className="flex flex-col gap-4 rounded-2xl border border-[color:var(--border-soft)] bg-[color:var(--surface-1)] p-4 backdrop-blur-xl">
        <WizardField label="Data do pagamento" htmlFor={paidAtId}>
          <input
            id={paidAtId}
            type="date"
            {...form.register("paidAt")}
            className={wizardInputClass}
          />
        </WizardField>

        <MoneyInput
          control={form.control}
          name="principalCents"
          label="Parte do principal"
          helper="Valor abatido da dívida."
          required
        />

        <MoneyInput
          control={form.control}
          name="interestCents"
          label="Parte de juros"
          helper="Juros pagos nesse mês."
        />

        <div className="flex flex-col gap-1.5">
          <span className="text-[0.6875rem] font-bold uppercase tracking-[0.5px] text-[color:var(--text-secondary)]">
            Tipo de pagamento
          </span>
          <div className="grid grid-cols-2 gap-2">
            <WizardRadioCard
              title="Parcela normal"
              description="Pagamento agendado da dívida."
              active={!isExtra}
              onSelect={() => form.setValue("isExtra", false, { shouldDirty: true })}
            />
            <WizardRadioCard
              title="Pagamento extra"
              description="Amortização acima da parcela."
              active={isExtra}
              onSelect={() => form.setValue("isExtra", true, { shouldDirty: true })}
            />
          </div>
        </div>

        <div className="flex items-baseline justify-between border-t border-[color:var(--border-soft)] pt-3">
          <span className="text-[0.6875rem] font-semibold uppercase tracking-wide text-[color:var(--text-secondary)]">
            Total
          </span>
          <span className="text-[1.125rem] font-extrabold text-[color:var(--text-primary)]">
            {formatCentsForDisplay(totalCents as bigint)}
          </span>
        </div>
      </section>

      <section className="flex flex-col gap-3 rounded-2xl border border-[color:var(--border-soft)] bg-[color:var(--surface-1)] p-4 backdrop-blur-xl">
        <WizardField label="Comprovante e nota (opcional)" htmlFor={noteId}>
          <textarea
            id={noteId}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Ex: paguei via PIX, comprovante no app do banco."
            rows={2}
            maxLength={5000}
            className={`${wizardInputClass} resize-none`}
          />
        </WizardField>

        {isPro ? (
          file ? (
            <div className="flex items-center gap-2 rounded-xl border border-[color:var(--border-soft)] bg-[color:var(--surface-2)] px-3 py-2">
              <Paperclip size={14} strokeWidth={2} aria-hidden className="text-[color:var(--text-muted)]" />
              <span className="flex-1 truncate text-[0.8125rem] text-[color:var(--text-primary)]">
                {file.name}
              </span>
              <button
                type="button"
                onClick={() => {
                  setFile(null);
                  if (fileInputRef.current) fileInputRef.current.value = "";
                }}
                aria-label="Remover arquivo"
                className="text-[color:var(--text-muted)]"
              >
                <X size={16} strokeWidth={2} aria-hidden />
              </button>
            </div>
          ) : (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
            >
              <Paperclip size={14} strokeWidth={2} aria-hidden />
              Anexar comprovante
            </Button>
          )
        ) : (
          <p className="text-[0.6875rem] text-[color:var(--text-muted)]">
            Anexar o comprovante é do Pro. A nota fica salva pra qualquer plano.
          </p>
        )}
        <input
          ref={fileInputRef}
          type="file"
          accept="application/pdf,image/jpeg,image/png,image/webp"
          className="hidden"
          onChange={(e) => pickFile(e.target.files?.[0] ?? null)}
        />
        {fileError ? (
          <span role="alert" className="text-[0.6875rem] text-[color:var(--semantic-negative)]">
            {fileError}
          </span>
        ) : null}
      </section>

      {form.formState.errors.root ? (
        <span role="alert" className="text-sm text-[color:var(--semantic-negative)]">
          {form.formState.errors.root.message}
        </span>
      ) : null}
      {serverError ? (
        <span role="alert" className="text-sm text-[color:var(--semantic-negative)]">
          {serverError}
        </span>
      ) : null}

      <Button type="submit" loading={pending}>
        Registrar pagamento
      </Button>
    </form>
  );
}

function formatCentsForDisplay(cents: bigint): string {
  const reais = Number(cents) / 100;
  return reais.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}
