import type { SessionEntity } from "@/domain/entities/session.entity";
import type { UserEntity } from "@/domain/entities/user.entity";

export interface SessionWithUser {
  session: SessionEntity;
  user: UserEntity;
}

export interface SessionRepository {
  findByIdHash(idHash: string): Promise<SessionEntity | null>;
  findWithUserByIdHash(idHash: string): Promise<SessionWithUser | null>;
  listActiveForUser(userId: string): Promise<SessionEntity[]>;
  create(input: {
    idHash: string;
    userId: string;
    expiresAt: Date;
    ip: string | null;
    userAgent: string | null;
  }): Promise<SessionEntity>;
  touch(idHash: string, newExpiresAt: Date, now: Date): Promise<void>;
  delete(idHash: string): Promise<void>;
  deleteAllForUser(userId: string): Promise<void>;
}
