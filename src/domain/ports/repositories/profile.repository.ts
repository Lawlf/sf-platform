import type { ProfileEntity, ProfileType } from "@/domain/entities/profile.entity";

export interface ProfileRepositoryPort {
  listForUser(userId: string): Promise<ProfileEntity[]>;
  findById(id: string): Promise<ProfileEntity | null>;
  /**
   * Garante o perfil PF do usuário. Idempotente e seguro em corrida: usa
   * upsert com `onConflictDoNothing` sobre o índice único (user_id, type),
   * então retorna o perfil PF (recém-criado ou pré-existente).
   */
  ensurePfProfile(userId: string, now: Date): Promise<ProfileEntity>;
  create(input: {
    userId: string;
    type: ProfileType;
    linkedProfileId: string | null;
    displayName: string | null;
    now: Date;
  }): Promise<ProfileEntity>;
  setLinkedProfile(profileId: string, linkedProfileId: string): Promise<void>;
}
