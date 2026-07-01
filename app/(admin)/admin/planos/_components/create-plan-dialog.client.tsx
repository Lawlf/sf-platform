"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/app/components/ui/dialog";
import { Spinner } from "@/app/components/ui/spinner";
import type { BillingInterval } from "@/domain/entities/plan.entity";
import { CURRENCIES, type Currency } from "@/domain/value-objects/money.vo";

import { createPlanAction } from "../_actions/create-plan.action";
import { lookupStripePriceAction } from "../_actions/lookup-stripe-price.action";

const INTERVAL_LABEL: Record<BillingInterval, string> = {
  month: "Mensal",
  year: "Anual",
  lifetime: "Vitalício (pagamento único)",
};

const inputClass =
  "focus-ring w-full rounded-xl border border-[color:var(--border-soft)] bg-[color:var(--surface-2)] px-3 py-2 text-[0.8125rem] text-[color:var(--text-primary)] outline-none focus:border-[color:var(--color-brand-500)]";

const labelClass = "mb-1.5 block text-[0.6875rem] font-semibold text-[color:var(--text-muted)]";

function emptyForm() {
  return {
    slug: "",
    name: "",
    provider: "stripe" as "stripe" | "manual",
    priceIdInput: "",
    providerProductId: "",
    providerPriceId: "",
    priceCents: "",
    currency: "BRL" as Currency,
    billingInterval: "month" as BillingInterval,
    sortOrder: "0",
    active: true,
  };
}

