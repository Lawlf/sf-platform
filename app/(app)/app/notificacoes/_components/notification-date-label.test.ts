import { describe, expect, it } from "vitest";

import { notificationDateLabel } from "./notification-date-label";

const now = new Date("2026-06-10T12:00:00");

function daysAgo(n: number): Date {
  const d = new Date(now);
  d.setDate(d.getDate() - n);
  return d;
}

describe("notificationDateLabel", () => {
  it("hoje", () => {
    expect(notificationDateLabel(daysAgo(0), now)).toBe("Hoje");
  });

  it("ontem", () => {
    expect(notificationDateLabel(daysAgo(1), now)).toBe("Ontem");
  });

  it("mesma semana = dia da semana capitalizado", () => {
    const label = notificationDateLabel(daysAgo(3), now);
    expect(["Hoje", "Ontem", "Semana passada"]).not.toContain(label);
    expect(label).toMatch(/-feira$|^Sábado$|^Domingo$/);
  });

  it("7 a 13 dias = Semana passada", () => {
    expect(notificationDateLabel(daysAgo(7), now)).toBe("Semana passada");
    expect(notificationDateLabel(daysAgo(13), now)).toBe("Semana passada");
  });

  it("14+ dias = data com ano", () => {
    const label = notificationDateLabel(daysAgo(40), now);
    expect(label).toMatch(/2026/);
  });
});
