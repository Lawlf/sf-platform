import { getDebtDetail } from "@/application/use-cases/debt/get-debt-detail.use-case";
import { computeInstallmentDueDates } from "@/domain/services/debt-calendar.service";
import {
  buildDebtIcs,
  isAlarmOffset,
  slugifyDebtLabel,
  type AlarmOffset,
} from "@/infrastructure/calendar/ics-builder";
import { loadEnv } from "@/infrastructure/config/env";
import { DrizzleDebtPaymentRepository } from "@/infrastructure/persistence/drizzle/repositories/drizzle-debt-payment.repository";
import { DrizzleDebtRepository } from "@/infrastructure/persistence/drizzle/repositories/drizzle-debt.repository";
import { requireUser } from "@/presentation/http/middleware/cached-current-user";
import { isOk } from "@/shared/errors";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const DEFAULT_ALARM: AlarmOffset = "1d";

export async function GET(
  req: Request,
  context: { params: Promise<{ id: string }> },
): Promise<Response> {
  const user = await requireUser();
  const { id } = await context.params;

  const detail = await getDebtDetail(
    {
      debts: new DrizzleDebtRepository(),
      payments: new DrizzleDebtPaymentRepository(),
    },
    { userId: user.id, debtId: id },
  );

  if (!isOk(detail)) return new Response("Not found", { status: 404 });

  const { debt, amortization } = detail.value;
  if (debt.deletedAt !== null) return new Response("Not found", { status: 404 });

  const dueDates = computeInstallmentDueDates(debt, amortization);
  if (dueDates.length === 0) return new Response("Not found", { status: 404 });

  const url = new URL(req.url);
  const alarmParam = url.searchParams.get("alarm");
  const alarmOffset = isAlarmOffset(alarmParam) ? alarmParam : DEFAULT_ALARM;

  const env = loadEnv();
  const ics = buildDebtIcs({
    debt,
    dueDates,
    alarmOffset,
    appUrl: env.NEXT_PUBLIC_APP_URL,
  });

  const filename = `${slugifyDebtLabel(debt.label)}.ics`;
  return new Response(ics, {
    status: 200,
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
