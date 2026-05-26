import type { AssetRepository } from "@/domain/ports/repositories/asset.repository";
import type { DebtAmountAdjustmentRepository } from "@/domain/ports/repositories/debt-amount-adjustment.repository";
import type { DebtPaymentRepository } from "@/domain/ports/repositories/debt-payment.repository";
import type { DebtRepository } from "@/domain/ports/repositories/debt.repository";
import type { IncomeRepository } from "@/domain/ports/repositories/income.repository";
import { StoryDetectionService, type StoryCard } from "@/domain/services/story-detection.service";
import { TimelineService, type MonthlyDataPoint } from "@/domain/services/timeline.service";
import { MonthYear } from "@/domain/value-objects/month-year.vo";
import { type DomainError } from "@/shared/errors/domain-error";
import { ok, type Result } from "@/shared/errors/result";

export type TimelineRange = "3" | "6" | "12" | "24" | "all";
export type TimelineShow = "all" | "highlights" | "with-payments";

export interface GetTimelineForUserInput {
  userId: string;
  /**
   * Mês mais recente INCLUÍDO nessa página (cursor descendente). A página
   * cobre `limit` meses terminando em `before` (inclusivo).
   */
  before: MonthYear;
  limit: number;
  range?: TimelineRange;
  show?: TimelineShow;
  /**
   * Referência de "agora" para o cap de `range`. Mantém o use case puro
   * (sem `Date.now()` internamente). Default: mês atual no momento da
   * chamada. O caller (action) injeta para deterministic tests.
   */
  now?: MonthYear;
}

export interface TimelinePageResult {
  /** Pontos da página em ordem decrescente (mais recente primeiro). */
  points: MonthlyDataPoint[];
  /** Stories detectadas na página, ordenadas por `monthIso` ascendente. */
  stories: StoryCard[];
  /** Cursor para a próxima página (mês mais recente da próxima página); null se não há mais dados. */
  olderMonthIso: string | null;
  /** Mês mais antigo com dados do usuário (income.startDate, createdAt). */
  oldestUserDataIso: string | null;
}

export interface GetTimelineForUserDeps {
  incomes: IncomeRepository;
  debts: DebtRepository;
  debtPayments: DebtPaymentRepository;
  assets: AssetRepository;
  // Opcional para preservar compat com testes legados que mockam só os 4 acima.
  // Quando ausente, a timeline é calculada sem ajustes históricos (valor base).
  debtAmountAdjustments?: DebtAmountAdjustmentRepository;
}

function findOldestUserDate(
  incomes: Array<{ startDate: Date; createdAt?: Date }>,
  debts: Array<{ createdAt: Date }>,
  assets: Array<{ createdAt: Date }>,
): Date | null {
  const candidates: Date[] = [];
  for (const inc of incomes) {
    if (inc.startDate) candidates.push(inc.startDate);
    if (inc.createdAt) candidates.push(inc.createdAt);
  }
  for (const d of debts) {
    if (d.createdAt) candidates.push(d.createdAt);
  }
  for (const a of assets) {
    if (a.createdAt) candidates.push(a.createdAt);
  }
  if (candidates.length === 0) return null;
  return new Date(Math.min(...candidates.map((d) => d.getTime())));
}

/**
 * Caso de uso da linha do tempo (macro) com paginação por cursor.
 *
 * A página cobre os `limit` meses imediatamente anteriores e inclusive
 * `before` (em ordem decrescente). Inclui detecção de stories e cálculo
 * do cursor para a próxima página.
 *
 * Inclui rendas inativas (linha do tempo é histórica), todas as dívidas e
 * somente ativos não desativados (limitação do repositório atual).
 */
export async function getTimelineForUser(
  deps: GetTimelineForUserDeps,
  input: GetTimelineForUserInput,
): Promise<Result<TimelinePageResult, DomainError>> {
  // Janela inclusiva da página: [from, to]. `to` é o mês mais recente.
  const to = input.before;
  let from = to;
  for (let i = 0; i < input.limit - 1; i++) {
    from = from.previous();
  }

  // Busca um mês a mais (antes de `from`) para contexto de stories (diff vs prev).
  const fetchFrom = from.previous();
  const [incomes, debts, payments, assets, adjustments] = await Promise.all([
    deps.incomes.listForUser(input.userId),
    deps.debts.listForUser(input.userId, { status: "all" }),
    deps.debtPayments.listForUserInRange(input.userId, {
      from: fetchFrom.firstDay(),
      to: to.lastDay(),
    }),
    deps.assets.findActiveByUser(input.userId),
    deps.debtAmountAdjustments ? deps.debtAmountAdjustments.listForUser(input.userId) : Promise.resolve([]),
  ]);

  // oldestUserDataIso: data mais antiga conhecida do usuário.
  const oldestDate = findOldestUserDate(incomes, debts, assets);
  const oldestUserDataIso = oldestDate ? MonthYear.fromDate(oldestDate).toIso() : null;

  // Constrói a timeline incluindo o mês extra (para contexto).
  const timeline = TimelineService.buildTimeline({
    incomes,
    debts,
    payments,
    assets,
    from: fetchFrom,
    to,
    adjustments,
  });
  // points vem em ordem crescente; filtra para descartar o mês de contexto.
  const pagePoints = timeline.points.filter((p) => !p.month.isBefore(from));

  // Filtro `show`.
  // `with-payments`: só meses com pagamento de dívida > 0.
  // `highlights`: não filtra no server (client decide com base em stories).
  let filteredPoints = pagePoints;
  if (input.show === "with-payments") {
    filteredPoints = pagePoints.filter((p) => p.totalDebtPayments.toCents() > 0n);
  }

  // Stories sobre os pontos retornados (StoryDetectionService já ordena por monthIso asc).
  const stories = StoryDetectionService.detect(filteredPoints);

  // Inverte para "mais recente primeiro".
  const pointsDesc = [...filteredPoints].reverse();

  // Cursor para próxima página: mês imediatamente anterior a `from`, salvo
  // que já alcançou o limite mais antigo dos dados.
  let olderMonthIso: string | null = from.previous().toIso();
  if (oldestDate) {
    const oldestMonth = MonthYear.fromDate(oldestDate);
    if (from.isAtOrBefore(oldestMonth)) {
      olderMonthIso = null;
    }
  } else {
    olderMonthIso = null;
  }

  // Cap por `range`: se finito, calcula o mês mais antigo permitido a partir de `now`.
  if (input.range && input.range !== "all") {
    const rangeMonths = Number.parseInt(input.range, 10);
    if (Number.isFinite(rangeMonths) && rangeMonths > 0) {
      const now = input.now ?? MonthYear.fromDate(new Date());
      let earliest = now;
      for (let i = 0; i < rangeMonths - 1; i++) earliest = earliest.previous();
      if (from.isAtOrBefore(earliest)) {
        olderMonthIso = null;
      }
    }
  }

  return ok({
    points: pointsDesc,
    stories,
    olderMonthIso,
    oldestUserDataIso,
  });
}
