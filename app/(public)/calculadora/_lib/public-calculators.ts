/**
 * Registry das calculadoras públicas (fora do login). Cada entrada expõe um dos
 * simuladores internos como página indexável com copy própria de SEO. O cálculo
 * em si reusa o engine puro de `src/domain/services`; aqui mora só a metadata de
 * descoberta (slug público, copy, FAQ) e o vínculo com o simulador interno via
 * `simId` (ver `SIMULATORS` em app/(app)/app/simular/_lib/simulators.ts).
 */
export interface PublicCalculatorFaq {
  q: string;
  a: string;
}

export interface PublicCalculator {
  /** Slug público, rico em palavra-chave (pode diferir do nome da rota interna). */
  slug: string;
  /** Id do simulador interno correspondente, em `SIMULATORS`. */
  simId: string;
  /** Title da aba/SERP. O template do layout já anexa " · Sabor Financeiro". */
  seoTitle: string;
  /** Meta description. */
  seoDescription: string;
  /** H1 visível da página. */
  h1: string;
  /** Parágrafo de abertura, indexável, que explica a calculadora. */
  intro: string;
  /** Resumo curto para o cartão "como funciona". */
  howItWorks: string;
  /** Perguntas frequentes (alimentam o bloco visível e o schema FAQPage). */
  faq: PublicCalculatorFaq[];
}

