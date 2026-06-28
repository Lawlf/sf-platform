import type { UserEntity } from "@/domain/entities/user.entity";

export interface UserRepositoryPort {
  findById(id: string): Promise<UserEntity | null>;
  findByUsername(username: string): Promise<UserEntity | null>;
  findByEmail(email: string): Promise<UserEntity | null>;
  create(input: {
    email: string;
    emailVerified: boolean;
    displayName?: string | null;
  }): Promise<UserEntity>;
  markEmailVerified(id: string): Promise<void>;
  markOnboardingWizardSeen(id: string): Promise<void>;
  markHomeTourDismissed(id: string): Promise<void>;
  deactivate(id: string, reason: string | null): Promise<void>;
  delete(id: string): Promise<void>;
  update(user: UserEntity): Promise<void>;
  /**
   * Retorna todos os usuários ativos com `isPro = true`. Usado pelo cron
   * de refresh diário de cotações (apenas usuários Pro disparam o batch).
   */
  findAllPro(): Promise<UserEntity[]>;
  /**
   * Retorna todos os usuários ativos (não desativados), Free e Pro. Usado
   * pelos crons de email de ciclo de vida.
   */
  findAllActive(): Promise<UserEntity[]>;
}
