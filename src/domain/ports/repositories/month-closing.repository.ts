import type { MonthClosingEntity } from "@/domain/entities/month-closing.entity";

export interface MonthClosingRepositoryPort {
  upsert(closing: MonthClosingEntity): Promise<void>;
  listForUser(userId: string): Promise<MonthClosingEntity[]>;
  latest(userId: string): Promise<MonthClosingEntity | null>;
}