export function CreatePlanDialog() {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(emptyForm());
  const [lookupPending, startLookup] = useTransition();
  const [savePending, startSave] = useTransition();

  function lookup() {
    startLookup(async () => {
      const r = await lookupStripePriceAction(form.priceIdInput);
      if (!r.ok || !r.data) {
        toast.error("Não achei esse Price ID.", { description: r.message });
        return;
      }
      const d = r.data;
      setForm((f) => ({
        ...f,
        providerProductId: d.providerProductId,
        providerPriceId: d.providerPriceId,
        priceCents: d.priceCents,
        currency: d.currency,
        billingInterval: d.billingInterval,
        name: f.name || d.nickname || f.name,
      }));
      toast.success("Preço encontrado na Stripe.", {
        description: `${INTERVAL_LABEL[d.billingInterval]} · ${d.currency}`,
      });
    });
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    startSave(async () => {
      const r = await createPlanAction({
        slug: form.slug,
        name: form.name,
        provider: form.provider,
        providerProductId: form.providerProductId.trim() || null,
        providerPriceId: form.providerPriceId.trim() || null,
        priceCents: form.priceCents,
        currency: form.currency,
        billingInterval: form.billingInterval,
        features: [],
        sortOrder: Number(form.sortOrder) || 0,
        active: form.active,
      });
      if (r.ok) {
        toast.success("Plano criado.", { description: form.name });
        setForm(emptyForm());
        setOpen(false);
      } else {
        toast.error("Falha ao criar plano.", { description: r.message ?? "Tenta de novo." });
      }
    });
  }

  const canSubmit =
    !savePending &&
    form.slug.trim().length > 0 &&
    form.name.trim().length > 0 &&
    form.priceCents.trim().length > 0 &&
    (form.provider === "manual" || form.providerPriceId.trim().length > 0);

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!savePending) {
          setOpen(next);
          if (!next) setForm(emptyForm());
        }
      }}
    >
      <DialogTrigger asChild>
        <button
          type="button"
          className="focus-ring rounded-xl bg-[linear-gradient(135deg,#f28e25,#ef7a1a)] px-4 py-2 text-[0.8125rem] font-bold text-white"
        >
          Criar plano
        </button>
      </DialogTrigger>

      <DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto border-[color:var(--border-soft)] bg-[color:var(--bg-app)] p-6">
        <DialogHeader>
          <DialogTitle className="text-[color:var(--text-primary)]">Criar plano</DialogTitle>
          <DialogDescription className="text-[color:var(--text-secondary)]">
            O valor real fica na Stripe; aqui você controla o que aparece pro usuário.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={submit} className="flex flex-col gap-4">
          <div className="flex gap-2">
            {(["stripe", "manual"] as const).map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setForm((f) => ({ ...f, provider: p }))}
                className={`focus-ring flex-1 rounded-xl border px-3 py-2 text-[0.8125rem] font-semibold transition-colors ${
                  form.provider === p
                    ? "border-[color:var(--color-brand-500)] bg-[color:var(--color-brand-500)]/15 text-[color:var(--color-brand-700)]"
                    : "border-[color:var(--border-soft)] text-[color:var(--text-secondary)] hover:bg-[color:var(--surface-2)]"
                }`}
              >
                {p === "stripe" ? "Stripe" : "Manual (cortesia)"}
              </button>
            ))}
          </div>

          {form.provider === "stripe" ? (
            <div>
              <label className={labelClass} htmlFor="priceIdInput">
                Price ID da Stripe
              </label>
              <div className="flex gap-2">
                <input
                  id="priceIdInput"
                  value={form.priceIdInput}
                  onChange={(e) => setForm((f) => ({ ...f, priceIdInput: e.target.value }))}
                  placeholder="price_..."
                  className={inputClass}
                />
                <button
                  type="button"
                  disabled={lookupPending || form.priceIdInput.trim().length === 0}
                  onClick={lookup}
                  className="focus-ring relative flex-shrink-0 rounded-xl border border-[color:var(--border-soft)] bg-[color:var(--surface-2)] px-4 py-2 text-[0.8125rem] font-semibold text-[color:var(--text-primary)] hover:bg-[color:var(--surface-3)] disabled:opacity-60"
                >
                  <span className={lookupPending ? "opacity-0" : "opacity-100"}>Buscar</span>
                  {lookupPending ? (
                    <span className="absolute inset-0 flex items-center justify-center">
                      <Spinner size={14} />
                    </span>
                  ) : null}
                </button>
              </div>
              {form.providerPriceId ? (
                <p className="mt-2 rounded-xl border border-[color:var(--border-soft)] bg-[color:var(--surface-1)] px-3 py-2 text-[0.75rem] text-[color:var(--text-secondary)]">
                  Produto <span className="text-[color:var(--text-primary)]">{form.providerProductId}</span>{" "}
                  · {form.currency} {(Number(form.priceCents) / 100).toFixed(2)} ·{" "}
                  {INTERVAL_LABEL[form.billingInterval]}
                </p>
              ) : null}
            </div>
          ) : null}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass} htmlFor="slug">
                Slug
              </label>
              <input
                id="slug"
                value={form.slug}
                onChange={(e) => setForm((f) => ({ ...f, slug: e.target.value }))}
                placeholder="pro-mensal"
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass} htmlFor="name">
                Nome
              </label>
              <input
                id="name"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="PRO Mensal"
                className={inputClass}
              />
            </div>
          </div>

          {form.provider === "manual" ? (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelClass} htmlFor="priceCents">
                  Preço (centavos)
                </label>
                <input
                  id="priceCents"
                  value={form.priceCents}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, priceCents: e.target.value.replace(/\D/g, "") }))
                  }
                  placeholder="0"
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass} htmlFor="currency">
                  Moeda
                </label>
                <select
                  id="currency"
                  value={form.currency}
                  onChange={(e) => setForm((f) => ({ ...f, currency: e.target.value as Currency }))}
                  className={inputClass}
                >
                  {CURRENCIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>
              <div className="col-span-2">
                <label className={labelClass} htmlFor="billingInterval">
                  Intervalo
                </label>
                <select
                  id="billingInterval"
                  value={form.billingInterval}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, billingInterval: e.target.value as BillingInterval }))
                  }
                  className={inputClass}
                >
                  {(Object.keys(INTERVAL_LABEL) as BillingInterval[]).map((i) => (
                    <option key={i} value={i}>
                      {INTERVAL_LABEL[i]}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          ) : null}

          <div className="flex items-center justify-between gap-3">
            <div className="w-24">
              <label className={labelClass} htmlFor="sortOrder">
                Ordem
              </label>
              <input
                id="sortOrder"
                value={form.sortOrder}
                onChange={(e) =>
                  setForm((f) => ({ ...f, sortOrder: e.target.value.replace(/\D/g, "") }))
                }
                className={inputClass}
              />
            </div>
            <label className="flex items-center gap-2 text-[0.8125rem] font-semibold text-[color:var(--text-primary)]">
              <input
                type="checkbox"
                checked={form.active}
                onChange={(e) => setForm((f) => ({ ...f, active: e.target.checked }))}
              />
              Ativo (visível pro usuário)
            </label>
          </div>

          <DialogFooter className="mt-2">
            <button
              type="button"
              onClick={() => setOpen(false)}
              disabled={savePending}
              className="focus-ring rounded-xl border border-[color:var(--border-soft)] bg-[color:var(--surface-2)] px-4 py-2 text-[0.8125rem] font-semibold text-[color:var(--text-primary)] hover:bg-[color:var(--surface-3)] disabled:opacity-60"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={!canSubmit}
              className="focus-ring relative rounded-xl bg-[linear-gradient(135deg,#f28e25,#ef7a1a)] px-5 py-2 text-[0.8125rem] font-bold text-white disabled:opacity-60"
            >
              <span className={savePending ? "opacity-0" : "opacity-100"}>Salvar plano</span>
              {savePending ? (
                <span className="absolute inset-0 flex items-center justify-center">
                  <Spinner size={16} />
                </span>
              ) : null}
            </button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
