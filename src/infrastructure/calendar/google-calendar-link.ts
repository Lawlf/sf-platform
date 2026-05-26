import type { DebtEntity } from "@/domain/entities/debt.entity";
import type { InstallmentDueDate } from "@/domain/services/debt-calendar.service";

import { formatIcsDate } from "./ics-builder";

export interface BuildGoogleCalendarUrlInput {
  debt: DebtEntity;
  dueDates: InstallmentDueDate[];
  appUrl: string;
}

// Monta o deep-link do Google Calendar (action=TEMPLATE) abrindo a tela de
// "criar evento" já preenchida. O Google só cria 1 evento por clique, então
// usamos RRULE mensal (FREQ=MONTHLY;COUNT=N) para cobrir todas as parcelas num
// único evento recorrente. Limitação aceita: título/valor é genérico (mesmo
// texto em toda ocorrência) e o lembrete usa o padrão da conta do usuário, não
// o offset custom — para precisão total o usuário baixa o .ics.
export function buildGoogleCalendarUrl(input: BuildGoogleCalendarUrlInput): string | null {
  const { debt, dueDates, appUrl } = input;
  if (dueDates.length === 0) return null;

  const first = dueDates[0]!;
  const start = formatIcsDate(first.dueDate);
  const end = formatIcsDate(addOneDay(first.dueDate));
  const count = dueDates.length;

  const debtUrl = `${appUrl.replace(/\/$/, "")}/app/dividas/${debt.id}`;
  const details = [
    "Vencimento da parcela registrado no Sabor Financeiro.",
    "",
    `Valor de referência: ${first.amount.format()}`,
    `Ver no Sabor: ${debtUrl}`,
  ].join("\n");

  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: `Parcela: ${debt.label}`,
    dates: `${start}/${end}`,
    details,
  });
  if (count > 1) {
    params.set("recur", `RRULE:FREQ=MONTHLY;COUNT=${count}`);
  }

  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

function addOneDay(date: Date): Date {
  return new Date(date.getTime() + 24 * 60 * 60 * 1000);
}
