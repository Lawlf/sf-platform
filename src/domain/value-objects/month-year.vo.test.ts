import { describe, expect, it } from "vitest";

import { MonthYear } from "./month-year.vo";

describe("MonthYear.from", () => {
  it("aceita ano/mês válidos", () => {
    const my = MonthYear.from(2026, 5);
    expect(my.year).toBe(2026);
    expect(my.month).toBe(5);
  });

  it("rejeita ano fora do intervalo (1899)", () => {
    expect(() => MonthYear.from(1899, 1)).toThrow(RangeError);
  });

  it("rejeita ano fora do intervalo (2201)", () => {
    expect(() => MonthYear.from(2201, 1)).toThrow(RangeError);
  });

  it("rejeita ano NaN", () => {
    expect(() => MonthYear.from(Number.NaN, 1)).toThrow(RangeError);
  });

  it("rejeita ano fracionário", () => {
    expect(() => MonthYear.from(2026.5, 1)).toThrow(RangeError);
  });

  it("rejeita mês 0", () => {
    expect(() => MonthYear.from(2026, 0)).toThrow(RangeError);
  });

  it("rejeita mês 13", () => {
    expect(() => MonthYear.from(2026, 13)).toThrow(RangeError);
  });

  it("rejeita mês NaN", () => {
    expect(() => MonthYear.from(2026, Number.NaN)).toThrow(RangeError);
  });

  it("rejeita mês fracionário", () => {
    expect(() => MonthYear.from(2026, 5.5)).toThrow(RangeError);
  });
});

describe("MonthYear.fromIso", () => {
  it('parseia "2026-05"', () => {
    const my = MonthYear.fromIso("2026-05");
    expect(my.year).toBe(2026);
    expect(my.month).toBe(5);
  });

  it('rejeita "2026-5" (mês sem zero à esquerda)', () => {
    expect(() => MonthYear.fromIso("2026-5")).toThrow(RangeError);
  });

  it('rejeita "2026/05"', () => {
    expect(() => MonthYear.fromIso("2026/05")).toThrow(RangeError);
  });

  it('rejeita "abc"', () => {
    expect(() => MonthYear.fromIso("abc")).toThrow(RangeError);
  });
});

describe("MonthYear.fromDate", () => {
  it("extrai ano/mês de uma Date em UTC", () => {
    const d = new Date(Date.UTC(2026, 4, 15, 12, 0, 0)); // mai/2026
    const my = MonthYear.fromDate(d);
    expect(my.year).toBe(2026);
    expect(my.month).toBe(5);
  });
});

describe("MonthYear.previous / next", () => {
  it("previous de janeiro vai para dezembro do ano anterior", () => {
    const my = MonthYear.from(2026, 1).previous();
    expect(my.year).toBe(2025);
    expect(my.month).toBe(12);
  });

  it("next de dezembro vai para janeiro do próximo ano", () => {
    const my = MonthYear.from(2026, 12).next();
    expect(my.year).toBe(2027);
    expect(my.month).toBe(1);
  });

  it("previous dentro do mesmo ano", () => {
    const my = MonthYear.from(2026, 5).previous();
    expect(my.year).toBe(2026);
    expect(my.month).toBe(4);
  });

  it("next dentro do mesmo ano", () => {
    const my = MonthYear.from(2026, 5).next();
    expect(my.year).toBe(2026);
    expect(my.month).toBe(6);
  });
});

