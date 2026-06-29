import type { ProfileType } from "@/domain/entities/profile.entity";

// Forma mínima compartilhada entre ProfileEntity (server) e SerializedProfile (UI).
export interface ProfileLike {
  id: string;
  isPrimary: boolean;
  type: ProfileType;
}

export interface ProfileAccessState {
  isPro: boolean;
  proGraceUntil: Date | null;
  freeKeptProfileId: string | null;
  now: Date;
}

// Durante a graça (7 dias pós-downgrade) todos os perfis seguem acessíveis.
export function isInGrace(state: { proGraceUntil: Date | null; now: Date }): boolean {
  return state.proGraceUntil !== null && state.now.getTime() < state.proGraceUntil.getTime();
}

// O único perfil que um Free mantém: a escolha dele se ainda existir, senão o
// primary, senão o primeiro PF, senão o primeiro da lista.
export function keptProfileId(
  profiles: ProfileLike[],
  freeKeptProfileId: string | null,
): string | null {
  if (freeKeptProfileId && profiles.some((p) => p.id === freeKeptProfileId)) {
    return freeKeptProfileId;
  }
  const primary = profiles.find((p) => p.isPrimary);
  if (primary) return primary.id;
  const pf = profiles.find((p) => p.type === "PF");
  if (pf) return pf.id;
  return profiles[0]?.id ?? null;
}

export function isProfileAccessible(
  profileId: string,
  profiles: ProfileLike[],
  state: ProfileAccessState,
): boolean {
  if (state.isPro) return true;
  if (isInGrace(state)) return true;
  return profileId === keptProfileId(profiles, state.freeKeptProfileId);
}

// Verdadeiro quando há perfil trancado pra mostrar (Free, fora da graça, com mais de
// um perfil). Usado pra decidir banner/avisos sem recalcular acessibilidade por item.
export function hasLockedProfiles(profiles: ProfileLike[], state: ProfileAccessState): boolean {
  if (state.isPro) return false;
  if (isInGrace(state)) return false;
  return profiles.length > 1;
}
