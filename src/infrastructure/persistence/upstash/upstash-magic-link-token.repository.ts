import type { MagicLinkTokenEntity } from "@/domain/entities/magic-link-token.entity";
import type { MagicLinkTokenRepositoryPort } from "@/domain/ports/repositories/magic-link-token.repository";
import { getUpstashRedis } from "@/infrastructure/cache/upstash-redis";

const TOKEN_KEY = (h: string) => `mlt:token:${h}`;
const EMAIL_KEY = (e: string) => `mlt:email:${e.toLowerCase()}`;

type RawHash = Record<string, string | number | undefined>;

function toEntity(tokenHash: string, raw: RawHash): MagicLinkTokenEntity {
  const userIdRaw = raw.userId;
  const usedAtRaw = raw.usedAt;
  return {
    tokenHash,
    code: String(raw.code ?? ""),
    email: String(raw.email ?? ""),
    userId:
      typeof userIdRaw === "string" && userIdRaw.length > 0 ? userIdRaw : null,
    expiresAt: raw.expiresAt ? new Date(String(raw.expiresAt)) : new Date(0),
    usedAt:
      typeof usedAtRaw === "string" && usedAtRaw.length > 0 ? new Date(usedAtRaw) : null,
    attemptCount: raw.attemptCount !== undefined ? Number(raw.attemptCount) : 0,
    createdAt: raw.createdAt ? new Date(String(raw.createdAt)) : new Date(0),
  };
}

export class UpstashMagicLinkTokenRepository implements MagicLinkTokenRepositoryPort {
  async create(input: {
    tokenHash: string;
    code: string;
    email: string;
    userId: string | null;
    expiresAt: Date;
  }): Promise<MagicLinkTokenEntity> {
    const now = new Date();
    const ttlSeconds = Math.max(
      1,
      Math.floor((input.expiresAt.getTime() - now.getTime()) / 1000),
    );
    const email = input.email.toLowerCase();
    const redis = getUpstashRedis();
    const tokenKey = TOKEN_KEY(input.tokenHash);
    await redis.hset(tokenKey, {
      code: input.code,
      email,
      userId: input.userId ?? "",
      createdAt: now.toISOString(),
      expiresAt: input.expiresAt.toISOString(),
      usedAt: "",
      attemptCount: 0,
    });
    await redis.expire(tokenKey, ttlSeconds);
    await redis.set(EMAIL_KEY(email), input.tokenHash, { ex: ttlSeconds });
    return {
      tokenHash: input.tokenHash,
      code: input.code,
      email,
      userId: input.userId,
      expiresAt: input.expiresAt,
      usedAt: null,
      attemptCount: 0,
      createdAt: now,
    };
  }

  async findByTokenHash(tokenHash: string): Promise<MagicLinkTokenEntity | null> {
    const data = await getUpstashRedis().hgetall<RawHash>(TOKEN_KEY(tokenHash));
    if (!data || Object.keys(data).length === 0) return null;
    return toEntity(tokenHash, data);
  }

  async findActiveByEmail(email: string): Promise<MagicLinkTokenEntity | null> {
    const tokenHash = await getUpstashRedis().get<string>(EMAIL_KEY(email));
    if (!tokenHash) return null;
    const entity = await this.findByTokenHash(tokenHash);
    if (!entity) return null;
    if (entity.usedAt) return null;
    if (entity.expiresAt.getTime() <= Date.now()) return null;
    return entity;
  }

  async markUsed(tokenHash: string): Promise<void> {
    await getUpstashRedis().hset(TOKEN_KEY(tokenHash), {
      usedAt: new Date().toISOString(),
    });
  }

  async incrementAttempts(tokenHash: string): Promise<number> {
    const newCount = await getUpstashRedis().hincrby(
      TOKEN_KEY(tokenHash),
      "attemptCount",
      1,
    );
    return Number(newCount);
  }

  async deleteExpired(_now: Date): Promise<number> {
    return 0;
  }
}
