import { describe, expect, it, vi } from "vitest";

import type { ProfileRepositoryPort } from "@/domain/ports/repositories/profile.repository";
import { createProfile } from "./create-profile.use-case";

type CreateInput = Parameters<ProfileRepositoryPort["create"]>[0];

describe("createProfile", () => {
  it("cria um perfil não-principal do tipo pedido", async () => {
    const created = vi.fn(async (i: CreateInput) => ({
      id: "new",
      userId: i.userId,
      type: i.type,
      linkedProfileId: null,
      displayName: i.displayName,
      isPrimary: i.isPrimary,
      createdAt: i.now,
      updatedAt: i.now,
    }));
    const r = await createProfile(
      { profiles: { create: created } as never, clock: { now: () => new Date("2026-06-18T00:00:00Z") } },
      { userId: "u1", type: "PJ_MEI", displayName: "Minha PJ 2" },
    );
    expect(r._tag).toBe("ok");
    expect(created).toHaveBeenCalledWith(
      expect.objectContaining({ userId: "u1", type: "PJ_MEI", displayName: "Minha PJ 2", isPrimary: false }),
    );
  });
});
