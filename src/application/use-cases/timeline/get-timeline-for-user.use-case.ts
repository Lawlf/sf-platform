import {
  BASE_CURRENCY,
  convertAdjustmentToBase,
  convertAssetToBase,
  convertDebtToBase,
  convertIncomeToBase,
  convertPaymentToBase,
  type ConvertEntityDeps,
} from "@/application/use-cases/fx/convert-entity-to-base";
import type { AssetEntity } from "@/domain/entities/asset.entity";
import type { DebtAmountAdjustmentEntity } from "@/domain/entities/debt-amount-adjustment.entity";
import type { DebtPaymentEntity } from "@/domain/entities/debt-payment.entity";
import type { DebtEntity } from "@/domain/entities/debt.entity";
import type { IncomeEntity } from "@/domain/entities/income.entity";
import type { AssetRepositoryPort } from "@/domain/ports/repositories/asset.repository";
import type { DebtAmountAdjustmentRepositoryPort } from "@/domain/ports/repositories/debt-amount-adjustment.repository";
import type { DebtPaymentRepositoryPort } from "@/domain/ports/repositories/debt-payment.repository";
import type { DebtRepositoryPort } from "@/domain/ports/repositories/debt.repository";
import type { IncomeRepositoryPort } from "@/domain/ports/repositories/income.repository";
import { StoryDetectionService, type StoryCard } from "@/domain/services/story-detection.service";
import { TimelineService, type MonthlyDataPoint } from "@/domain/services/timeline.service";
import { MonthYear } from "@/domain/value-objects/month-year.vo";
import { type DomainError } from "@/shared/errors/domain-error";
import { isErr, ok, type Result } from "@/shared/errors/result";

export type TimelineRange = "3" | "6" | "12" | "24" | "all";
export type TimelineShow = "all" | "highlights" | "with-payments";

export interface GetTimelineForUserInput {
  userId: string;
  profileId: string;
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

export interface GetTimelineForUserDeps extends ConvertEntityDeps {
  incomes: IncomeRepositoryPort;
  debts: Pick<DebtRepositoryPort, "listForProfile">;
  debtPayments: Pick<DebtPaymentRepositoryPort, "listForProfileInRange">;
  assets: AssetRepositoryPort;
  // Opcional para preservar compat com testes legados que mockam só os 4 acima.
  // Quando ausente, a timeline é calculada sem ajustes históricos (valor base).
  debtAmountAdjustments?: Pick<DebtAmountAdjustmentRepositoryPort, "listForProfile">;
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

function subtractMonths(month: MonthYear, count: number): MonthYear {
  let result = month;
  for (let i = 0; i < count; i++) {
    result = result.previous();
  }
  return result;
}

function computeOlderCursor(
  from: MonthYear,
  oldestDate: Date | null,
  range: TimelineRange | undefined,
  now: MonthYear | undefined,
): string | null {
  if (!oldestDate) return null;
  if (from.isAtOrBefore(MonthYear.fromDate(oldestDate))) return null;
  if (range && range !== "all") {
    const rangeMonths = Number.parseInt(range, 10);
    if (Number.isFinite(rangeMonths) && rangeMonths > 0) {
      const effectiveNow = now ?? MonthYear.fromDate(new Date());
      const earliest = subtractMonths(effectiveNow, rangeMonths - 1);
      if (from.isAtOrBefore(earliest)) return null;
    }
  }
  return from.previous().toIso();
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
  const to = input.before;
  const from = subtractMonths(to, input.limit - 1);

  // Busca um mês a mais (antes de `from`) para contexto de stories (diff vs prev).
  const fetchFrom = from.previous();
  const [incomes, debts, payments, assets, adjustments] = await Promise.all([
    deps.incomes.listForProfile(input.profileId),
    deps.debts.listForProfile(input.profileId, { status: "all" }),
    deps.debtPayments.listForProfileInRange(input.profileId, {
      from: fetchFrom.firstDay(),
      to: to.lastDay(),
    }),
    deps.assets.findActiveByUser(input.userId),
    deps.debtAmountAdjustments ? deps.debtAmountAdjustments.listForProfile(input.profileId) : Promise.resolve([]),
  ]);

  const convertedIncomes: IncomeEntity[] = [];
  for (const inc of incomes) {
    const r = await convertIncomeToBase(deps, input.userId, inc, BASE_CURRENCY);
    if (isErr(r)) return r;
    convertedIncomes.push(r.value);
  }

  const convertedDebts: DebtEntity[] = [];
  for (const d of debts) {
    const r = await convertDebtToBase(deps, input.userId, d, BASE_CURRENCY);
    if (isErr(r)) return r;
    convertedDebts.push(r.value);
  }

  const convertedAssets: AssetEntity[] = [];
  for (const a of assets) {
    const r = await convertAssetToBase(deps, input.userId, a, BASE_CURRENCY);
    if (isErr(r)) return r;
    convertedAssets.push(r.value);
  }

  const convertedPayments: DebtPaymentEntity[] = [];
  for (const p of payments) {
    const r = await convertPaymentToBase(deps, input.userId, p, BASE_CURRENCY);
    if (isErr(r)) return r;
    convertedPayments.push(r.value);
  }

  const convertedAdjustments: DebtAmountAdjustmentEntity[] = [];
  for (const adj of adjustments) {
    const r = await convertAdjustmentToBase(deps, input.userId, adj, BASE_CURRENCY);
    if (isErr(r)) return r;
    convertedAdjustments.push(r.value);
  }

  const oldestDate = findOldestUserDate(convertedIncomes, convertedDebts, convertedAssets);
  const oldestUserDataIso = oldestDate ? MonthYear.fromDate(oldestDate).toIso() : null;

  const timeline = TimelineService.buildTimeline({
    incomes: convertedIncomes,
    debts: convertedDebts,
    payments: convertedPayments,
    assets: convertedAssets,
    from: fetchFrom,
    to,
    adjustments: convertedAdjustments,
    currentMonth: input.now ?? MonthYear.fromDate(new Date()),
  });
  const pagePoints = timeline.points.filter((p) => !p.month.isBefore(from));

  // `highlights` não filtra no server: o client decide com base nas stories.
  let filteredPoints = pagePoints;
  if (input.show === "with-payments") {
    filteredPoints = pagePoints.filter((p) => p.totalDebtPayments.toCents() > 0n);
  }

  const stories = StoryDetectionService.detect(filteredPoints);
  const pointsDesc = [...filteredPoints].reverse();
  const olderMonthIso = computeOlderCursor(from, oldestDate, input.range, input.now);

  return ok({
    points: pointsDesc,
    stories,
    olderMonthIso,
    oldestUserDataIso,
  });
}
