import { describe, expect, it, vi } from "vitest";

import { renameAttachment } from "./rename-attachment.use-case";

function makeDeps(found: { id: string; fileName: string } | null) {
  return {
    attachments: {
      findById: vi.fn().mockResolvedValue(found),
      rename: vi.fn().mockResolvedValue(undefined),
    },
  };
}

describe("renameAttachment", () => {
  it("preserva a extensão original mesmo se o novo nome não tiver", async () => {
    const deps = makeDeps({ id: "a1", fileName: "contrato-emprestimo.pdf" });
    const r = await renameAttachment(deps, {
      userId: "u1",
      attachmentId: "a1",
      newName: "Contrato do carro",
    });
    expect(r).toEqual({ ok: true, fileName: "Contrato do carro.pdf" });
    expect(deps.attachments.rename).toHaveBeenCalledWith("a1", "u1", "Contrato do carro.pdf");
  });

  it("não duplica a extensão quando o usuário já digita ela", async () => {
    const deps = makeDeps({ id: "a1", fileName: "boleto.pdf" });
    const r = await renameAttachment(deps, {
      userId: "u1",
      attachmentId: "a1",
      newName: "fatura junho.pdf",
    });
    expect(r).toEqual({ ok: true, fileName: "fatura junho.pdf" });
  });

  it("rejeita nome vazio", async () => {
    const deps = makeDeps({ id: "a1", fileName: "x.pdf" });
    const r = await renameAttachment(deps, { userId: "u1", attachmentId: "a1", newName: "   " });
    expect(r.ok).toBe(false);
  });

  it("erro quando o anexo não existe", async () => {
    const deps = makeDeps(null);
    const r = await renameAttachment(deps, { userId: "u1", attachmentId: "x", newName: "y" });
    expect(r.ok).toBe(false);
    expect(deps.attachments.rename).not.toHaveBeenCalled();
  });
});
