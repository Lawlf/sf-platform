import { describe, it, expect } from "vitest";

import { GET } from "./route";

describe("GET /api/health", () => {
  it("returns 200 with status ok and an ISO timestamp", async () => {
    const response = await GET();
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.status).toBe("ok");
    expect(typeof body.time).toBe("string");
    expect(() => new Date(body.time).toISOString()).not.toThrow();
  });
});
