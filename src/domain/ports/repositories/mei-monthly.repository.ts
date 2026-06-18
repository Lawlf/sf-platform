import type { MeiMonthlyEntity } from "@/domain/entities/mei-monthly.entity";

export interface MeiMonthlyRepositoryPort {
  upsert(entity: MeiMonthlyEntity): Promise<MeiMonthlyEntity>;
  findByProfileCompetencia(profileId: string, competencia: Date): Promise<MeiMonthlyEntity | null>;
  listForProfile(profileId: string): Promise<MeiMonthlyEntity[]>;
}