describe("MonthYear comparações", () => {
  it("equals true para mesmo ano+mês, false caso contrário", () => {
    expect(MonthYear.from(2026, 5).equals(MonthYear.from(2026, 5))).toBe(true);
    expect(MonthYear.from(2026, 5).equals(MonthYear.from(2026, 6))).toBe(false);
    expect(MonthYear.from(2026, 5).equals(MonthYear.from(2025, 5))).toBe(false);
  });

  it("isBefore considera ano e mês", () => {
    expect(MonthYear.from(2025, 12).isBefore(MonthYear.from(2026, 1))).toBe(true);
    expect(MonthYear.from(2026, 4).isBefore(MonthYear.from(2026, 5))).toBe(true);
    expect(MonthYear.from(2026, 5).isBefore(MonthYear.from(2026, 5))).toBe(false);
    expect(MonthYear.from(2026, 6).isBefore(MonthYear.from(2026, 5))).toBe(false);
  });

  it("isAfter considera ano e mês", () => {
    expect(MonthYear.from(2026, 1).isAfter(MonthYear.from(2025, 12))).toBe(true);
    expect(MonthYear.from(2026, 6).isAfter(MonthYear.from(2026, 5))).toBe(true);
    expect(MonthYear.from(2026, 5).isAfter(MonthYear.from(2026, 5))).toBe(false);
    expect(MonthYear.from(2026, 4).isAfter(MonthYear.from(2026, 5))).toBe(false);
  });

  it("isAtOrBefore é inclusivo", () => {
    expect(MonthYear.from(2026, 5).isAtOrBefore(MonthYear.from(2026, 5))).toBe(true);
    expect(MonthYear.from(2026, 4).isAtOrBefore(MonthYear.from(2026, 5))).toBe(true);
    expect(MonthYear.from(2026, 6).isAtOrBefore(MonthYear.from(2026, 5))).toBe(false);
  });

  it("isAtOrAfter é inclusivo", () => {
    expect(MonthYear.from(2026, 5).isAtOrAfter(MonthYear.from(2026, 5))).toBe(true);
    expect(MonthYear.from(2026, 6).isAtOrAfter(MonthYear.from(2026, 5))).toBe(true);
    expect(MonthYear.from(2026, 4).isAtOrAfter(MonthYear.from(2026, 5))).toBe(false);
  });
});

describe("MonthYear.toIso", () => {
  it('produz "YYYY-MM" com zero à esquerda', () => {
    expect(MonthYear.from(2026, 5).toIso()).toBe("2026-05");
    expect(MonthYear.from(2026, 12).toIso()).toBe("2026-12");
  });
});

describe("MonthYear.format", () => {
  it('produz "Mai 26" para maio de 2026', () => {
    expect(MonthYear.from(2026, 5).format()).toBe("Mai 26");
  });

  it('produz "Dez 27" para dezembro de 2027', () => {
    expect(MonthYear.from(2027, 12).format()).toBe("Dez 27");
  });

  it('produz "Jan 26" para janeiro de 2026', () => {
    expect(MonthYear.from(2026, 1).format()).toBe("Jan 26");
  });
});

describe("MonthYear.toDate / firstDay / lastDay", () => {
  it("toDate(1) retorna o primeiro dia em UTC", () => {
    const d = MonthYear.from(2026, 5).toDate(1);
    expect(d.getUTCFullYear()).toBe(2026);
    expect(d.getUTCMonth()).toBe(4);
    expect(d.getUTCDate()).toBe(1);
    expect(d.getUTCHours()).toBe(0);
  });

  it("firstDay equivale a toDate(1)", () => {
    const my = MonthYear.from(2026, 5);
    expect(my.firstDay().getTime()).toBe(my.toDate(1).getTime());
  });

  it("lastDay retorna o último instante do último dia em UTC", () => {
    const d = MonthYear.from(2026, 5).lastDay();
    expect(d.getUTCFullYear()).toBe(2026);
    expect(d.getUTCMonth()).toBe(4); // ainda maio
    expect(d.getUTCDate()).toBe(31);
    expect(d.getUTCHours()).toBe(23);
    expect(d.getUTCMinutes()).toBe(59);
    expect(d.getUTCSeconds()).toBe(59);
    expect(d.getUTCMilliseconds()).toBe(999);
  });

  it("lastDay para fevereiro 2025 (não-bissexto) cai em 28", () => {
    expect(MonthYear.from(2025, 2).lastDay().getUTCDate()).toBe(28);
  });

  it("lastDay para fevereiro 2024 (bissexto) cai em 29", () => {
    expect(MonthYear.from(2024, 2).lastDay().getUTCDate()).toBe(29);
  });
});

describe("MonthYear.daysInMonth", () => {
  it("janeiro tem 31 dias", () => {
    expect(MonthYear.from(2026, 1).daysInMonth()).toBe(31);
  });

  it("fevereiro 2025 (não-bissexto) tem 28 dias", () => {
    expect(MonthYear.from(2025, 2).daysInMonth()).toBe(28);
  });

  it("fevereiro 2024 (bissexto) tem 29 dias", () => {
    expect(MonthYear.from(2024, 2).daysInMonth()).toBe(29);
  });

  it("abril tem 30 dias", () => {
    expect(MonthYear.from(2026, 4).daysInMonth()).toBe(30);
  });
});
