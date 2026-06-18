import type { ProfileEntity, ProfileType } from "@/domain/entities/profile.entity";

export interface ProfileRepositoryPort {
  listForUser(userId: string): Promise<ProfileEntity[]>;
  findById(id: string): Promise<ProfileEntity | null>;
  findPrimaryPf(userId: string): Promise<ProfileEntity | null>;
  ensurePfProfile(userId: string, now: Date): Promise<ProfileEntity>;
  create(input: {
    userId: string;
    type: ProfileType;
    linkedProfileId: string | null;
    displayName: string | null;
    isPrimary: boolean;
    now: Date;
  }): Promise<ProfileEntity>;
  setLinkedProfile(profileId: string, linkedProfileId: string): Promise<void>;
}
