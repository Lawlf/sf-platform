"use client";

import { Check, ChevronDown, ChevronUp } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { useState, useTransition } from "react";

import { MoneyInputControlled } from "@/app/(app)/app/_components/money-input-controlled";

import {
  commitOfxAction,
  previewOfxAction,
  type SerializablePreview,
} from "../../_actions";

type Step = "upload" | "review" | "done";

interface ImportReceipt {
  assetId: string;
  ledgerBalance: number;
  importedTransactions: number;
  createdIncomes: number;
  createdDebts: number;
  incomeLabels: string[];
  debtLabels: string[];
  reserveValue: number | null;
  caixinhaPending: boolean;
}

function formatBrl(value: number): string {
  return value.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function nameHint(labels: string[]): string {
  return labels.length > 0 && labels.length <= 2 ? ` (${labels.join(", ")})` : "";
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
  contents: string[];
  onDone: (receipt: ImportReceipt) => void;
}

function ReviewStep({ preview, contents, onDone }: ReviewProps) {
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

  const reserve = preview.reserve;
  const reserveDetected = reserve !== null;
  const knownReserveValue = reserve?.existingValue ?? null;
  const initialReserveCents =
    knownReserveValue === null
      ? 0n
      : BigInt(
          Math.max(
            0,
            Math.round((knownReserveValue + (reserve?.guardou ?? 0) - (reserve?.tirou ?? 0)) * 100),
          ),
        );
  const [reserveCents, setReserveCents] = useState<bigint>(initialReserveCents);
  const [reserveSave, setReserveSave] = useState<boolean>(reserveDetected);

  const reserveMissing = reserveSave && reserveCents <= 0n;

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
        contents,
        acceptedIncomeFitIds: Array.from(acceptedIncomes),
        acceptedDebtFitIds: Array.from(acceptedDebts),
        reserveTotalCents: reserveSave && reserveCents > 0n ? Number(reserveCents) / 100 : null,
      });
      if (res.ok) {
        onDone({
          assetId: res.assetId,
          ledgerBalance: res.ledgerBalance,
          importedTransactions: res.importedTransactions,
          createdIncomes: res.createdIncomes,
          createdDebts: res.createdDebts,
          incomeLabels: preview.incomes
            .filter((i) => acceptedIncomes.has(i.fitId))
            .map((i) => i.label),
          debtLabels: preview.debts.filter((d) => acceptedDebts.has(d.fitId)).map((d) => d.label),
          reserveValue: res.reserveValue,
          caixinhaPending: reserveDetected && res.reserveValue === null,
        });
      } else if (res.code === "ACCOUNT_LIMIT") {
        setAccountLimit(true);
      } else {
        setError(res.message);
      }
    });
  }

  const netPositive = preview.net >= 0;
  const accountLabel = preview.matchedAssetLabel ?? preview.bankLabel;

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-3 rounded-2xl border border-[color:var(--border-soft)] bg-[color:var(--surface-1)] p-4">
        <div className="text-[0.875rem] font-bold text-[color:var(--text-primary)]">
          {accountLabel}
        </div>
        <div className="flex flex-col gap-1.5">
          {preview.statementCount > 1 ? (
            <div className="flex items-center justify-between text-[0.8125rem]">
              <span className="text-[color:var(--text-secondary)]">Extratos juntos</span>
              <span className="font-semibold text-[color:var(--text-primary)]">
                {preview.statementCount}
              </span>
            </div>
          ) : null}
          <div className="flex items-center justify-between text-[0.8125rem]">
            <span className="text-[color:var(--text-secondary)]">Saldo da conta no extrato</span>
            <span className="font-semibold text-[color:var(--text-primary)]">
              R$ {formatBrl(preview.ledgerBalance)}
            </span>
          </div>
          {reserveDetected ? (
            <p className="text-[0.75rem] text-[color:var(--text-muted)]">
              Esse é só o que estava na conta. Suas caixinhas você informa abaixo, o banco não manda
              esse valor no arquivo.
            </p>
          ) : null}
          <div className="flex items-center justify-between text-[0.8125rem]">
            <span className="text-[color:var(--text-secondary)]">Movimentações novas</span>
            <span className="font-semibold text-[color:var(--text-primary)]">
              {preview.newTransactionCount}
            </span>
          </div>
          {preview.duplicateCount > 0 ? (
            <>
              <div className="flex items-center justify-between text-[0.8125rem]">
                <span className="text-[color:var(--text-secondary)]">Já importadas</span>
                <span className="font-semibold text-[color:var(--text-muted)]">
                  {preview.duplicateCount}
                </span>
              </div>
              <p className="text-[0.75rem] text-[color:var(--text-muted)]">
                Essas a gente já tinha. Não entram de novo.
              </p>
            </>
          ) : null}
          <div className="flex items-center justify-between text-[0.8125rem]">
            <span className="text-[color:var(--text-secondary)]">Saldo dessas movimentações</span>
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
            Cobranças fixas
          </div>
          <p className="px-1 text-[0.75rem] text-[color:var(--text-secondary)]">
            Olha o que parece cobrança fixa. Marca o que volta todos os meses pra entrar no seu
            comprometido. O que você marcar a gente não conta de novo no consumo.
          </p>
          {preview.debts.map((d) => {
            const installmentLabel =
              d.total !== null
                ? d.paid !== null
                  ? `R$ ${formatBrl(d.installment)}/mês, faltam ${Math.max(d.total - d.paid, 0)} de ${d.total}`
                  : `R$ ${formatBrl(d.installment)}/mês, ${d.total} parcelas`
                : `R$ ${formatBrl(d.installment)} todo mês`;
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
          <p className="px-1 text-[0.75rem] text-[color:var(--text-muted)]">
            Só aparece o que passou neste período. Cobrança que faltou, você adiciona depois de
            confirmar.
          </p>
        </div>
      ) : null}

      <div className="flex flex-col gap-2">
        <div className="px-1 text-[0.6875rem] font-semibold uppercase tracking-wide text-[color:var(--text-muted)]">
          Suas caixinhas
        </div>
        <p className="px-1 text-[0.75rem] text-[color:var(--text-secondary)]">
          {knownReserveValue !== null
            ? `Você tinha informado R$ ${formatBrl(knownReserveValue)}. Ajuste se mudou.`
            : reserveDetected
              ? "A gente viu transferências pra caixinha no seu extrato, mas o banco não manda quanto tem guardado lá. Abre o app do banco, olha o total das caixinhas e digita aqui. Pode ser mais ou menos, dá pra ajustar depois. O que importa é o tamanho da reserva, não o centavo."
              : "Tem dinheiro guardado em caixinha ou poupança? O banco não manda esse valor no arquivo. Se quiser, informe o total, mais ou menos, pra somar ao seu patrimônio."}
        </p>
        <MoneyInputControlled
          value={reserveCents}
          onChange={setReserveCents}
          ariaLabel="Total guardado nas caixinhas"
        />
        <label className="flex cursor-pointer items-center gap-2 px-1">
          <input
            type="checkbox"
            className="h-4 w-4 shrink-0 accent-[color:var(--color-brand-800)]"
            checked={reserveSave}
            onChange={(e) => setReserveSave(e.target.checked)}
          />
          <span className="text-[0.75rem] font-semibold text-[color:var(--text-secondary)]">
            Somar à minha reserva no patrimônio
          </span>
        </label>
        {knownReserveValue !== null ? (
          <p className="px-1 text-[0.75rem] text-[color:var(--text-muted)]">
            Reimportou? Esse valor substitui o que você tinha informado, não soma em cima.
          </p>
        ) : null}
        {reserveMissing ? (
          <p className="rounded-xl border border-[color:var(--border-soft)] bg-[color:var(--surface-2)] px-3 py-2 text-[0.75rem] font-medium text-[color:var(--text-secondary)]">
            Sem isso, a reserva não entra no patrimônio. Põe um valor aproximado.
          </p>
        ) : null}
      </div>

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
            Renda e cobranças recorrentes você confirma acima. O que você guardou na caixinha virou
            reserva. O resto do extrato virou sua leitura de consumo, no agregado, sem você marcar
            item por item.
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
        disabled={pending || reserveMissing}
        className="focus-ring flex w-full items-center justify-center rounded-2xl bg-[color:var(--color-brand-800)] px-4 py-3 text-[0.9375rem] font-bold text-white transition-opacity disabled:opacity-60"
      >
        {pending ? (
          <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
        ) : reserveMissing ? (
          "Falta o valor da caixinha"
        ) : (
          "Confirmar importação"
        )}
      </button>
    </div>
  );
}

