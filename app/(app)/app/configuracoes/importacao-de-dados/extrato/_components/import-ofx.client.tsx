"use client";

import { Check, ChevronDown, ChevronUp } from "lucide-react";
import Link from "next/link";
import { useState, useTransition } from "react";

import {
  commitOfxAction,
  previewOfxAction,
  type SerializablePreview,
} from "../../_actions";

type Step = "upload" | "review" | "done";

function formatBrl(value: number): string {
  return value.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function SkeletonBlock() {
  return (
    <div className="flex flex-col gap-3">
      <div className="h-5 w-2/3 animate-pulse rounded-lg bg-[color:var(--surface-3)]" />
      <div className="h-4 w-full animate-pulse rounded-lg bg-[color:var(--surface-3)]" />
      <div className="h-4 w-5/6 animate-pulse rounded-lg bg-[color:var(--surface-3)]" />
      <div className="h-10 w-1/3 animate-pulse rounded-xl bg-[color:var(--surface-3)]" />
    </div>
  );
}

interface SuggestionRowProps {
  label: string;
  sublabel: string;
  fitId: string;
  checked: boolean;
  onToggle: (fitId: string) => void;
}

function SuggestionRow({ label, sublabel, fitId, checked, onToggle }: SuggestionRowProps) {
  return (
    <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-[color:var(--border-soft)] bg-[color:var(--surface-1)] p-3 transition-colors hover:bg-[color:var(--surface-2)]">
      <input
        type="checkbox"
        className="mt-0.5 h-4 w-4 shrink-0 accent-[color:var(--color-brand-800)]"
        checked={checked}
        onChange={() => onToggle(fitId)}
      />
      <div className="min-w-0 flex-1">
        <div className="text-[0.875rem] font-semibold text-[color:var(--text-primary)]">{label}</div>
        <div className="mt-0.5 text-[0.75rem] text-[color:var(--text-secondary)]">{sublabel}</div>
      </div>
    </label>
  );
}

interface ReviewProps {
  preview: SerializablePreview;
  content: string;
  onDone: () => void;
}

function ReviewStep({ preview, content, onDone }: ReviewProps) {
  const [acceptedIncomes, setAcceptedIncomes] = useState<Set<string>>(
    new Set(preview.incomes.map((i) => i.fitId)),
  );
  const [acceptedDebts, setAcceptedDebts] = useState<Set<string>>(
    new Set(preview.debts.map((d) => d.fitId)),
  );
  const [advanced, setAdvanced] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [accountLimit, setAccountLimit] = useState(false);
  const [pending, startTransition] = useTransition();

  function toggleIncome(fitId: string) {
    setAcceptedIncomes((prev) => {
      const next = new Set(prev);
      if (next.has(fitId)) next.delete(fitId);
      else next.add(fitId);
      return next;
    });
  }

  function toggleDebt(fitId: string) {
    setAcceptedDebts((prev) => {
      const next = new Set(prev);
      if (next.has(fitId)) next.delete(fitId);
      else next.add(fitId);
      return next;
    });
  }

  function handleCommit() {
    setError(null);
    setAccountLimit(false);
    startTransition(async () => {
      const res = await commitOfxAction({
        content,
        acceptedIncomeFitIds: Array.from(acceptedIncomes),
        acceptedDebtFitIds: Array.from(acceptedDebts),
      });
      if (res.ok) {
        onDone();
      } else if (res.code === "ACCOUNT_LIMIT") {
        setAccountLimit(true);
      } else {
        setError(res.message);
      }
    });
  }

  const netPositive = preview.net >= 0;
  const accountLabel = preview.matchedAssetLabel ?? `Conta ${preview.accountKey}`;

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-3 rounded-2xl border border-[color:var(--border-soft)] bg-[color:var(--surface-1)] p-4">
        <div className="text-[0.875rem] font-bold text-[color:var(--text-primary)]">
          {accountLabel}
        </div>
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between text-[0.8125rem]">
            <span className="text-[color:var(--text-secondary)]">Saldo da conta no extrato</span>
            <span className="font-semibold text-[color:var(--text-primary)]">
              R$ {formatBrl(preview.ledgerBalance)}
            </span>
          </div>
          <div className="flex items-center justify-between text-[0.8125rem]">
            <span className="text-[color:var(--text-secondary)]">Movimentações novas</span>
            <span className="font-semibold text-[color:var(--text-primary)]">
              {preview.newTransactionCount}
            </span>
          </div>
          {preview.duplicateCount > 0 ? (
            <div className="flex items-center justify-between text-[0.8125rem]">
              <span className="text-[color:var(--text-secondary)]">Já importadas</span>
              <span className="font-semibold text-[color:var(--text-muted)]">
                {preview.duplicateCount}
              </span>
            </div>
          ) : null}
          <div className="flex items-center justify-between text-[0.8125rem]">
            <span className="text-[color:var(--text-secondary)]">Entrou menos saiu</span>
            <span
              className={`font-semibold ${netPositive ? "text-[color:var(--semantic-positive)]" : "text-[color:var(--semantic-negative)]"}`}
            >
              {netPositive ? "+" : ""}R$ {formatBrl(preview.net)}
            </span>
          </div>
        </div>
      </div>

      {preview.incomes.length > 0 ? (
        <div className="flex flex-col gap-2">
          <div className="px-1 text-[0.6875rem] font-semibold uppercase tracking-wide text-[color:var(--text-muted)]">
            Rendas detectadas
          </div>
          <p className="px-1 text-[0.75rem] text-[color:var(--text-secondary)]">
            Marque as que quer cadastrar como renda recorrente.
          </p>
          {preview.incomes.map((inc) => (
            <SuggestionRow
              key={inc.fitId}
              fitId={inc.fitId}
              label={inc.label}
              sublabel={`R$ ${formatBrl(inc.amount)}, todo dia ${inc.dayOfMonth}`}
              checked={acceptedIncomes.has(inc.fitId)}
              onToggle={toggleIncome}
            />
          ))}
        </div>
      ) : null}

      {preview.debts.length > 0 ? (
        <div className="flex flex-col gap-2">
          <div className="px-1 text-[0.6875rem] font-semibold uppercase tracking-wide text-[color:var(--text-muted)]">
            Dívidas detectadas
          </div>
          <p className="px-1 text-[0.75rem] text-[color:var(--text-secondary)]">
            Marque as que quer cadastrar como dívida.
          </p>
          {preview.debts.map((d) => {
            const installmentLabel =
              d.total !== null
                ? `R$ ${formatBrl(d.installment)} × ${d.total} parcelas${d.paid !== null ? ` (${d.paid} pagas)` : ""}`
                : `R$ ${formatBrl(d.installment)}/mês`;
            return (
              <SuggestionRow
                key={d.fitId}
                fitId={d.fitId}
                label={d.label}
                sublabel={installmentLabel}
                checked={acceptedDebts.has(d.fitId)}
                onToggle={toggleDebt}
              />
            );
          })}
        </div>
      ) : null}

      <div className="flex flex-col gap-2">
        <button
          type="button"
          onClick={() => setAdvanced((v) => !v)}
          className="focus-ring flex items-center gap-1.5 self-start text-[0.8125rem] font-semibold text-[color:var(--text-secondary)] underline underline-offset-2"
        >
          {advanced ? (
            <ChevronUp size={15} strokeWidth={2} aria-hidden />
          ) : (
            <ChevronDown size={15} strokeWidth={2} aria-hidden />
          )}
          Avançado
        </button>
        {advanced ? (
          <p className="rounded-xl border border-[color:var(--border-soft)] bg-[color:var(--surface-2)] p-3 text-[0.8125rem] text-[color:var(--text-secondary)]">
            Todas as movimentações novas do extrato são importadas. As sugestões acima permitem
            cadastrar rendas e dívidas a partir dos padrões detectados.
          </p>
        ) : null}
      </div>

      {accountLimit ? (
        <div className="flex flex-col gap-3 rounded-xl border border-[color:var(--semantic-negative)]/30 bg-[color:var(--semantic-negative)]/[0.08] px-4 py-3">
          <p className="text-[0.8125rem] font-semibold text-[color:var(--semantic-negative)]">
            No plano gratuito você importa de 1 conta. Para importar de outra, assine o Pro.
          </p>
          <Link
            href="/app/configuracoes/planos"
            className="focus-ring self-start rounded-xl bg-[color:var(--color-brand-800)] px-4 py-2 text-[0.8125rem] font-bold text-white transition-opacity hover:opacity-90"
          >
            Assinar Pro
          </Link>
        </div>
      ) : null}

      {error ? (
        <p className="rounded-xl border border-[color:var(--semantic-negative)]/30 bg-[color:var(--semantic-negative)]/[0.08] px-4 py-3 text-[0.8125rem] font-semibold text-[color:var(--semantic-negative)]">
          {error}
        </p>
      ) : null}

      <button
        type="button"
        onClick={handleCommit}
        disabled={pending}
        className="focus-ring flex w-full items-center justify-center rounded-2xl bg-[color:var(--color-brand-800)] px-4 py-3 text-[0.9375rem] font-bold text-white transition-opacity disabled:opacity-60"
      >
        {pending ? (
          <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
        ) : (
          "Confirmar importação"
        )}
      </button>
    </div>
  );
}

