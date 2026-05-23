import type { DebtEntity } from "@/domain/entities/debt.entity";
import type { InstallmentDueDate } from "@/domain/services/debt-calendar.service";

export type AlarmOffset = "none" | "1d" | "3d" | "7d";

const ALARM_OFFSETS: readonly AlarmOffset[] = ["none", "1d", "3d", "7d"];

export function isAlarmOffset(value: unknown): value is AlarmOffset {
  return typeof value === "string" && (ALARM_OFFSETS as readonly string[]).includes(value);
}

export interface BuildDebtIcsInput {
  debt: DebtEntity;
  dueDates: InstallmentDueDate[];
  alarmOffset: AlarmOffset;
  appUrl: string;
  now?: Date;
}

export function buildDebtIcs(input: BuildDebtIcsInput): string {
  const { debt, dueDates, alarmOffset, appUrl, now = new Date() } = input;

  const lines: string[] = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Sabor Financeiro//Dividas//PT-BR",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
  ];

  for (const row of dueDates) {
    lines.push(...buildVEvent({ debt, row, alarmOffset, appUrl, now }));
  }

  lines.push("END:VCALENDAR");

  return lines.map(foldLine).join("\r\n") + "\r\n";
}

interface BuildVEventInput {
  debt: DebtEntity;
  row: InstallmentDueDate;
  alarmOffset: AlarmOffset;
  appUrl: string;
  now: Date;
}

function buildVEvent({ debt, row, alarmOffset, appUrl, now }: BuildVEventInput): string[] {
  const summary = `${row.description} ${row.amount.format()} - ${debt.label}`;
  const debtUrl = `${appUrl.replace(/\/$/, "")}/app/dividas/${debt.id}`;
  const description = [
    `Vencimento da parcela registrada no Sabor Financeiro.`,
    ``,
    `Valor: ${row.amount.format()}`,
    `Dívida: ${debt.label}`,
    `Ver no Sabor: ${debtUrl}`,
  ].join("\\n");

  const lines: string[] = [
    "BEGIN:VEVENT",
    `UID:divida-${debt.id}-parcela-${row.month}@saborfinanceiro.com.br`,
    `DTSTAMP:${formatIcsUtcStamp(now)}`,
    `DTSTART;VALUE=DATE:${formatIcsDate(row.dueDate)}`,
    `DTEND;VALUE=DATE:${formatIcsDate(addOneDay(row.dueDate))}`,
    `SUMMARY:${escapeIcsText(summary)}`,
    `DESCRIPTION:${escapeIcsText(description)}`,
  ];

  const trigger = triggerForAlarm(alarmOffset);
  if (trigger !== null) {
    lines.push(
      "BEGIN:VALARM",
      "ACTION:DISPLAY",
      `DESCRIPTION:${escapeIcsText(`Lembrete: ${summary}`)}`,
      `TRIGGER:${trigger}`,
      "END:VALARM",
    );
  }

  lines.push("END:VEVENT");
  return lines;
}

export function escapeIcsText(value: string): string {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\r\n/g, "\\n")
    .replace(/\n/g, "\\n");
}

export function formatIcsDate(date: Date): string {
  const y = date.getUTCFullYear().toString().padStart(4, "0");
  const m = (date.getUTCMonth() + 1).toString().padStart(2, "0");
  const d = date.getUTCDate().toString().padStart(2, "0");
  return `${y}${m}${d}`;
}

export function formatIcsUtcStamp(date: Date): string {
  const y = date.getUTCFullYear().toString().padStart(4, "0");
  const mo = (date.getUTCMonth() + 1).toString().padStart(2, "0");
  const d = date.getUTCDate().toString().padStart(2, "0");
  const h = date.getUTCHours().toString().padStart(2, "0");
  const mi = date.getUTCMinutes().toString().padStart(2, "0");
  const s = date.getUTCSeconds().toString().padStart(2, "0");
  return `${y}${mo}${d}T${h}${mi}${s}Z`;
}

function addOneDay(date: Date): Date {
  return new Date(date.getTime() + 24 * 60 * 60 * 1000);
}

function triggerForAlarm(offset: AlarmOffset): string | null {
  switch (offset) {
    case "none":
      return null;
    case "1d":
      return "-P1D";
    case "3d":
      return "-P3D";
    case "7d":
      return "-P7D";
  }
}

const MAX_LINE_OCTETS = 75;

export function foldLine(line: string): string {
  const bytes = new TextEncoder().encode(line);
  if (bytes.length <= MAX_LINE_OCTETS) return line;

  const decoder = new TextDecoder("utf-8");
  const chunks: string[] = [];
  let start = 0;
  let isFirst = true;
  while (start < bytes.length) {
    const limit = isFirst ? MAX_LINE_OCTETS : MAX_LINE_OCTETS - 1;
    let end = Math.min(start + limit, bytes.length);
    while (end < bytes.length && end > start && (bytes[end]! & 0xc0) === 0x80) {
      end--;
    }
    if (end === start) end = Math.min(start + limit, bytes.length);
    chunks.push(decoder.decode(bytes.slice(start, end)));
    start = end;
    isFirst = false;
  }

  return chunks.map((c, i) => (i === 0 ? c : ` ${c}`)).join("\r\n");
}

export function slugifyDebtLabel(label: string): string {
  const normalized = label
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-+/g, "-");
  return normalized.length > 0 ? normalized : "divida";
}
