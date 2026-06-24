import { describe, expect, it } from "vitest";
import type { NotificationKind } from "@/domain/entities/notification.entity";

describe("payment_overdue kind", () => {
  it("é um NotificationKind válido", () => {
    const k: NotificationKind = "payment_overdue";
    expect(k).toBe("payment_overdue");
  });
});