export const PUBLIC_CALCULATORS: ReadonlyArray<PublicCalculator> = [
  {
    slug: "salario-liquido-clt",
    simId: "salario-clt",
    seoTitle: "Calculadora de salário líquido CLT 2026",
    seoDescription:
      "Calcule o salário líquido CLT depois do INSS e do Imposto de Renda. Veja cada desconto passo a passo, com dependentes e outros descontos.",
    h1: "Calculadora de salário líquido CLT",
    intro:
      "Informe o salário bruto e veja quanto cai na conta depois do INSS (progressivo, por faixa) e do Imposto de Renda. A calculadora mostra cada desconto separado, considera dependentes e usa automaticamente o cálculo que deixa você pagar menos imposto.",
    howItWorks:
      "A gente desconta o INSS por faixa e o Imposto de Renda do seu salário bruto e mostra cada etapa, pra você entender de onde sai cada centavo.",
    faq: [
      {
        q: "Como é calculado o salário líquido CLT?",
        a: "Do salário bruto descontamos o INSS, calculado de forma progressiva por faixa, e em seguida o Imposto de Renda sobre a base já reduzida pelo INSS e pelos dependentes. O que sobra é o líquido.",
      },
      {
        q: "Dependentes mudam o salário líquido?",
        a: "Sim. Cada dependente reduz a base de cálculo do Imposto de Renda quando o modelo de deduções legais é mais vantajoso, o que pode aumentar o líquido.",
      },
      {
        q: "Outros descontos entram na conta?",
        a: "Descontos como vale-transporte ou plano de saúde reduzem o valor que cai na conta, mas não alteram o Imposto de Renda. A calculadora separa esses descontos do cálculo do imposto.",
      },
    ],
  },
  {
    slug: "independencia-financeira",
    simId: "independencia",
    seoTitle: "Calculadora de independência financeira (FIRE)",
    seoDescription:
      "Descubra quando seu patrimônio passa a pagar suas contas. Simule a independência financeira a partir do que você tem, do quanto sobra por mês e do seu custo de vida.",
    h1: "Calculadora de independência financeira",
    intro:
      "Informe seu patrimônio atual, o quanto sobra por mês e seu custo de vida mensal para projetar em quanto tempo a renda do patrimônio cobre suas contas. Ajuste os números para o seu caso.",
    howItWorks:
      "A gente parte do seu patrimônio, do quanto sobra por mês e do seu custo de vida pra projetar quando você fica livre. Ajuste os números à vontade.",
    faq: [
      {
        q: "O que é independência financeira?",
        a: "É o ponto em que a renda gerada pelo seu patrimônio cobre o seu custo de vida, sem depender do trabalho. A partir daí, trabalhar vira escolha.",
      },
      {
        q: "Como o cálculo estima quando chego lá?",
        a: "A calculadora projeta o crescimento do seu patrimônio a partir do que você já tem e do quanto aporta por mês, e compara a renda que ele geraria com o seu custo de vida mensal.",
      },
      {
        q: "Quanto preciso para viver de renda?",
        a: "Depende do seu custo de vida mensal e da renda que o patrimônio gera. Quanto maior o gasto, maior o patrimônio necessário. A calculadora estima esse ponto a partir dos seus números.",
      },
    ],
  },
  {
    slug: "meta-de-investimento",
    simId: "meta-investimento",
    seoTitle: "Calculadora de meta de investimento",
    seoDescription:
      "Calcule quanto aportar por mês para chegar a uma meta financeira no prazo que você definir, considerando o que já tem investido e o rendimento no período.",
    h1: "Calculadora de meta de investimento",
    intro:
      "Diga o valor da meta, o prazo e quanto já tem investido. A calculadora mostra o aporte mensal necessário para chegar lá, considerando o rendimento no período.",
    howItWorks:
      "Diga a meta, o prazo e o quanto já tem investido. A gente calcula o aporte mensal necessário pra chegar lá.",
    faq: [
      {
        q: "Como sei quanto preciso guardar por mês?",
        a: "Informe a meta, o prazo e o valor já investido. A calculadora resolve o aporte mensal que, rendendo no período, leva você ao objetivo.",
      },
      {
        q: "O rendimento entra na conta?",
        a: "Sim. O cálculo considera que os aportes rendem ao longo do prazo, então o aporte necessário costuma ser menor do que dividir a meta pelo número de meses.",
      },
      {
        q: "Para que serve a calculadora de meta?",
        a: "Para sair do achismo: em vez de guardar o que sobra, você descobre o aporte mensal exato que leva a um objetivo (entrada de imóvel, viagem, carro) dentro do prazo que escolher.",
      },
    ],
  },
  {
    slug: "juros-compostos",
    simId: "juros-compostos",
    seoTitle: "Calculadora de juros compostos",
    seoDescription:
      "Simule juros compostos com aporte mensal. Veja quanto seu dinheiro vira ao longo do tempo, separando o que é aporte e o que é juro sobre juro.",
    h1: "Calculadora de juros compostos",
    intro:
      "Informe o valor inicial, o aporte mensal, a taxa e o prazo para projetar a evolução do patrimônio mês a mês e ver quanto vira juro sobre juro.",
    howItWorks:
      "A gente projeta seu patrimônio compondo mês a mês a partir do que você já tem e do quanto aporta. Veja quanto vira juro sobre juro.",
    faq: [
      {
        q: "O que são juros compostos?",
        a: "É quando o rendimento de cada período passa a render também no período seguinte. Com o tempo, o juro sobre juro cresce mais rápido que o aporte.",
      },
      {
        q: "Posso simular com aporte mensal?",
        a: "Sim. A calculadora soma o valor inicial e os aportes mensais e compõe tudo pela taxa informada.",
      },
    ],
  },
  {
    slug: "onde-rende-mais",
    simId: "onde-rende-mais",
    seoTitle: "Poupança, CDB ou Tesouro: onde rende mais?",
    seoDescription:
      "Compare o rendimento líquido de poupança, CDB e Tesouro Selic, já descontado o Imposto de Renda, e veja qual rende mais para o seu dinheiro.",
    h1: "Onde seu dinheiro rende mais?",
    intro:
      "Informe o valor e o prazo para comparar o rendimento líquido (depois do Imposto de Renda) de poupança, CDB e Tesouro Selic, lado a lado.",
    howItWorks:
      "A gente projeta o rendimento líquido (depois do Imposto de Renda) de cada aplicação e mostra lado a lado quem ganha.",
    faq: [
      {
        q: "Por que comparar pelo rendimento líquido?",
        a: "Porque alguns investimentos pagam Imposto de Renda e a poupança não. Comparar pelo bruto engana; o que importa é o que sobra depois do imposto.",
      },
      {
        q: "A poupança sempre rende menos?",
        a: "Nem sempre, mas costuma. A calculadora mostra o líquido de cada opção para o seu valor e prazo, sem chute.",
      },
      {
        q: "CDB rende mais que poupança?",
        a: "Costuma render, mesmo pagando Imposto de Renda, porque a taxa do CDB tende a superar a da poupança. Mas depende do percentual do CDI e do prazo. A calculadora compara o líquido de cada um para o seu caso.",
      },
    ],
  },
  {
    slug: "reserva-de-emergencia",
    simId: "reserva",
    seoTitle: "Calculadora de reserva de emergência",
    seoDescription:
      "Descubra quantos meses sua reserva de emergência cobre se a renda parar, a partir do seu custo fixo mensal, e quanto ainda falta para a meta.",
    h1: "Calculadora de reserva de emergência",
    intro:
      "Informe seu custo fixo mensal e o quanto já tem reservado para ver quantos meses está coberto e quanto falta para a meta.",
    howItWorks:
      "A gente parte do seu custo fixo mensal e das suas reservas pra mostrar quantos meses você está coberto e quanto falta pra meta.",
    faq: [
      {
        q: "Quantos meses de reserva preciso ter?",
        a: "Depende da estabilidade da sua renda. CLT costuma mirar de 3 a 6 meses de custo fixo; renda variável ou PJ, mais. A calculadora mostra onde você está hoje.",
      },
      {
        q: "A reserva conta o custo total ou só o fixo?",
        a: "O custo fixo mensal, que é o que você precisa cobrir se a renda parar. A calculadora parte desse valor.",
      },
      {
        q: "Onde deixar a reserva de emergência?",
        a: "O ideal é um lugar de resgate rápido e baixo risco, como Tesouro Selic ou um CDB de liquidez diária. Esta calculadora não escolhe o investimento; ela mostra quanto você precisa juntar e quantos meses já cobre.",
      },
    ],
  },
  {
    slug: "financiamento-price-ou-sac",
    simId: "financiamento",
    seoTitle: "Simulador de financiamento: Price ou SAC",
    seoDescription:
      "Compare o mesmo financiamento nos sistemas Price e SAC. Veja a primeira parcela, a evolução e o total de juros antes de assinar.",
    h1: "Simulador de financiamento: Price ou SAC",
    intro:
      "Informe o valor, a taxa e o prazo para simular o mesmo financiamento nos dois sistemas, lado a lado: parcela fixa (Price) ou decrescente (SAC). Compare a primeira parcela e o total de juros.",
    howItWorks:
      "A gente simula o mesmo financiamento nos dois sistemas lado a lado: parcela fixa (Price) ou decrescente (SAC). Compare a primeira parcela e o total de juros.",
    faq: [
      {
        q: "Qual a diferença entre Price e SAC?",
        a: "No Price a parcela é fixa do começo ao fim. No SAC a parcela começa mais alta e cai com o tempo, e o total de juros costuma ser menor.",
      },
      {
        q: "Em qual sistema pago menos juros?",
        a: "Em geral no SAC, porque você amortiza mais cedo. A calculadora mostra o total de juros de cada um para o seu caso.",
      },
    ],
  },
  {
    slug: "custo-do-rotativo-do-cartao",
    simId: "rotativo",
    seoTitle: "Calculadora do rotativo do cartão de crédito",
    seoDescription:
      "Calcule o custo do rotativo do cartão de crédito. Veja quanto de juro você paga a mais ao rolar a fatura, em quantos meses quita e quanto a dívida vira.",
    h1: "Calculadora do rotativo do cartão de crédito",
    intro:
      "Informe o valor da fatura, quanto você consegue pagar por mês e a taxa do rotativo (15% ao mês quando você não sabe) para ver quanto de juro entra a cada mês, em quantos meses a dívida quita e quanto a fatura vira no total. Se o pagamento não cobrir nem o juro do mês, a calculadora avisa: assim a dívida nunca quita.",
    howItWorks:
      "A gente cobra o juro do rotativo sobre o que sobra da fatura mês a mês e mostra quanto você paga a mais, em quantos meses quita e quando o pagamento é baixo demais pra dívida diminuir.",
    faq: [
      {
        q: "O que é o rotativo do cartão de crédito?",
        a: "É o crédito que o banco te dá quando você não paga a fatura inteira. O que sobra é rolado pro mês seguinte e passa a cobrar juro, um dos mais altos do mercado.",
      },
      {
        q: "Pagar só o mínimo do cartão sai caro?",
        a: "Sim. O que você não paga entra no rotativo e cobra juro todo mês. Se o pagamento não cobrir nem o juro, o saldo cresce em vez de cair, e a fatura nunca fecha.",
      },
      {
        q: "Quanto é o juro do rotativo no Brasil?",
        a: "É um dos juros mais altos do mercado, costuma ficar na faixa de 13% a 15% ao mês. Use a taxa do seu extrato; quando você não sabe, a calculadora parte de 15% ao mês.",
      },
    ],
  },
  {
    slug: "decimo-terceiro-salario",
    simId: "decimo-terceiro",
    seoTitle: "Calculadora de 13º salário líquido 2026",
    seoDescription:
      "Calcule o 13º salário líquido depois do INSS e do Imposto de Renda, parcela por parcela, e veja quanto cai da primeira e da segunda.",
    h1: "Calculadora de 13º salário líquido",
    intro:
      "Informe o salário bruto para ver quanto cai do 13º depois do INSS e do Imposto de Renda. O 13º é tributado separado do salário do mês; a calculadora mostra cada parcela.",
    howItWorks:
      "O 13º é tributado separado do salário do mês. A gente desconta INSS e IR sobre ele e mostra quanto cai em cada uma das duas parcelas.",
    faq: [
      {
        q: "O 13º tem desconto de INSS e IR?",
        a: "Sim. O 13º é tributado separado do salário mensal, com INSS e Imposto de Renda próprios. A calculadora aplica os dois.",
      },
      {
        q: "A primeira parcela tem desconto?",
        a: "A primeira parcela costuma sair sem descontos; eles incidem na segunda. A calculadora mostra o líquido considerando isso.",
      },
      {
        q: "Quando o 13º é pago?",
        a: "A primeira parcela costuma ser paga até 30 de novembro e a segunda até 20 de dezembro. A calculadora mostra o líquido de cada uma.",
      },
    ],
  },
  {
    slug: "ferias-liquidas",
    simId: "ferias",
    seoTitle: "Calculadora de férias líquidas 2026",
    seoDescription:
      "Calcule o valor líquido das férias com o terço constitucional (1/3), já descontados INSS e Imposto de Renda, a partir do salário bruto.",
    h1: "Calculadora de férias líquidas",
    intro:
      "Informe o salário bruto para calcular o valor das férias somado ao terço constitucional (1/3), já descontados INSS e Imposto de Renda.",
    howItWorks:
      "A gente soma o salário dos dias de férias com o terço constitucional (1/3) e desconta INSS e IR sobre o total.",
    faq: [
      {
        q: "O que é o terço de férias?",
        a: "É um adicional de um terço do salário, garantido pela Constituição, pago junto com as férias. A calculadora soma esse terço ao valor.",
      },
      {
        q: "Férias têm desconto de imposto?",
        a: "Sim, INSS e Imposto de Renda incidem sobre o total das férias mais o terço. A calculadora mostra o líquido.",
      },
      {
        q: "Posso vender parte das férias?",
        a: "A lei permite vender até 1/3 das férias (o abono pecuniário), trocando dias de descanso por dinheiro. Esta calculadora estima o líquido das férias tiradas; o abono entra como valor adicional à parte.",
      },
    ],
  },
  {
    slug: "rescisao-trabalhista",
    simId: "rescisao",
    seoTitle: "Calculadora de rescisão (demissão sem justa causa) 2026",
    seoDescription:
      "Calcule quanto você recebe numa demissão sem justa causa: saldo, aviso, 13º e férias proporcionais, FGTS e multa de 40%.",
    h1: "Calculadora de rescisão",
    intro:
      "Informe o salário bruto para estimar o acerto de uma demissão sem justa causa: as verbas (saldo, aviso, 13º e férias proporcionais), os descontos e o FGTS com a multa de 40%.",
    howItWorks:
      "A gente soma as verbas (saldo, aviso, 13º e férias proporcionais), aplica os descontos certos e traz o FGTS com a multa de 40%.",
    faq: [
      {
        q: "O que entra na rescisão sem justa causa?",
        a: "Saldo de salário, aviso prévio, 13º e férias proporcionais com o terço, mais o saque do FGTS e a multa de 40% sobre o saldo.",
      },
      {
        q: "O cálculo é exato?",
        a: "É uma estimativa a partir do salário informado. Os valores reais dependem de tempo de casa, descontos e acordos; use como referência.",
      },
    ],
  },
  {
    slug: "clt-ou-pj",
    simId: "clt-vs-pj",
    seoTitle: "Calculadora CLT ou PJ: qual compensa?",
    seoDescription:
      "Compare quanto sobra como CLT e como PJ no fim do mês, considerando FGTS, 13º, férias, imposto do Simples ou MEI, pró-labore e contador.",
    h1: "CLT ou PJ: qual compensa?",
    intro:
      "Informe o salário CLT e a proposta PJ para comparar o líquido dos dois de verdade. O cálculo soma os benefícios CLT (FGTS, 13º, férias) e desconta os custos do PJ (imposto, pró-labore, contador).",
    howItWorks:
      "A gente calcula o líquido CLT (com opção de somar FGTS, 13º e férias) e o líquido PJ (MEI ou Simples, com imposto, pró-labore e contador) pra comparar de verdade.",
    faq: [
      {
        q: "Ser PJ vale mais a pena?",
        a: "Depende. O bruto PJ costuma ser maior, mas tem imposto, contador e ausência de FGTS, 13º e férias. A calculadora compara o líquido real dos dois.",
      },
      {
        q: "O que o cálculo PJ considera?",
        a: "Imposto do MEI ou do Simples, pró-labore e custo de contador. Do lado CLT, soma FGTS, 13º e férias ao líquido.",
      },
      {
        q: "Quanto cobrar como PJ para ganhar o mesmo que CLT?",
        a: "Como PJ você precisa de um bruto maior para cobrir imposto, contador e a falta de FGTS, 13º e férias. A calculadora compara o líquido dos dois lados para você achar a proposta que empata ou supera o CLT.",
      },
    ],
  },
  {
    slug: "valor-da-hora-de-trabalho",
    simId: "valor-hora",
    seoTitle: "Calculadora do valor da sua hora de trabalho",
    seoDescription:
      "Descubra quanto vale uma hora do seu trabalho a partir da renda mensal e da jornada semanal. Útil para precificar freela, hora extra ou cortar horas.",
    h1: "Quanto vale a sua hora de trabalho?",
    intro:
      "Informe sua renda mensal e a jornada por semana para ver quanto vale a sua hora e o seu dia. Serve para decidir se um freela, uma hora extra ou um corte de horas compensa.",
    howItWorks:
      "A partir da sua renda mensal e da jornada por semana, a gente mostra quanto vale a sua hora e o seu dia. Serve pra decidir se um freela, hora extra ou corte de horas compensa.",
    faq: [
      {
        q: "Como calcular o valor da hora?",
        a: "Divide-se a renda mensal pelas horas trabalhadas no mês, a partir da jornada semanal informada. A calculadora faz isso e ainda mostra o valor do dia.",
      },
      {
        q: "Serve para freelancer?",
        a: "Sim. Saber o valor da sua hora ajuda a precificar um freela ou avaliar se uma hora extra paga o tempo investido.",
      },
      {
        q: "Quanto cobrar por um freelancer?",
        a: "Comece pelo valor da sua hora e multiplique pelas horas estimadas do projeto, somando custos e uma margem. Saber quanto vale a sua hora evita cobrar barato demais por um freela.",
      },
    ],
  },
  {
    slug: "margem-e-markup",
    simId: "margem-markup",
    seoTitle: "Calculadora de margem e markup",
    seoDescription:
      "Calcule margem e markup sem confundir os dois, e descubra o preço de venda para a margem que você quer.",
    h1: "Calculadora de margem e markup",
    intro:
      "Margem é sobre o preço de venda (vai até 100%); markup é sobre o custo (pode passar de 100%). Informe custo e preço para ver os dois, ou diga a margem desejada para achar o preço.",
    howItWorks:
      "Margem é sobre o preço (vai até 100%); markup é sobre o custo (pode passar). A gente mostra os dois e ainda calcula o preço pra uma margem que você quer.",
    faq: [
      {
        q: "Qual a diferença entre margem e markup?",
        a: "Margem é o lucro como porcentagem do preço de venda. Markup é o quanto você soma sobre o custo. São números diferentes para a mesma venda.",
      },
      {
        q: "Como achar o preço para uma margem?",
        a: "Informe o custo e a margem que você quer; a calculadora resolve o preço de venda que entrega essa margem.",
      },
    ],
  },
  {
    slug: "ebitda",
    simId: "ebitda",
    seoTitle: "Calculadora de EBITDA",
    seoDescription:
      "Calcule o EBITDA da sua operação: o caixa que o negócio gera antes de juros, impostos, depreciação e amortização. Veja o resultado da atividade principal.",
    h1: "Calculadora de EBITDA",
    intro:
      "Informe receita, custos e despesas da operação para ver o EBITDA: o caixa que o seu negócio gera antes de juros, impostos e depreciação.",
    howItWorks:
      "A gente tira da receita os custos e as despesas da operação pra mostrar o EBITDA: o caixa que o seu negócio gera antes de juros, impostos e depreciação.",
    faq: [
      {
        q: "O que é EBITDA?",
        a: "É o resultado da operação antes de juros, impostos, depreciação e amortização. Mostra quanto a atividade principal gera de caixa, separada da estrutura financeira.",
      },
      {
        q: "EBITDA é o lucro?",
        a: "Não. É o caixa operacional antes de juros, impostos e depreciação. O lucro final ainda desconta esses itens.",
      },
      {
        q: "Como calcular o EBITDA?",
        a: "Parte-se da receita e tiram-se os custos e as despesas da operação, sem incluir juros, impostos, depreciação e amortização. A calculadora faz essa conta a partir dos números que você informa.",
      },
    ],
  },
  {
    slug: "vale-a-pena-comprar",
    simId: "compra",
    seoTitle: "Vale a pena comprar? Calculadora de custo de oportunidade",
    seoDescription:
      "Compare comprar e manter, comprar e revender, ou investir o mesmo dinheiro no CDI. Veja o custo de oportunidade real de cada escolha antes de decidir.",
    h1: "Vale a pena comprar?",
    intro:
      "Informe o valor para comparar o mesmo dinheiro em três caminhos: comprar e manter, comprar e revender, ou investir no CDI. A calculadora mostra o custo de oportunidade de cada escolha.",
    howItWorks:
      "A gente compara o mesmo dinheiro em três caminhos: comprar e manter, comprar e revender, ou investir no CDI. Veja o custo de oportunidade de cada escolha.",
    faq: [
      {
        q: "O que é custo de oportunidade?",
        a: "É o que você deixa de ganhar ao usar o dinheiro de um jeito em vez de outro. Comprar algo tem o custo do rendimento que aquele valor teria investido.",
      },
      {
        q: "A calculadora diz se devo comprar?",
        a: "Ela mostra os números de cada caminho para você decidir. A escolha final é sua, considerando uso e prioridade, não só o rendimento.",
      },
    ],
  },
  {
    slug: "a-vista-ou-parcelado",
    simId: "avista-parcelado",
    seoTitle: "À vista ou parcelado: qual vale mais?",
    seoDescription:
      "Compare o desconto à vista com parcelar sem juros e investir o dinheiro. Veja qual opção sai mais barata em valor de hoje, no presente.",
    h1: "À vista ou parcelado?",
    intro:
      "Informe o preço à vista, o desconto e as parcelas para comparar o pagamento à vista com o valor presente das parcelas, considerando que o dinheiro renderia investido. O menor em valor de hoje vence.",
    howItWorks:
      "A gente compara o preço à vista (com desconto) com o valor presente das parcelas, considerando que o dinheiro renderia investido. O menor em valor de hoje vence.",
    faq: [
      {
        q: "Parcelar sem juros sempre compensa?",
        a: "Nem sempre. Se o desconto à vista for maior do que o dinheiro renderia investido durante o parcelamento, à vista compensa. A calculadora compara em valor de hoje.",
      },
      {
        q: "O que é valor presente?",
        a: "É quanto valem hoje pagamentos futuros, descontando o rendimento que o dinheiro teria nesse tempo. Permite comparar à vista com parcelado de forma justa.",
      },
      {
        q: "Quando vale mais a pena pagar à vista?",
        a: "Vale quando o desconto à vista supera o que o dinheiro renderia investido durante o parcelamento. Sem desconto e podendo render, parcelar sem juros costuma ganhar. A calculadora compara os dois em valor de hoje.",
      },
    ],
  },
  {
    slug: "conversor-de-taxa-de-juros",
    simId: "conversor-juros",
    seoTitle: "Conversor de taxa de juros (mensal e anual)",
    seoDescription:
      "Converta taxa de juros de mensal para anual e vice-versa, com juros compostos. 1% ao mês não é 12% ao ano, é 12,68%.",
    h1: "Conversor de taxa de juros",
    intro:
      "Informe a taxa e diga se é mensal ou anual. A calculadora converte com juros compostos, do jeito certo: 1% ao mês não é 12% ao ano, é 12,68%.",
    howItWorks:
      "Informe a taxa e diga se é mensal ou anual. A gente converte com juros compostos, do jeito certo: 1% ao mês não é 12% ao ano, é 12,68%.",
    faq: [
      {
        q: "Por que 1% ao mês não é 12% ao ano?",
        a: "Porque os juros compõem mês a mês. Ao longo de doze meses, o juro rende sobre o juro, e 1% ao mês equivale a 12,68% ao ano.",
      },
      {
        q: "A conversão serve para qualquer taxa?",
        a: "Sim, para taxas de juros compostos. Informe o valor e o período de origem, e a calculadora devolve o equivalente no outro período.",
      },
    ],
  },
  {
    slug: "regra-de-tres",
    simId: "regra-de-tres",
    seoTitle: "Calculadora de regra de três",
    seoDescription:
      "Resolva uma regra de três direta ou inversa na hora: A está para B assim como C está para o valor que falta.",
    h1: "Calculadora de regra de três",
    intro:
      "A clássica: A está para B assim como C está para X. Escolha direta ou inversa, preencha os três valores conhecidos e a calculadora acha o que falta.",
    howItWorks:
      "A clássica: A está para B assim como C está para X. Escolha direta ou inversa e a gente acha o valor que falta.",
    faq: [
      {
        q: "Quando usar regra de três direta ou inversa?",
        a: "Direta quando as grandezas crescem juntas (mais itens, mais custo). Inversa quando uma cresce e a outra cai (mais pessoas, menos tempo). A calculadora trata os dois casos.",
      },
      {
        q: "Para que serve a regra de três?",
        a: "Para achar um valor proporcional a partir de três conhecidos: descontos, conversões, proporções e escala de preços, entre outros.",
      },
    ],
  },
];

const BY_SLUG: ReadonlyMap<string, PublicCalculator> = new Map(
  PUBLIC_CALCULATORS.map((calc) => [calc.slug, calc]),
);

export function getPublicCalculator(slug: string): PublicCalculator | undefined {
  return BY_SLUG.get(slug);
}

export function publicCalculatorSlugs(): string[] {
  return PUBLIC_CALCULATORS.map((calc) => calc.slug);
}
