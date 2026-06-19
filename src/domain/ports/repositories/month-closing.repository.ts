import type { MonthClosingEntity } from "@/domain/entities/month-closing.entity";

export interface MonthClosingRepositoryPort {
  upsert(closing: MonthClosingEntity): Promise<void>;
  listForProfile(profileId: string): Promise<MonthClosingEntity[]>;
  latest(profileId: string): Promise<MonthClosingEntity | null>;
}
