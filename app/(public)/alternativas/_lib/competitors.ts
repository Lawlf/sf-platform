export interface ComparisonRow {
  dimension: string;
  them: string;
  us: string;
}

export interface CompetitorFaq {
  q: string;
  a: string;
}

export interface Competitor {
  slug: string;
  competitorName: string;
  seoTitle: string;
  seoDescription: string;
  h1: string;
  answerBlock: string;
  comparison: ComparisonRow[];
  whenCompetitor: string[];
  whenUs: string[];
  howToStart: string[];
  faq: CompetitorFaq[];
}

export const COMPETITORS: ReadonlyArray<Competitor> = [
  {
    slug: "mobills",
    competitorName: "Mobills",
    seoTitle: "Alternativa ao Mobills: controle financeiro sem anotar cada gasto",
    seoDescription:
      "Cansou de registrar transação por transação no Mobills? Veja o Sabor Financeiro: você acompanha o que tem, o que deve e quanto ganha no mês, sem anotar cada gasto.",
    h1: "Uma alternativa ao Mobills sem anotar cada gasto",
    answerBlock:
      "O Mobills funciona registrando cada transação: você lança gasto por gasto e categoriza tudo. O Sabor Financeiro vai por outro caminho. Você atualiza poucos números uma vez por mês e enxerga o que tem, o que deve e quanto entra. Menos trabalho no dia a dia, foco no que muda de verdade.",
    comparison: [
      { dimension: "O que você faz", them: "Lança cada gasto e categoriza", us: "Atualiza poucos números uma vez por mês" },
      { dimension: "O que você acompanha", them: "Detalhe de cada transação", us: "O que você tem, o que deve e quanto ganha no mês" },
      { dimension: "Esforço no dia a dia", them: "Diário, exige constância", us: "Mensal, leva poucos minutos" },
      { dimension: "Clareza do cálculo", them: "Vários relatórios", us: "Cada conta mostra cada etapa" },
      { dimension: "Conexão com o banco", them: "Tem conexão automática", us: "Ainda não, você coloca os números na mão" },
      { dimension: "Para quem é", them: "Quem quer controlar cada centavo", us: "Quem quer o quadro do mês sem virar contador" },
    ],
    whenCompetitor: [
      "Você quer registrar e categorizar cada compra.",
      "Você gosta de relatório detalhado de transação.",
      "Você quer conexão automática com o banco hoje.",
    ],
    whenUs: [
      "Você cansa de anotar gasto e acaba largando.",
      "Você quer saber se está evoluindo no mês, não cada compra.",
      "Você quer poucos minutos por mês, não todo dia.",
    ],
    howToStart: [
      "Crie uma conta grátis.",
      "Coloque o que você tem, o que deve e sua renda do mês.",
      "Pronto: você vê seu quadro do mês. Volte uma vez por mês para atualizar.",
    ],
    faq: [
      { q: "Preciso anotar cada gasto?", a: "Não. Você atualiza poucos números uma vez por mês. A ideia é justamente fugir do registro diário." },
      { q: "Dá para usar saindo do Mobills?", a: "Dá. Você não precisa importar seu histórico. Começa com os números de hoje, leva poucos minutos." },
      { q: "É grátis?", a: "Tem um plano grátis. Há também planos pagos com mais recursos." },
      { q: "Conecta no banco?", a: "Ainda não conecta direto no banco. Por enquanto você coloca os números na mão, e é rápido porque é uma vez por mês." },
    ],
  },
];

const BY_SLUG: ReadonlyMap<string, Competitor> = new Map(COMPETITORS.map((c) => [c.slug, c]));

export function getCompetitor(slug: string): Competitor | undefined {
  return BY_SLUG.get(slug);
}

export function competitorSlugs(): string[] {
  return COMPETITORS.map((c) => c.slug);
}
