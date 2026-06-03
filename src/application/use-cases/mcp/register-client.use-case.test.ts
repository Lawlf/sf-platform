import { describe, expect, it } from "vitest";

import { isErr, isOk } from "@/shared/errors/result";

import { registerClient } from "./register-client.use-case";

function deps() {
  const created: unknown[] = [];
  return {
    clients: {
      create: async (input: {
        clientId: string;
        name: string;
        redirectUris: string[];
        clientSecretHash: string | null;
      }) => {
        created.push(input);
        return { id: "row1", ...input, createdAt: new Date() };
      },
    },
    random: { urlToken: () => "rand-client-id" },
    created,
  };
}

describe("registerClient", () => {
  it("cria cliente público com redirect uris", async () => {
    const d = deps();
    const r = await registerClient(d, { clientName: "Claude", redirectUris: ["https://claude.ai/cb"] });
    expect(isOk(r)).toBe(true);
    if (isOk(r)) {
      expect(r.value.clientId).toBe("rand-client-id");
      expect(r.value.redirectUris).toEqual(["https://claude.ai/cb"]);
    }
  });

  it("rejeita sem redirect uri", async () => {
    const d = deps();
    const r = await registerClient(d, { clientName: "X", redirectUris: [] });
    expect(isErr(r)).toBe(true);
  });
});
