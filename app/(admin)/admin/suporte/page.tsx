import type { Route } from "next";
import Link from "next/link";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/app/components/ui/select";

import { fmtDate } from "../_lib/format";

import {
  countFeedback,
  type FeedbackStatusFilter,
  listFeedback,
} from "./_actions/feedback-queries";

interface PageProps {
  searchParams: Promise<{
    status?: string;
    kind?: string;
    from?: string;
    to?: string;
    page?: string;
  }>;
}

const PAGE_SIZE = 50;

const KIND_LABELS: Record<string, string> = {
  problema: "Problema",
  sugestao: "Sugestão",
  duvida: "Dúvida",
};

const STATUS_LABELS: Record<string, string> = {
  aberto: "Aberto",
  respondido: "Respondido",
  fechado: "Fechado",
};

function rowType(kind: string | null, sentiment: "up" | "down" | null): string {
  if (kind) return KIND_LABELS[kind] ?? kind;
  if (sentiment === "up") return "Joinha +";
  if (sentiment === "down") return "Joinha -";
  return "-";
}

function ymd(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export default async function SuportePage({ searchParams }: PageProps) {
  const sp = await searchParams;

  const now = new Date();
  const defaultFrom = ymd(new Date(now.getFullYear(), now.getMonth(), 1));
  const defaultTo = ymd(new Date(now.getFullYear(), now.getMonth() + 1, 0));

  const status = (sp.status ?? "todos") as FeedbackStatusFilter;
  const kindParam = sp.kind ?? "";
  const kind = kindParam === "todos" ? "" : kindParam;
  const from = sp.from ?? defaultFrom;
  const to = sp.to ?? defaultTo;
  const page = Math.max(1, Number.parseInt(sp.page ?? "1", 10) || 1);

  const filters = { status, ...(kind ? { kind } : {}), from, to };
  const [rows, total] = await Promise.all([
    listFeedback(filters, PAGE_SIZE, (page - 1) * PAGE_SIZE),
    countFeedback(filters),
  ]);
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  function pageHref(p: number): Route {
    const params = new URLSearchParams();
    params.set("status", status);
    if (kind) params.set("kind", kind);
    params.set("from", from);
    params.set("to", to);
    params.set("page", String(p));
    return `/admin/suporte?${params.toString()}` as Route;
  }

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-bold text-[color:var(--text-primary)]">Suporte e feedback</h1>

      <form
        method="get"
        className="flex flex-wrap items-end gap-3 rounded-2xl border border-[color:var(--border-soft)] p-4"
      >
        <div className="flex flex-col gap-1 text-[0.6875rem] font-semibold uppercase tracking-wide text-[color:var(--text-muted)]">
          <label htmlFor="filter-status">Status</label>
          <Select name="status" defaultValue={status}>
            <SelectTrigger
              id="filter-status"
              className="h-auto w-full rounded-lg border border-[color:var(--border-soft)] bg-[color:var(--surface-1)] px-3 py-2 text-[0.8125rem] text-[color:var(--text-primary)]"
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos</SelectItem>
              <SelectItem value="aberto">Aberto</SelectItem>
              <SelectItem value="respondido">Respondido</SelectItem>
              <SelectItem value="fechado">Fechado</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex flex-col gap-1 text-[0.6875rem] font-semibold uppercase tracking-wide text-[color:var(--text-muted)]">
          <label htmlFor="filter-kind">Tipo</label>
          <Select name="kind" defaultValue={kind || "todos"}>
            <SelectTrigger
              id="filter-kind"
              className="h-auto w-full rounded-lg border border-[color:var(--border-soft)] bg-[color:var(--surface-1)] px-3 py-2 text-[0.8125rem] text-[color:var(--text-primary)]"
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos</SelectItem>
              <SelectItem value="problema">Problema</SelectItem>
              <SelectItem value="sugestao">Sugestão</SelectItem>
              <SelectItem value="duvida">Dúvida</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <label className="flex flex-col gap-1 text-[0.6875rem] font-semibold uppercase tracking-wide text-[color:var(--text-muted)]">
          De
          <input
            type="date"
            name="from"
            defaultValue={from}
            className="rounded-lg border border-[color:var(--border-soft)] bg-[color:var(--surface-1)] px-3 py-2 text-[0.8125rem] text-[color:var(--text-primary)]"
          />
        </label>
        <label className="flex flex-col gap-1 text-[0.6875rem] font-semibold uppercase tracking-wide text-[color:var(--text-muted)]">
          Até
          <input
            type="date"
            name="to"
            defaultValue={to}
            className="rounded-lg border border-[color:var(--border-soft)] bg-[color:var(--surface-1)] px-3 py-2 text-[0.8125rem] text-[color:var(--text-primary)]"
          />
        </label>
        <button
          type="submit"
          className="rounded-lg bg-[color:var(--surface-2)] px-4 py-2 text-[0.8125rem] font-semibold text-[color:var(--text-primary)]"
        >
          Filtrar
        </button>
      </form>

      <section className="glass-light overflow-x-auto rounded-2xl p-4">
        <table className="w-full border-collapse text-[0.8125rem]">
          <thead>
            <tr className="text-left text-[color:var(--text-muted)]">
              <th scope="col" className="pb-2">Tipo</th>
              <th scope="col" className="pb-2">Quem</th>
              <th scope="col" className="pb-2">Mensagem</th>
              <th scope="col" className="pb-2">Imagens</th>
              <th scope="col" className="pb-2">Status</th>
              <th scope="col" className="pb-2">Quando</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-t border-[color:var(--border-soft)]">
                <td className="py-2 pr-3 font-semibold text-[color:var(--text-primary)]">
                  <Link
                    href={`/admin/suporte/${r.id}` as Route}
                    className="hover:text-[color:var(--color-brand-700)]"
                  >
                    {rowType(r.kind, r.sentiment)}
                  </Link>
                </td>
                <td className="py-2 pr-3 text-[color:var(--text-secondary)]">
                  {r.userEmail ?? "-"}
                </td>
                <td className="max-w-[280px] truncate py-2 pr-3 text-[color:var(--text-secondary)]">
                  {r.comment ?? r.surface}
                </td>
                <td className="py-2 pr-3 text-[color:var(--text-secondary)]">
                  {r.attachmentCount > 0 ? r.attachmentCount : "-"}
                </td>
                <td className="py-2 pr-3">{STATUS_LABELS[r.status] ?? r.status}</td>
                <td className="py-2 pr-3 text-[color:var(--text-muted)]">{fmtDate(r.createdAt)}</td>
              </tr>
            ))}
            {rows.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-6 text-center text-[color:var(--text-muted)]">
                  Nenhum feedback com esses filtros.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </section>

      <div className="flex items-center justify-between text-[0.8125rem] text-[color:var(--text-secondary)]">
        <span>
          {total} no total · página {page} de {totalPages}
        </span>
        <div className="flex items-center gap-2">
          {page > 1 ? (
            <Link
              href={pageHref(page - 1)}
              className="rounded-lg border border-[color:var(--border-soft)] px-3 py-1.5 font-semibold hover:bg-[color:var(--surface-2)]"
            >
              Anterior
            </Link>
          ) : null}
          {page < totalPages ? (
            <Link
              href={pageHref(page + 1)}
              className="rounded-lg border border-[color:var(--border-soft)] px-3 py-1.5 font-semibold hover:bg-[color:var(--surface-2)]"
            >
              Próxima
            </Link>
          ) : null}
        </div>
      </div>
    </div>
  );
}
