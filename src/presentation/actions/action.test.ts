import { revalidatePath } from "next/cache";
import { describe, expect, it, vi } from "vitest";
import { z } from "zod";

import { DomainError } from "@/shared/errors/domain-error";
import { err, ok } from "@/shared/errors/result";


import { action, unwrap } from "./action";

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/presentation/http/middleware/cached-current-user", () => ({
  requireUser: vi.fn().mockResolvedValue({ id: "user-1" }),
}));
vi.mock("@/presentation/http/middleware/active-profile", () => ({
  getActiveProfileId: vi.fn().mockResolvedValue("profile-1"),
}));

class TestError extends DomainError {
  readonly code = "TEST_ERROR";

  constructor() {
    super("Limite do plano atingido.");
  }
}

const schema = z.object({ label: z.string().min(1, "Informe um nome.") });

describe("action()", () => {
  it("parseia FormData e injeta ctx.userId", async () => {
    const handler = vi.fn().mockResolvedValue({ id: "x" });
    const fn = action({ schema, handler });
    const fd = new FormData();
    fd.set("label", "Mercado");
    const r = await fn(fd);
    expect(r).toEqual({ ok: true, data: { id: "x" } });
    expect(handler).toHaveBeenCalledWith({ label: "Mercado" }, { userId: "user-1", profileId: "profile-1" });
  });

  it("parseia objeto plano", async () => {
    const fn = action({ schema, handler: async () => undefined });
    const r = await fn({ label: "ok" });
    expect(r.ok).toBe(true);
  });

  it("retorna primeira issue do zod em input inválido", async () => {
    const fn = action({ schema, handler: vi.fn() });
    const r = await fn({ label: "" });
    expect(r).toEqual({ ok: false, message: "Informe um nome." });
  });

  it("mapeia DomainError pra mensagem dele", async () => {
    const fn = action({
      schema,
      handler: async () => {
        throw new TestError();
      },
    });
    const r = await fn({ label: "ok" });
    expect(r).toEqual({ ok: false, message: "Limite do plano atingido." });
  });

  it("relança erros de controle do Next (redirect/notFound)", async () => {
    const redirectError = Object.assign(new Error("NEXT_REDIRECT"), {
      digest: "NEXT_REDIRECT;push;/destino;307;",
    });
    const fn = action({
      schema,
      handler: async () => {
        throw redirectError;
      },
    });
    await expect(fn({ label: "ok" })).rejects.toBe(redirectError);
  });

  it("mascara erro desconhecido com mensagem genérica", async () => {
    const fn = action({
      schema,
      handler: async () => {
        throw new Error("ECONNRESET");
      },
    });
    const r = await fn({ label: "ok" });
    expect(r).toEqual({ ok: false, message: "Algo deu errado. Tente novamente." });
  });

  it("revalida grupos declarados só no sucesso", async () => {
    vi.mocked(revalidatePath).mockClear();
    const fn = action({
      schema,
      revalidates: ["incomes"],
      handler: async () => undefined,
    });
    await fn({ label: "ok" });
    expect(revalidatePath).toHaveBeenCalledWith("/app/renda");

    vi.mocked(revalidatePath).mockClear();
    const failing = action({
      schema,
      revalidates: ["incomes"],
      handler: async () => {
        throw new TestError();
      },
    });
    await failing({ label: "ok" });
    expect(revalidatePath).not.toHaveBeenCalled();
  });
});

describe("unwrap()", () => {
  it("retorna valor de ok", () => {
    expect(unwrap(ok(42))).toBe(42);
  });

  it("lança o erro de err", () => {
    expect(() => unwrap(err(new TestError()))).toThrow("Limite do plano atingido.");
  });
});
