export interface UserAvatarRepositoryPort {
  get(userId: string): Promise<string | null>;
  upsert(userId: string, dataUrl: string): Promise<void>;
  delete(userId: string): Promise<void>;
}
