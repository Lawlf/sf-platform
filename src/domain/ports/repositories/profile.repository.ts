import type { ConservativeLevel, ProfileEntity, ProfileTaxClassification, ProfileType } from "@/domain/entities/profile.entity";

export interface ProfileRepositoryPort {
  listForUser(userId: string): Promise<ProfileEntity[]>;
  findById(id: string): Promise<ProfileEntity | null>;
  findPrimaryPf(userId: string): Promise<ProfileEntity | null>;
  findByLinkedProfileId(linkedProfileId: string): Promise<ProfileEntity | null>;
  ensurePfProfile(userId: string, now: Date): Promise<ProfileEntity>;
  create(input: {
    userId: string;
    type: ProfileType;
    linkedProfileId: string | null;
    displayName: string | null;
    isPrimary: boolean;
    taxClassification: ProfileTaxClassification | null;
    now: Date;
  }): Promise<ProfileEntity>;
  rename(profileId: string, displayName: string): Promise<void>;
  delete(profileId: string): Promise<void>;
  setLinkedProfile(profileId: string, linkedProfileId: string | null): Promise<void>;
  markChecklistItemDismissed(profileId: string, item: "debt" | "goal"): Promise<void>;
  setConservativeLevel(profileId: string, level: ConservativeLevel): Promise<void>;
}
