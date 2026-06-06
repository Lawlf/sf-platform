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
  /** Título da seção "quando o concorrente faz sentido". Default usa o nome. */
  whenCompetitorTitle?: string;
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
      "O Mobills te mostra cada transação, gasto por gasto. No Sabor Financeiro a transação é opção, não obrigação: o foco é o quadro do mês, o que você tem, o que deve e quanto ganha, e se isso está melhorando. Registre uma compra quando quiser; ela é só detalhe, o que importa é a trajetória, não cada cafezinho.",
    comparison: [
      { dimension: "O foco", them: "Cada transação, gasto a gasto", us: "O quadro do mês: tem, deve, ganha" },
      { dimension: "O que você acompanha", them: "Detalhe de cada transação", us: "Se sobrou mais e o patrimônio cresceu" },
      { dimension: "Esforço no dia a dia", them: "Diário, exige constância", us: "Mensal, leva poucos minutos" },
      { dimension: "Clareza do cálculo", them: "Vários relatórios", us: "Cada conta mostra cada etapa" },
      { dimension: "Conexão com o banco", them: "Tem conexão automática", us: "Ainda não, você coloca os números na mão" },
      { dimension: "Conversar com IA", them: "Não tem", us: "Sim: ChatGPT, Claude e qualquer app com MCP" },
      { dimension: "Para quem é", them: "Quem quer controlar cada centavo", us: "Quem quer o quadro do mês sem virar contador" },
    ],
    whenCompetitor: [
      "Você quer registrar e categorizar cada compra.",
      "Você gosta de relatório detalhado de transação.",
      "Você quer conexão automática com o banco hoje.",
    ],
    whenUs: [
      "Você quer lançar uma compra ou outra quando quiser, sem ser obrigado a registrar tudo.",
      "Você quer patrimônio, dívida e renda juntos, não só uma lista de gastos.",
      "Você quer poucos minutos por mês e ainda entender pra onde vai seu dinheiro.",
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
  {
    slug: "organizze",
    competitorName: "Organizze",
    seoTitle: "Alternativa ao Organizze: controle financeiro com plano grátis",
    seoDescription:
      "O Organizze acompanha cada transação e só funciona com assinatura. Veja o Sabor Financeiro: foco no quadro do mês (patrimônio, dívida, renda) e plano grátis de verdade.",
    h1: "Uma alternativa ao Organizze, com plano grátis",
    answerBlock:
      "O Organizze acompanha cada transação e só roda com assinatura, depois de um teste curto. No Sabor Financeiro a transação é opção, não obrigação: o foco é o quadro do mês, o que você tem, o que deve e quanto ganha, e se está melhorando. E tem plano grátis de verdade, não só um período de teste.",
    comparison: [
      { dimension: "O foco", them: "Cada transação, categorizada", us: "O quadro do mês: tem, deve, ganha" },
      { dimension: "Preço", them: "Só assinatura, após teste curto", us: "Plano grátis, e Pro opcional" },
      { dimension: "O que você acompanha", them: "Detalhe de cada transação", us: "Se sobrou mais e o patrimônio cresceu" },
      { dimension: "Esforço no dia a dia", them: "Diário, exige constância", us: "Mensal, poucos minutos" },
      { dimension: "Conexão com o banco", them: "Tem conexão automática", us: "Ainda não, você coloca os números na mão" },
      { dimension: "Conversar com IA", them: "Não tem", us: "Sim: ChatGPT, Claude e qualquer app com MCP" },
      { dimension: "Para quem é", them: "Quem quer controlar cada centavo", us: "Quem quer o quadro do mês sem virar contador" },
    ],
    whenCompetitor: [
      "Você quer registrar e categorizar cada transação.",
      "Você quer conexão automática com o banco hoje.",
      "Você não se importa de pagar assinatura pra isso.",
    ],
    whenUs: [
      "Você quer começar de graça, sem assinatura obrigatória.",
      "Você quer patrimônio, dívida e renda juntos, não só uma lista de gastos.",
      "Você quer poucos minutos por mês e ainda entender pra onde vai seu dinheiro.",
    ],
    howToStart: [
      "Crie uma conta grátis.",
      "Coloque o que você tem, o que deve e sua renda do mês.",
      "Pronto: você vê seu quadro do mês. Volte uma vez por mês para atualizar.",
    ],
    faq: [
      { q: "O Sabor é pago como o Organizze?", a: "Tem um plano grátis. Há também planos pagos com mais recursos, mas você não precisa assinar pra começar." },
      { q: "Preciso registrar cada transação?", a: "Não. Você atualiza poucos números uma vez por mês. Registrar uma compra é opção, não obrigação." },
      { q: "Dá para usar saindo do Organizze?", a: "Dá. Você não precisa importar seu histórico. Começa com os números de hoje, leva poucos minutos." },
      { q: "Conecta no banco?", a: "Ainda não conecta direto no banco. Por enquanto você coloca os números na mão, e é rápido porque é uma vez por mês." },
    ],
  },
  {
    slug: "planilha",
    competitorName: "Planilha",
    seoTitle: "Alternativa à planilha de controle financeiro",
    seoDescription:
      "Cansou da planilha que você esquece de preencher e a fórmula quebra? Veja o Sabor Financeiro: o quadro do mês (patrimônio, dívida, renda) sem manter planilha.",
    h1: "Uma alternativa à planilha de controle financeiro",
    answerBlock:
      "A planilha pede que você preencha tudo na mão, mês após mês, e ainda quebra fórmula quando você menos espera. O Sabor Financeiro vira a lente: o foco é o quadro do mês, o que você tem, o que deve e quanto ganha, e se está melhorando. Menos manutenção, e a conta não quebra.",
    comparison: [
      { dimension: "O foco", them: "Linhas e fórmulas", us: "O quadro do mês: tem, deve, ganha" },
      { dimension: "Manutenção", them: "Você mantém tudo na mão", us: "Poucos números, uma vez por mês" },
      { dimension: "Quando erra", them: "Fórmula quebra, some dado", us: "A conta é feita pra você" },
      { dimension: "Onde abre", them: "Um arquivo no computador", us: "No celular, sempre com você" },
      { dimension: "Conversar com IA", them: "Não tem", us: "Sim: ChatGPT, Claude e qualquer app com MCP" },
      { dimension: "Para quem é", them: "Quem gosta de montar a própria planilha", us: "Quem quer o quadro do mês sem manter planilha" },
    ],
    whenCompetitor: [
      "Você gosta de montar e controlar a própria planilha.",
      "Você quer liberdade total pra criar suas fórmulas.",
      "Você não quer depender de nenhum app.",
    ],
    whenUs: [
      "Você esquece de preencher a planilha e ela desatualiza.",
      "Você quer patrimônio, dívida e renda juntos, sem montar fórmula.",
      "Você quer abrir no celular e ver o mês em poucos minutos.",
    ],
    howToStart: [
      "Crie uma conta grátis.",
      "Coloque o que você tem, o que deve e sua renda do mês.",
      "Pronto: o quadro do mês sem planilha pra manter.",
    ],
    faq: [
      { q: "Preciso importar minha planilha?", a: "Não. Você começa com os números de hoje, leva poucos minutos. Não precisa migrar fórmula nenhuma." },
      { q: "É grátis?", a: "Tem um plano grátis. Há também planos pagos com mais recursos." },
      { q: "Funciona no celular?", a: "Sim. É um app web que abre no celular e no computador, sempre sincronizado." },
      { q: "E se eu gostar da minha planilha?", a: "Sem problema. A ideia é tirar a manutenção do seu colo, não te obrigar a largar o que funciona pra você." },
    ],
  },
  {
    slug: "minhas-economias",
    competitorName: "Minhas Economias",
    seoTitle: "Alternativa ao Minhas Economias: o quadro do mês, não cada gasto",
    seoDescription:
      "O Minhas Economias categoriza cada transação. Veja o Sabor Financeiro: foco no quadro do mês (patrimônio, dívida, renda), e conexão com a sua IA.",
    h1: "Uma alternativa ao Minhas Economias",
    answerBlock:
      "O Minhas Economias registra e categoriza cada transação, em gráficos e relatórios. O Sabor Financeiro vira a lente: o foco é o quadro do mês, o que você tem, o que deve e quanto ganha, e se está melhorando. A transação é detalhe, não o centro. E conecta na IA que você já usa.",
    comparison: [
      { dimension: "O foco", them: "Cada transação, categorizada", us: "O quadro do mês: tem, deve, ganha" },
      { dimension: "O que você acompanha", them: "Detalhe de cada transação", us: "Se sobrou mais e o patrimônio cresceu" },
      { dimension: "Esforço no dia a dia", them: "Diário, exige constância", us: "Mensal, poucos minutos" },
      { dimension: "Conexão com o banco", them: "Tem conexão automática", us: "Ainda não, você coloca os números na mão" },
      { dimension: "Conversar com IA", them: "Não tem", us: "Sim: ChatGPT, Claude e qualquer app com MCP" },
      { dimension: "Para quem é", them: "Quem quer controlar cada centavo", us: "Quem quer o quadro do mês sem virar contador" },
    ],
    whenCompetitor: [
      "Você quer registrar e categorizar cada transação.",
      "Você quer gráficos e relatórios detalhados de gastos.",
      "Você quer conexão automática com o banco hoje.",
    ],
    whenUs: [
      "Você quer ver o quadro do mês sem ser obrigado a lançar cada gasto.",
      "Você quer patrimônio, dívida e renda juntos, não só uma lista de gastos.",
      "Você quer poucos minutos por mês e ainda entender pra onde vai seu dinheiro.",
    ],
    howToStart: [
      "Crie uma conta grátis.",
      "Coloque o que você tem, o que deve e sua renda do mês.",
      "Pronto: você vê seu quadro do mês. Volte uma vez por mês para atualizar.",
    ],
    faq: [
      { q: "Preciso anotar cada gasto?", a: "Não. Você atualiza poucos números uma vez por mês. Registrar uma compra é opção, não obrigação." },
      { q: "Dá para usar saindo do Minhas Economias?", a: "Dá. Você não precisa importar seu histórico. Começa com os números de hoje, leva poucos minutos." },
      { q: "É grátis?", a: "Tem um plano grátis. Há também planos pagos com mais recursos." },
      { q: "Conecta no banco?", a: "Ainda não conecta direto no banco. Por enquanto você coloca os números na mão, e é rápido porque é uma vez por mês." },
    ],
  },
  {
    slug: "guiabolso",
    competitorName: "GuiaBolso",
    seoTitle: "O GuiaBolso acabou: uma alternativa pra organizar o dinheiro",
    seoDescription:
      "O GuiaBolso foi encerrado em 2022 e virou parte do PicPay. Veja o Sabor Financeiro: o quadro do mês (patrimônio, dívida, renda), plano grátis e conexão com a sua IA.",
    h1: "O GuiaBolso acabou. E agora?",
    answerBlock:
      "O GuiaBolso foi encerrado em novembro de 2022 e virou a seção Minhas Finanças do PicPay. Se você procura um lugar pra organizar o dinheiro, o Sabor Financeiro vai por outro caminho: o foco é o quadro do mês, o que você tem, o que deve e quanto ganha, e se está melhorando. E conecta na IA que você já usa.",
    comparison: [
      { dimension: "Ainda existe?", them: "Encerrado em 2022", us: "Ativo, e em evolução" },
      { dimension: "O foco", them: "Cada transação, gasto a gasto", us: "O quadro do mês: tem, deve, ganha" },
      { dimension: "Conversar com IA", them: "Não tem", us: "Sim: ChatGPT, Claude e qualquer app com MCP" },
      { dimension: "Plano grátis", them: "Era grátis", us: "Sim" },
      { dimension: "Para quem é", them: "Quem queria sincronizar o banco", us: "Quem quer o quadro do mês sem virar contador" },
    ],
    whenCompetitorTitle: "Sobre o GuiaBolso hoje",
    whenCompetitor: [
      "O app foi encerrado em novembro de 2022.",
      "As funções viraram a seção Minhas Finanças do PicPay.",
      "Quem usava precisou migrar pra outro lugar.",
    ],
    whenUs: [
      "Você quer um app ativo, que não vai sumir do nada.",
      "Você quer o quadro do mês, não uma lista de transações.",
      "Você quer poucos minutos por mês e ainda entender pra onde vai seu dinheiro.",
    ],
    howToStart: [
      "Crie uma conta grátis.",
      "Coloque o que você tem, o que deve e sua renda do mês.",
      "Pronto: você vê seu quadro do mês. Volte uma vez por mês para atualizar.",
    ],
    faq: [
      { q: "O GuiaBolso ainda funciona?", a: "Não. O app foi encerrado em novembro de 2022 e as funções foram integradas ao PicPay, na seção Minhas Finanças." },
      { q: "Por que mudar pro Sabor?", a: "O Sabor é ativo e vai por outro caminho: foco no quadro do mês (patrimônio, dívida, renda), com plano grátis e conexão com a sua IA." },
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
