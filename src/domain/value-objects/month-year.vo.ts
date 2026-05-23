/**
 * Mês/ano calendário. Usado pela linha do tempo (macro) para iterar e
 * comparar pontos mensais sem se preocupar com timezone ou granularidade
 * de dia. Construtor privado: use as factories estáticas.
 */
export class MonthYear {
  private constructor(
    public readonly year: number,
    public readonly month: number, // 1-12
  ) {}

  static from(year: number, month: number): MonthYear {
    if (!Number.isInteger(year) || year < 1900 || year > 2200) {
      throw new RangeError(`Invalid year: ${year}`);
    }
    if (!Number.isInteger(month) || month < 1 || month > 12) {
      throw new RangeError(`Invalid month: ${month}`);
    }
    return new MonthYear(year, month);
  }

  static fromIso(iso: string): MonthYear {
    const m = /^(\d{4})-(\d{2})$/.exec(iso);
    if (!m || !m[1] || !m[2]) {
      throw new RangeError(`Invalid month-year ISO: ${iso}`);
    }
    return MonthYear.from(parseInt(m[1], 10), parseInt(m[2], 10));
  }

  static fromDate(date: Date): MonthYear {
    return MonthYear.from(date.getUTCFullYear(), date.getUTCMonth() + 1);
  }

  previous(): MonthYear {
    if (this.month === 1) return MonthYear.from(this.year - 1, 12);
    return MonthYear.from(this.year, this.month - 1);
  }

  next(): MonthYear {
    if (this.month === 12) return MonthYear.from(this.year + 1, 1);
    return MonthYear.from(this.year, this.month + 1);
  }

  equals(other: MonthYear): boolean {
    return this.year === other.year && this.month === other.month;
  }

  isBefore(other: MonthYear): boolean {
    if (this.year !== other.year) return this.year < other.year;
    return this.month < other.month;
  }

  isAfter(other: MonthYear): boolean {
    if (this.year !== other.year) return this.year > other.year;
    return this.month > other.month;
  }

  isAtOrBefore(other: MonthYear): boolean {
    return this.equals(other) || this.isBefore(other);
  }

  isAtOrAfter(other: MonthYear): boolean {
    return this.equals(other) || this.isAfter(other);
  }

  toIso(): string {
    return `${this.year}-${String(this.month).padStart(2, "0")}`;
  }

  /**
   * Rótulo curto em PT-BR: "Mai 26", "Jan 27". Usado no eixo X da linha do
   * tempo. Ano de dois dígitos para caber em telas estreitas.
   */
  format(): string {
    const names = [
      "Jan",
      "Fev",
      "Mar",
      "Abr",
      "Mai",
      "Jun",
      "Jul",
      "Ago",
      "Set",
      "Out",
      "Nov",
      "Dez",
    ];
    const name = names[this.month - 1] ?? "?";
    return `${name} ${String(this.year).slice(2)}`;
  }

  toDate(day = 1): Date {
    return new Date(Date.UTC(this.year, this.month - 1, day, 0, 0, 0, 0));
  }

  firstDay(): Date {
    return this.toDate(1);
  }

  lastDay(): Date {
    return new Date(Date.UTC(this.year, this.month, 0, 23, 59, 59, 999));
  }

  daysInMonth(): number {
    return new Date(Date.UTC(this.year, this.month, 0)).getUTCDate();
  }
}
