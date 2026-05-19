import type { UserEntity } from "@/domain/entities/user.entity";

export interface UserRepository {
  findById(id: string): Promise<UserEntity | null>;
  findByEmail(email: string): Promise<UserEntity | null>;
  create(input: {
    email: string;
    emailVerified: boolean;
    displayName?: string | null;
  }): Promise<UserEntity>;
  markEmailVerified(id: string): Promise<void>;
  deactivate(id: string, reason: string | null): Promise<void>;
}
