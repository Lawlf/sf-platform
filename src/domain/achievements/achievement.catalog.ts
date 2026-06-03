export type AchievementDetection = "event" | "sustained" | "tenure";

export interface AchievementDef {
  slug: string;
  title: string;
  description: string;
  iconName: string;
  detection: AchievementDetection;
}

export const ACHIEVEMENTS: readonly AchievementDef[] = [
  {
    slug: "primeiro-passo",
    title: "Primeiro passo",
    description: "Cadastrou sua primeira dívida.",
    iconName: "Sparkles",
    detection: "event",
  },
  {
    slug: "mapa-do-tesouro",
    title: "Mapa do tesouro",
    description: "Cadastrou seu primeiro ativo.",
    iconName: "Map",
    detection: "event",
  },
  {
    slug: "renda-a-vista",
    title: "Renda à vista",
    description: "Registrou sua primeira renda.",
    iconName: "Wallet",
    detection: "event",
  },
  {
    slug: "norte-definido",
    title: "Norte definido",
    description: "Criou sua primeira meta.",
    iconName: "Target",
    detection: "event",
  },
  {
    slug: "simulou-futuro",
    title: "Simulou o futuro",
    description: "Rodou seu primeiro simulador.",
    iconName: "LineChart",
    detection: "event",
  },
  {
    slug: "quitacao",
    title: "Dívida quitada",
    description: "Quitou uma dívida por completo.",
    iconName: "CircleCheckBig",
    detection: "event",
  },
  {
    slug: "saude-verde-3m",
    title: "Saúde verde",
    description: "Manteve a renda comprometida abaixo de 30% por 3 meses.",
    iconName: "HeartPulse",
    detection: "sustained",
  },
  {
    slug: "patrimonio-positivo-3m",
    title: "Patrimônio positivo",
    description: "Manteve o patrimônio líquido positivo por 3 meses.",
    iconName: "TrendingUp",
    detection: "sustained",
  },
  {
    slug: "check-in-3m",
    title: "No ritmo",
    description: "Usou o Sabor Financeiro em 3 meses seguidos.",
    iconName: "CalendarCheck",
    detection: "tenure",
  },
  {
    slug: "check-in-6m",
    title: "Disciplina",
    description: "Acompanhou suas finanças em 6 meses seguidos.",
    iconName: "CalendarHeart",
    detection: "tenure",
  },
  {
    slug: "jornada-12m",
    title: "Um ano de jornada",
    description: "Acompanha suas finanças há 12 meses.",
    iconName: "Award",
    detection: "tenure",
  },
  {
    slug: "jornada-24m",
    title: "Dois anos de jornada",
    description: "Dois anos acompanhando suas finanças.",
    iconName: "Medal",
    detection: "tenure",
  },
  {
    slug: "jornada-60m",
    title: "Lenda",
    description: "Cinco anos de jornada financeira.",
    iconName: "Trophy",
    detection: "tenure",
  },
];

const BY_SLUG = new Map(ACHIEVEMENTS.map((a) => [a.slug, a]));

export function getAchievement(slug: string): AchievementDef | undefined {
  return BY_SLUG.get(slug);
}

export function achievementsByDetection(detection: AchievementDetection): AchievementDef[] {
  return ACHIEVEMENTS.filter((a) => a.detection === detection);
}
