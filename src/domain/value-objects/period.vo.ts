import { InvalidPeriodError } from "@/domain/errors/financial-errors";
import { err, ok, type Result } from "@/shared/errors/result";

const MS_PER_DAY = 24 * 60 * 60 * 1000;

export class Period {
  private constructor(
    private readonly startTs: number,
    private readonly endTs: number | null,
  ) {}

  static from(start: Date, end?: Date | null): Result<Period, InvalidPeriodError> {
    if (!isValidDate(start)) return err(new InvalidPeriodError("Data inicial inválida."));
    const startTs = start.getTime();
    let endTs: number | null = null;
    if (end !== undefined && end !== null) {
      if (!isValidDate(end)) return err(new InvalidPeriodError("Data final inválida."));
      endTs = end.getTime();
      if (endTs < startTs) {
        return err(new InvalidPeriodError("Data final anterior à data inicial."));
      }
    }
    return ok(new Period(startTs, endTs));
  }

  get start(): Date {
    return new Date(this.startTs);
  }

  get end(): Date | null {
    return this.endTs === null ? null : new Date(this.endTs);
  }

  monthsBetween(referenceEnd?: Date): number {
    const endTs = this.resolveEnd(referenceEnd);
    if (endTs === null) return 0;
    const start = new Date(this.startTs);
    const end = new Date(endTs);
    const years = end.getUTCFullYear() - start.getUTCFullYear();
    const months = end.getUTCMonth() - start.getUTCMonth();
    let total = years * 12 + months;
    // If the day-of-month hasn't been reached yet in the final month, subtract 1.
    if (end.getUTCDate() < start.getUTCDate()) total -= 1;
    return Math.max(0, total);
  }

  daysBetween(referenceEnd?: Date): number {
    const endTs = this.resolveEnd(referenceEnd);
    if (endTs === null) return 0;
    return Math.floor((endTs - this.startTs) / MS_PER_DAY);
  }

  contains(date: Date): boolean {
    if (!isValidDate(date)) return false;
    const t = date.getTime();
    if (t < this.startTs) return false;
    if (this.endTs !== null && t > this.endTs) return false;
    return true;
  }

  private resolveEnd(reference?: Date): number | null {
    if (this.endTs !== null) return this.endTs;
    if (reference && isValidDate(reference)) return reference.getTime();
    return null;
  }
}

function isValidDate(d: Date): boolean {
  return d instanceof Date && !Number.isNaN(d.getTime());
}