interface ConnectedAccount {
  label: string;
  updated: string;
}

export function ImportOfx({ connectedAccounts }: { connectedAccounts: ConnectedAccount[] }) {
  const [step, setStep] = useState<Step>("upload");
  const [preview, setPreview] = useState<SerializablePreview | null>(null);
  const [contents, setContents] = useState<string[]>([]);
  const [receipt, setReceipt] = useState<ImportReceipt | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleFilesChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    if (files.length === 0) return;

    setError(null);

    Promise.all(files.map((f) => f.text())).then((texts) => {
      setContents(texts);

      const fd = new FormData();
      for (const f of files) fd.append("file", f);

      startTransition(async () => {
        const res = await previewOfxAction(fd);
        if (res.ok) {
          setPreview(res.preview);
          setStep("review");
        } else {
          setError(res.message);
        }
      });
    });
  }

  if (step === "done" && receipt !== null) {
    const accountWorth = receipt.ledgerBalance + (receipt.reserveValue ?? 0);
    const showDebt = receipt.createdDebts > 0;
    const showIncome = receipt.createdIncomes > 0;
    const hasEntities = showDebt || showIncome || receipt.reserveValue !== null;
    const resetToUpload = () => {
      setStep("upload");
      setPreview(null);
      setContents([]);
      setReceipt(null);
      setError(null);
    };
    return (
      <div className="flex flex-col items-center gap-4 py-8">
        <span className="flex h-14 w-14 items-center justify-center rounded-full bg-[color:var(--semantic-positive)]/[0.14] text-[color:var(--semantic-positive)]">
          <Check size={28} strokeWidth={2.25} aria-hidden />
        </span>
        <div className="w-full">
          <div className="text-center text-[1rem] font-bold text-[color:var(--text-primary)]">
            Extrato no lugar
          </div>
          <p className="mt-1 text-center text-[0.8125rem] text-[color:var(--text-secondary)]">
            Esta conta agora soma R$ {formatBrl(accountWorth)} no seu patrimônio.
          </p>

          {hasEntities ? (
            <div className="mt-3 flex flex-col gap-1.5 rounded-2xl border border-[color:var(--border-soft)] bg-[color:var(--surface-1)] p-4 text-left">
              <div className="text-[0.6875rem] font-semibold uppercase tracking-wide text-[color:var(--text-muted)]">
                O que entrou
              </div>
              <ul className="flex flex-col gap-1 text-[0.8125rem] text-[color:var(--text-primary)]">
                {showDebt ? (
                  <li>
                    {receipt.createdDebts}{" "}
                    {receipt.createdDebts === 1 ? "cobrança fixa" : "cobranças fixas"}
                    {nameHint(receipt.debtLabels)}
                  </li>
                ) : null}
                {showIncome ? (
                  <li>
                    {receipt.createdIncomes} {receipt.createdIncomes === 1 ? "renda" : "rendas"}
                    {nameHint(receipt.incomeLabels)}
                  </li>
                ) : null}
                {receipt.reserveValue !== null ? (
                  <li>Reserva de R$ {formatBrl(receipt.reserveValue)} separada</li>
                ) : null}
              </ul>
              <div className="text-[0.6875rem] text-[color:var(--text-muted)]">
                {receipt.importedTransactions}{" "}
                {receipt.importedTransactions === 1
                  ? "movimentação registrada"
                  : "movimentações registradas"}
              </div>
            </div>
          ) : (
            <p className="mt-2 text-center text-[0.75rem] text-[color:var(--text-muted)]">
              {receipt.importedTransactions}{" "}
              {receipt.importedTransactions === 1
                ? "movimentação registrada"
                : "movimentações registradas"}
              .
            </p>
          )}

          {receipt.caixinhaPending ? (
            <p className="mt-3 rounded-xl border border-[color:var(--border-soft)] bg-[color:var(--surface-2)] px-3 py-2 text-left text-[0.75rem] text-[color:var(--text-secondary)]">
              Você ainda não informou o total das caixinhas, então esse dinheiro fica de fora do seu
              patrimônio. Dá pra somar agora.
            </p>
          ) : null}
        </div>

        {receipt.caixinhaPending ? (
          <button
            type="button"
            onClick={() => setStep("review")}
            className="focus-ring flex w-full items-center justify-center rounded-2xl bg-[color:var(--color-brand-800)] px-4 py-3 text-[0.9375rem] font-bold text-white transition-opacity hover:opacity-90"
          >
            Somar minhas caixinhas agora
          </button>
        ) : null}

        <div className="flex w-full flex-col gap-2 rounded-2xl border border-[color:var(--border-soft)] bg-[color:var(--surface-1)] p-4 text-left">
          <div className="text-[0.875rem] font-semibold text-[color:var(--text-primary)]">
            Tem conta que você paga sempre e não veio no arquivo?
          </div>
          <p className="text-[0.75rem] text-[color:var(--text-secondary)]">
            Importação traz o que passou na conta neste período. Aluguel, escola, seguro anual ou
            boleto que vence depois ficam de fora. Esses você lança quando quiser.
          </p>
          <Link
            href={"/app/dividas/nova" as Route}
            className="focus-ring mt-1 self-start rounded-xl border border-[color:var(--border-soft)] px-4 py-2 text-[0.8125rem] font-semibold text-[color:var(--text-primary)] transition-colors hover:bg-[color:var(--surface-2)]"
          >
            Adicionar uma dívida
          </Link>
        </div>

        <div className="flex w-full flex-col gap-2">
          <Link
            href={`/app/patrimonio/${receipt.assetId}` as Route}
            className="focus-ring flex w-full items-center justify-center rounded-2xl bg-[color:var(--color-brand-800)] px-4 py-3 text-[0.9375rem] font-bold text-white transition-opacity hover:opacity-90"
          >
            Ver no meu patrimônio
          </Link>
          <button
            type="button"
            onClick={resetToUpload}
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
        contents={contents}
        onDone={(r) => {
          setReceipt(r);
          setStep("done");
        }}
      />
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {pending ? (
        <SkeletonBlock />
      ) : (
        <div className="flex flex-col gap-3">
          {connectedAccounts.length > 0 ? (
            <div className="flex flex-col gap-2 rounded-2xl border border-[color:var(--border-soft)] bg-[color:var(--surface-1)] p-4">
              <div className="text-[0.6875rem] font-semibold uppercase tracking-wide text-[color:var(--text-muted)]">
                Contas que já estão aqui
              </div>
              <ul className="flex flex-col gap-1">
                {connectedAccounts.map((acc) => (
                  <li
                    key={acc.label}
                    className="flex items-center justify-between text-[0.8125rem]"
                  >
                    <span className="font-semibold text-[color:var(--text-primary)]">
                      {acc.label}
                    </span>
                    <span className="text-[color:var(--text-muted)]">{acc.updated}</span>
                  </li>
                ))}
              </ul>
              <p className="text-[0.75rem] text-[color:var(--text-secondary)]">
                Pode mandar o extrato novo. A gente encaixa na mesma conta e ignora o que já entrou.
              </p>
            </div>
          ) : null}
          <p className="text-[0.875rem] text-[color:var(--text-secondary)]">
            Exporte o extrato pelo app ou site do seu banco no formato OFX e selecione os arquivos
            abaixo.
          </p>
          <label className="focus-ring flex cursor-pointer flex-col items-center gap-3 rounded-2xl border-2 border-dashed border-[color:var(--border-soft)] bg-[color:var(--surface-1)] px-4 py-8 text-center transition-colors hover:border-[color:var(--border-strong)] hover:bg-[color:var(--surface-2)]">
            <span className="text-[0.9375rem] font-semibold text-[color:var(--text-primary)]">
              Arraste seus extratos aqui
            </span>
            <span className="text-[0.8125rem] text-[color:var(--text-muted)]">
              Pode soltar vários. Janeiro, fevereiro, março, o que tiver.
            </span>
            <input
              type="file"
              accept=".ofx"
              multiple
              className="sr-only"
              onChange={handleFilesChange}
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
