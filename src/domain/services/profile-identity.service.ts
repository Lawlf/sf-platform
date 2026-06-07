export type SupporterTier = "free" | "pro_month" | "pro_year" | "founder";
export type BillingInterval = "month" | "year" | "lifetime";

export function resolveSupporterTier(input: {
  isPro: boolean;
  billingInterval: BillingInterval | null;
}): SupporterTier {
  if (!input.isPro) return "free";
  if (input.billingInterval === "lifetime") return "founder";
  if (input.billingInterval === "year") return "pro_year";
  return "pro_month";
}

export interface Flair {
  key: string;
  label: string;
  iconName: string;
  description: string;
}

export const FLAIR_CATALOG: readonly Flair[] = [
  { key: "cauteloso", label: "Cauteloso", iconName: "Anchor", description: "Prioriza segurança e previsibilidade. Evita sustos com o dinheiro." },
  { key: "equilibrado", label: "Equilibrado", iconName: "Scale", description: "Equilibra segurança e crescimento. Aceita risco calculado." },
  { key: "ousado", label: "Ousado", iconName: "Rocket", description: "Busca crescimento e topa mais risco e oscilação." },
];

const FLAIR_BY_KEY = new Map(FLAIR_CATALOG.map((f) => [f.key, f]));

export function flairFor(key: string | null): Flair | null {
  if (!key) return null;
  return FLAIR_BY_KEY.get(key) ?? null;
}

export interface ProfileBadge {
  id: string;
  kind: "supporter" | "founder" | "staff" | "flair" | "consistency";
  label: string;
  iconName: string;
  description: string;
  howTo: string | null;
  tier?: SupporterTier;
  publicSafe: boolean;
}

export interface BuildBadgesInput {
  supporterTier: SupporterTier;
  isAdmin: boolean;
  flair: string | null;
  consistencyTier: string;
}

const MAX_BADGES = 5;

export function buildProfileBadges(input: BuildBadgesInput): ProfileBadge[] {
  const out: ProfileBadge[] = [];

  if (input.isAdmin) {
    out.push({ id: "staff", kind: "staff", label: "Equipe", iconName: "Shield", description: "Time do Sabor Financeiro.", howTo: null, publicSafe: true });
  }
  if (input.supporterTier === "founder") {
    out.push({ id: "founder", kind: "founder", label: "Fundador", iconName: "Crown", description: "Um dos 10 primeiros a apoiar com o plano vitalício.", howTo: "Plano vitalício (10 vagas).", tier: "founder", publicSafe: true });
  } else if (input.supporterTier === "pro_month" || input.supporterTier === "pro_year") {
    const label = input.supporterTier === "pro_year" ? "Pro Anual" : "Pro";
    out.push({ id: "supporter", kind: "supporter", label, iconName: "Sparkles", description: "Apoiador do Sabor.", howTo: "Assine o Pro.", tier: input.supporterTier, publicSafe: true });
  }

  const flair = flairFor(input.flair);
  if (flair) {
    out.push({ id: `flair:${flair.key}`, kind: "flair", label: flair.label, iconName: flair.iconName, description: flair.description, howTo: "Você definiu no seu perfil.", publicSafe: true });
  }

  if (input.consistencyTier !== "Começo") {
    out.push({ id: "consistency", kind: "consistency", label: input.consistencyTier, iconName: "Activity", description: "Seu patamar de consistência mensal.", howTo: "Acompanhe suas finanças mês a mês.", publicSafe: true });
  }

  return out.slice(0, MAX_BADGES);
}

export const RESERVED_USERNAMES: readonly string[] = ["admin", "sabor", "suporte", "root", "equipe", "user"];

const USERNAME_MAX = 15;

export function generateUsernameBase(source: string): string {
  const slug = source
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/\s+/g, "_")
    .replace(/[^a-z0-9_]/g, "")
    .replace(/^_+|_+$/g, "")
    .replace(/_+/g, "_")
    .split("_")
    .map((part) => part.slice(0, USERNAME_MAX))
    .join("_");
  if (slug.length === 0 || RESERVED_USERNAMES.includes(slug)) return "user";
  return slug;
}
