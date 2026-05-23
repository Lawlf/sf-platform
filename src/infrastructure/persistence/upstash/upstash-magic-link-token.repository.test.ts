import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const redisMock = {
  hset: vi.fn(),
  expire: vi.fn(),
  set: vi.fn(),
  hgetall: vi.fn(),
  get: vi.fn(),
  hincrby: vi.fn(),
};

vi.mock("@upstash/redis", () => ({
  Redis: vi.fn(() => redisMock),
}));

describe("UpstashMagicLinkTokenRepository", () => {
  beforeEach(() => {
    vi.stubEnv("UPSTASH_REDIS_REST_URL", "https://x.upstash.io");
    vi.stubEnv("UPSTASH_REDIS_REST_TOKEN", "tk");
    vi.stubEnv("DATABASE_URL", "postgres://u:p@h:5432/db");
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "http://localhost:3000");
    vi.stubEnv("SESSION_COOKIE_SECRET", "a".repeat(32));
    Object.values(redisMock).forEach((m) => m.mockReset());
    vi.resetModules();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("create writes hash, sets TTL, sets email index", async () => {
    const { UpstashMagicLinkTokenRepository } = await import(
      "./upstash-magic-link-token.repository"
    );
    const repo = new UpstashMagicLinkTokenRepository();
    const expiresAt = new Date(Date.now() + 15 * 60_000);
    const result = await repo.create({
      tokenHash: "a".repeat(64),
      code: "123456",
      email: "Foo@Bar.com",
      userId: "user-1",
      expiresAt,
    });
    expect(result.email).toBe("foo@bar.com");
    expect(result.userId).toBe("user-1");
    expect(result.attemptCount).toBe(0);
    expect(redisMock.hset).toHaveBeenCalledWith(
      `mlt:token:${"a".repeat(64)}`,
      expect.objectContaining({ code: "123456", email: "foo@bar.com", userId: "user-1" }),
    );
    expect(redisMock.expire).toHaveBeenCalledWith(
      `mlt:token:${"a".repeat(64)}`,
      expect.any(Number),
    );
    expect(redisMock.set).toHaveBeenCalledWith(
      "mlt:email:foo@bar.com",
      "a".repeat(64),
      expect.objectContaining({ ex: expect.any(Number) }),
    );
  });

  it("create with null userId stores empty string", async () => {
    const { UpstashMagicLinkTokenRepository } = await import(
      "./upstash-magic-link-token.repository"
    );
    const repo = new UpstashMagicLinkTokenRepository();
    await repo.create({
      tokenHash: "b".repeat(64),
      code: "000000",
      email: "x@y.com",
      userId: null,
      expiresAt: new Date(Date.now() + 60_000),
    });
    expect(redisMock.hset).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ userId: "" }),
    );
  });

  it("findByTokenHash returns null when key missing", async () => {
    redisMock.hgetall.mockResolvedValueOnce(null);
    const { UpstashMagicLinkTokenRepository } = await import(
      "./upstash-magic-link-token.repository"
    );
    const repo = new UpstashMagicLinkTokenRepository();
    expect(await repo.findByTokenHash("nope")).toBeNull();
  });

  it("findByTokenHash parses hash into entity", async () => {
    redisMock.hgetall.mockResolvedValueOnce({
      code: "111111",
      email: "u@e.com",
      userId: "user-9",
      createdAt: "2030-01-01T00:00:00.000Z",
      expiresAt: "2030-01-01T00:15:00.000Z",
      usedAt: "",
      attemptCount: 2,
    });
    const { UpstashMagicLinkTokenRepository } = await import(
      "./upstash-magic-link-token.repository"
    );
    const repo = new UpstashMagicLinkTokenRepository();
    const entity = await repo.findByTokenHash("h");
    expect(entity).not.toBeNull();
    expect(entity!.code).toBe("111111");
    expect(entity!.userId).toBe("user-9");
    expect(entity!.usedAt).toBeNull();
    expect(entity!.attemptCount).toBe(2);
  });

  it("findActiveByEmail returns null when email index missing", async () => {
    redisMock.get.mockResolvedValueOnce(null);
    const { UpstashMagicLinkTokenRepository } = await import(
      "./upstash-magic-link-token.repository"
    );
    const repo = new UpstashMagicLinkTokenRepository();
    expect(await repo.findActiveByEmail("none@e.com")).toBeNull();
  });

  it("findActiveByEmail returns null when token usedAt set", async () => {
    redisMock.get.mockResolvedValueOnce("hashX");
    redisMock.hgetall.mockResolvedValueOnce({
      code: "111111",
      email: "u@e.com",
      userId: "",
      createdAt: "2030-01-01T00:00:00.000Z",
      expiresAt: new Date(Date.now() + 60_000).toISOString(),
      usedAt: new Date().toISOString(),
      attemptCount: 0,
    });
    const { UpstashMagicLinkTokenRepository } = await import(
      "./upstash-magic-link-token.repository"
    );
    const repo = new UpstashMagicLinkTokenRepository();
    expect(await repo.findActiveByEmail("u@e.com")).toBeNull();
  });

  it("findActiveByEmail returns null when expired", async () => {
    redisMock.get.mockResolvedValueOnce("hashX");
    redisMock.hgetall.mockResolvedValueOnce({
      code: "111111",
      email: "u@e.com",
      userId: "",
      createdAt: "2020-01-01T00:00:00.000Z",
      expiresAt: "2020-01-01T00:15:00.000Z",
      usedAt: "",
      attemptCount: 0,
    });
    const { UpstashMagicLinkTokenRepository } = await import(
      "./upstash-magic-link-token.repository"
    );
    const repo = new UpstashMagicLinkTokenRepository();
    expect(await repo.findActiveByEmail("u@e.com")).toBeNull();
  });

  it("findActiveByEmail returns entity when active", async () => {
    redisMock.get.mockResolvedValueOnce("hashX");
    redisMock.hgetall.mockResolvedValueOnce({
      code: "222222",
      email: "u@e.com",
      userId: "user-1",
      createdAt: "2030-01-01T00:00:00.000Z",
      expiresAt: new Date(Date.now() + 60_000).toISOString(),
      usedAt: "",
      attemptCount: 1,
    });
    const { UpstashMagicLinkTokenRepository } = await import(
      "./upstash-magic-link-token.repository"
    );
    const repo = new UpstashMagicLinkTokenRepository();
    const entity = await repo.findActiveByEmail("u@e.com");
    expect(entity).not.toBeNull();
    expect(entity!.code).toBe("222222");
  });

  it("markUsed sets usedAt", async () => {
    const { UpstashMagicLinkTokenRepository } = await import(
      "./upstash-magic-link-token.repository"
    );
    const repo = new UpstashMagicLinkTokenRepository();
    await repo.markUsed("hashY");
    expect(redisMock.hset).toHaveBeenCalledWith(
      "mlt:token:hashY",
      expect.objectContaining({ usedAt: expect.any(String) }),
    );
  });

  it("incrementAttempts returns numeric count", async () => {
    redisMock.hincrby.mockResolvedValueOnce(3);
    const { UpstashMagicLinkTokenRepository } = await import(
      "./upstash-magic-link-token.repository"
    );
    const repo = new UpstashMagicLinkTokenRepository();
    const result = await repo.incrementAttempts("hashZ");
    expect(result).toBe(3);
    expect(redisMock.hincrby).toHaveBeenCalledWith("mlt:token:hashZ", "attemptCount", 1);
  });

  it("deleteExpired is no-op (TTL handles)", async () => {
    const { UpstashMagicLinkTokenRepository } = await import(
      "./upstash-magic-link-token.repository"
    );
    const repo = new UpstashMagicLinkTokenRepository();
    expect(await repo.deleteExpired(new Date())).toBe(0);
  });
});
