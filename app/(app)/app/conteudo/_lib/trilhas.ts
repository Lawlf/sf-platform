export type TrilhaSlug = "sair-do-vermelho" | "sobrar-e-fazer-render" | "compor-patrimonio";

export type ModuleStatus = "ready" | "building" | "queued";

export interface ModuleSpec {
  num: number;
  title: string;
  subtitle: string;
  status: ModuleStatus;
}

export interface BookSpec {
  title: string;
  author: string;
  publisher: string;
  why: string;
  amazonUrl?: string;
}

export interface TrilhaSpec {
  slug: TrilhaSlug;
  title: string;
  emphasis: string;
  shortDescription: string;
  modules: readonly ModuleSpec[];
  books: readonly BookSpec[];
}

export const TRILHAS: readonly TrilhaSpec[] = [
  {
    slug: "sair-do-vermelho",
    title: "Sair do vermelho",
    emphasis: "vermelho",
    shortDescription:
      "Começa pelo tamanho real da dívida, qual quitar antes e o que tem valor que você esqueceu de contar.",
    modules: [
      {
        num: 1,
        title: "Quanto você realmente paga",
        subtitle: "CET ponderado",
        status: "building",
      },
      {
        num: 2,
        title: "Qual dívida quitar antes",
        subtitle: "Priorização",
        status: "queued",
      },
      {
        num: 3,
        title: "O que tem valor que você esqueceu",
        subtitle: "Patrimônio invisível",
        status: "queued",
      },
    ],
    books: [
      {
        title: "Casais Inteligentes Enriquecem Juntos",
        author: "Gustavo Cerbasi",
        publisher: "Sextante",
        why: "Brasileiro, didático, foca em organizar dívida e renda do casal antes de pensar em investir. Combina com a primeira saída do vermelho.",
      },
    ],
  },
  {
    slug: "sobrar-e-fazer-render",
    title: "Sobrar e fazer render",
    emphasis: "render",
    shortDescription:
      "Reserva, Tesouro Selic, CDB. Base sólida antes de arriscar mais.",
    modules: [
      {
        num: 1,
        title: "Reserva de emergência sem mito",
        subtitle: "Quanto, onde, quando",
        status: "queued",
      },
      {
        num: 2,
        title: "Renda fixa pro brasileiro real",
        subtitle: "CDB, Tesouro, LCI/LCA",
        status: "queued",
      },
      {
        num: 3,
        title: "Patrimônio que cresce vs patrimônio que pesa",
        subtitle: "Financiamento imóvel",
        status: "queued",
      },
    ],
    books: [],
  },
  {
    slug: "compor-patrimonio",
    title: "Compor patrimônio",
    emphasis: "patrimônio",
    shortDescription:
      "Ações, FIIs, cripto e tributação. Com método, sem chute de timing.",
    modules: [
      {
        num: 1,
        title: "Ações B3 sem timing",
        subtitle: "Buy & hold, dividendos",
        status: "queued",
      },
      {
        num: 2,
        title: "FIIs sem virar trader",
        subtitle: "Aluguel e ganho",
        status: "queued",
      },
      {
        num: 3,
        title: "Otimização tributária PF",
        subtitle: "Declaração, isenção 35k, GCAP",
        status: "queued",
      },
    ],
    books: [],
  },
] as const;

export function findTrilha(slug: TrilhaSlug): TrilhaSpec {
  const found = TRILHAS.find((t) => t.slug === slug);
  if (!found) throw new Error(`Trilha not found: ${slug}`);
  return found;
}