export function ImportOfx() {
  const [step, setStep] = useState<Step>("upload");
  const [preview, setPreview] = useState<SerializablePreview | null>(null);
  const [content, setContent] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setError(null);

    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result;
      if (typeof text !== "string") return;
      setContent(text);

      const fd = new FormData();
      fd.set("file", file);

      startTransition(async () => {
        const res = await previewOfxAction(fd);
        if (res.ok) {
          setPreview(res.preview);
          setStep("review");
        } else {
          setError(res.message);
        }
      });
    };
    reader.readAsText(file);
  }

  if (step === "done") {
    return (
      <div className="flex flex-col items-center gap-4 py-8 text-center">
        <span className="flex h-14 w-14 items-center justify-center rounded-full bg-[color:var(--semantic-positive)]/[0.14] text-[color:var(--semantic-positive)]">
          <Check size={28} strokeWidth={2.25} aria-hidden />
        </span>
        <div>
          <div className="text-[1rem] font-bold text-[color:var(--text-primary)]">
            Extrato importado
          </div>
          <p className="mt-1 text-[0.8125rem] text-[color:var(--text-secondary)]">
            As movimentações foram registradas e as rendas e dívidas selecionadas foram cadastradas.
          </p>
        </div>
        <div className="flex w-full flex-col gap-2">
          <Link
            href="/app/linha-do-tempo"
            className="focus-ring flex w-full items-center justify-center rounded-2xl bg-[color:var(--color-brand-800)] px-4 py-3 text-[0.9375rem] font-bold text-white transition-opacity hover:opacity-90"
          >
            Ver na linha do tempo
          </Link>
          <button
            type="button"
            onClick={() => {
              setStep("upload");
              setPreview(null);
              setContent("");
              setError(null);
            }}
            className="focus-ring w-full rounded-2xl border border-[color:var(--border-soft)] px-4 py-3 text-[0.875rem] font-semibold text-[color:var(--text-primary)] transition-colors hover:bg-[color:var(--surface-2)]"
          >
            Importar outro extrato
          </button>
        </div>
      </div>
    );
  }

  if (step === "review" && preview !== null) {
    return (
      <ReviewStep
        preview={preview}
        content={content}
        onDone={() => setStep("done")}
      />
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {pending ? (
        <SkeletonBlock />
      ) : (
        <div className="flex flex-col gap-3">
          <p className="text-[0.875rem] text-[color:var(--text-secondary)]">
            Exporte o extrato pelo app ou site do seu banco no formato OFX e selecione o arquivo
            abaixo.
          </p>
          <label className="focus-ring flex cursor-pointer flex-col items-center gap-3 rounded-2xl border-2 border-dashed border-[color:var(--border-soft)] bg-[color:var(--surface-1)] px-4 py-8 text-center transition-colors hover:border-[color:var(--border-strong)] hover:bg-[color:var(--surface-2)]">
            <span className="text-[0.9375rem] font-semibold text-[color:var(--text-primary)]">
              Selecionar arquivo OFX
            </span>
            <span className="text-[0.8125rem] text-[color:var(--text-muted)]">
              Clique para escolher o arquivo
            </span>
            <input
              type="file"
              accept=".ofx"
              className="sr-only"
              onChange={handleFileChange}
            />
          </label>
        </div>
      )}

      {error ? (
        <p className="rounded-xl border border-[color:var(--semantic-negative)]/30 bg-[color:var(--semantic-negative)]/[0.08] px-4 py-3 text-[0.8125rem] font-semibold text-[color:var(--semantic-negative)]">
          {error}
        </p>
      ) : null}
    </div>
  );
}
