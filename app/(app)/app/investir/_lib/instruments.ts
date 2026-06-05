export interface Instrument {
  name: string;
  whatIs: string;
  liquidity: string;
  risk: string;
  tax: string;
  goodFor: string;
}

export interface InvestTier {
  key: string;
  title: string;
  subtitle: string;
  instruments: Instrument[];
}

export function findInstrument(name: string): Instrument | undefined {
  for (const tier of INVEST_GUIDE.tiers) {
    const found = tier.instruments.find((i) => i.name === name);
    if (found) return found;
  }
  return undefined;
}

export interface InvestGuideContent {
  intro: string;
  disclaimer: string;
  calculatorLink: string;
  tiers: InvestTier[];
}

export const INVEST_GUIDE: InvestGuideContent = {
  "intro": "Onde guardar dinheiro depende de duas perguntas: pra quê é e quando você vai precisar dele. A gente separou em três trilhas pra você comparar o que combina com cada objetivo.",
  "disclaimer": "Isto é educação financeira, não recomendação de investimento. A gente explica como cada opção funciona pra você decidir; nenhum nome citado aqui é indicação de onde aplicar.",
  "calculatorLink": "Onde rende mais? Faz a conta",
  "tiers": [
    {
      "key": "reserva",
      "title": "Pra reserva / pode sacar a qualquer hora",
      "subtitle": "Dinheiro que você pode precisar de uma hora pra outra, sem perder segurança.",
      "instruments": [
        {
          "name": "Tesouro Selic",
          "whatIs": "Um título público: na prática você empresta dinheiro pro governo federal e recebe de volta com juros. O rendimento acompanha a Selic, a taxa básica de juros do país. É considerado o investimento mais seguro do Brasil.",
          "liquidity": "Dá pra sacar todo dia útil. Você pede o resgate e o dinheiro cai na conta no dia útil seguinte (o famoso D+1). Não tem multa nem carência.",
          "risk": "Baixo. Quem garante é o Tesouro Nacional, o devedor mais seguro do país. Se precisar tirar antes do prazo, o valor pode oscilar um pouco no curtíssimo prazo, mas como segue a Selic essa variação costuma ser pequena.",
          "tax": "Imposto de Renda só sobre o que rendeu, nunca sobre o valor aplicado. A alíquota cai com o tempo: começa em 22,5% e vai até 15% conforme o dinheiro fica mais tempo parado. Há também uma pequena taxa de custódia da B3.",
          "goodFor": "Guardar a reserva de emergência e qualquer dinheiro que pode precisar a qualquer momento, sem abrir mão de segurança e de sacar rápido."
        },
        {
          "name": "CDB de liquidez diária",
          "whatIs": "CDB é Certificado de Depósito Bancário: é como se você emprestasse dinheiro pro banco e ele te pagasse juros. O \"de liquidez diária\" é a versão que você resgata quando quiser. O rendimento costuma ficar perto do CDI, taxa que anda quase junto da Selic.",
          "liquidity": "Diária: dá pra sacar a qualquer dia. Atenção: nem todo CDB é assim. Existem CDBs com carência (prazo travado) que só pagam no vencimento. Confira sempre se está escrito liquidez diária antes de aplicar.",
          "risk": "Baixo. Tem a proteção do FGC (Fundo Garantidor de Créditos), que devolve seu dinheiro, incluindo o que rendeu, até R$ 250 mil por CPF em cada banco, com limite total de R$ 1 milhão renovável a cada 4 anos, caso o banco quebre. Por isso, o cuidado principal é não concentrar valores acima desse limite num mesmo banco.",
          "tax": "Mesma regra do Tesouro: IR só sobre o rendimento, e a alíquota cai de 22,5% até 15% conforme o tempo. Quanto mais tempo deixa, menos imposto. Aqui não tem taxa de custódia como a do Tesouro.",
          "goodFor": "Também serve pra reserva e pro dinheiro do dia a dia que precisa ficar acessível, principalmente pra quem já é cliente de um banco que oferece essa opção com bom rendimento."
        },
        {
          "name": "Poupança",
          "whatIs": "A caderneta de poupança, a aplicação mais conhecida do Brasil, oferecida por quase todo banco. O dinheiro rende uma vez por mês, na data de aniversário do depósito. A regra de rendimento é definida por lei e costuma ser mais baixa que a das outras opções de reserva.",
          "liquidity": "Total e imediata: dá pra sacar a qualquer hora, na hora. O detalhe é que o rendimento só entra na data de aniversário (um mês após cada depósito). Se sacar antes de completar o mês, perde o rendimento daquele período.",
          "risk": "Baixo. Também tem a proteção do FGC, nos mesmos limites de até R$ 250 mil por CPF por banco (teto total de R$ 1 milhão a cada 4 anos). O risco maior não é perder o dinheiro, e sim render pouco e, em alguns períodos, não acompanhar bem a inflação.",
          "tax": "Isenta de Imposto de Renda. Tudo o que rende é seu, sem desconto de IR. É uma das vantagens que mais atraem quem usa a poupança.",
          "goodFor": "Quem quer simplicidade total e prefere algo que já conhece, sem se preocupar com imposto nem com prazos. Costuma render menos que as outras opções de reserva, então vale comparar antes de decidir onde deixar o dinheiro."
        }
      ]
    },
    {
      "key": "medio",
      "title": "Médio prazo, sem sustos (renda fixa)",
      "subtitle": "Dinheiro que você não vai precisar tão cedo e quer ver render mais que a poupança, sem grandes oscilações.",
      "instruments": [
        {
          "name": "CDB",
          "whatIs": "Um empréstimo que você faz ao banco. Você deposita, o banco usa esse dinheiro pra emprestar a outras pessoas e te paga juros em troca. No fim do prazo você recebe o que aplicou mais o rendimento.",
          "liquidity": "Depende do CDB. Existe o de liquidez diária, que deixa sacar a qualquer momento. E existe o com carência, que só libera na data de vencimento (pode ser meses ou anos). Sempre confira o prazo antes de aplicar.",
          "risk": "Baixo. Se render perto do CDI e tiver liquidez diária, costuma render bem mais que a poupança. O risco principal seria o banco quebrar, mas aí entra a proteção do FGC: garante até R$ 250 mil por CPF por instituição (limite total de R$ 1 milhão a cada 4 anos somando todos os bancos).",
          "tax": "Imposto de Renda só sobre o que você ganhou, nunca sobre o valor aplicado. A alíquota cai de 22,5% até 15% conforme o tempo (15% depois de 2 anos). Quanto mais tempo, menos imposto. Se sacar em menos de 30 dias, ainda incide o IOF.",
          "goodFor": "Guardar dinheiro de médio prazo com mais rendimento que a poupança e segurança parecida. A versão de liquidez diária também serve pra reserva de emergência."
        },
        {
          "name": "RDC de cooperativa",
          "whatIs": "O primo do CDB, mas oferecido por cooperativas de crédito (instituições onde os clientes também são donos). RDC é Recibo de Depósito Cooperativo. Funciona igual: você empresta pra cooperativa e recebe juros. Cooperativas como o Sicoob são exemplo dessa categoria, não uma indicação.",
          "liquidity": "Igual ao CDB: tem opções com liquidez diária e opções com carência até o vencimento. Confira sempre o prazo de cada aplicação antes de aplicar.",
          "risk": "Baixo, parecido com o CDB. As cooperativas de crédito têm a proteção do FGCoop (Fundo Garantidor do Cooperativismo de Crédito), que também garante até R$ 250 mil por CPF por instituição, na mesma lógica do FGC dos bancos.",
          "tax": "Mesma regra do CDB: Imposto de Renda só sobre o lucro, com alíquota caindo de 22,5% até 15% (quanto mais tempo aplicado, menos imposto, chegando a 15% depois de 2 anos). IOF se sacar em menos de 30 dias.",
          "goodFor": "Mesma função do CDB pra quem é cooperado: aplicar dinheiro de médio prazo com segurança e rendimento melhor que a poupança."
        },
        {
          "name": "LCI/LCA",
          "whatIs": "Títulos parecidos com o CDB, mas o dinheiro que você aplica é direcionado pra setores específicos: a LCI financia o setor imobiliário (Letra de Crédito Imobiliário) e a LCA o agronegócio (Letra de Crédito do Agronegócio). Você empresta, o banco usa nesses setores e te paga juros.",
          "liquidity": "Menos flexível. Por lei têm um período mínimo de carência antes do resgate (costuma ser de alguns meses). Não servem pra dinheiro que você pode precisar a qualquer hora.",
          "risk": "Baixo. Também têm a proteção do FGC, com o mesmo limite de R$ 250 mil por CPF por instituição. O risco principal seria o banco quebrar, coberto por essa garantia.",
          "tax": "O grande atrativo: são isentas de Imposto de Renda pra pessoa física. Você fica com 100% do rendimento, sem desconto de IR. Por isso, mesmo com taxa aparentemente menor, podem render mais que um CDB depois do imposto.",
          "goodFor": "Guardar dinheiro de médio prazo que você não vai precisar tão cedo, aproveitando a isenção de imposto. Por causa da carência, não serve pra reserva de emergência."
        },
        {
          "name": "Tesouro prefixado",
          "whatIs": "Um título público: você empresta dinheiro pro governo federal. No prefixado, a taxa de juros já é combinada na hora da compra, então você sabe exatamente quanto vai receber por real se levar até o vencimento. É uma das aplicações mais seguras do país.",
          "liquidity": "O Tesouro recompra todos os dias, então dá pra vender antes do vencimento (resgate em D+1, o dinheiro entra no dia útil seguinte). Mas atenção: se vender antes do prazo combinado, o preço oscila no mercado e você pode receber mais ou menos do que esperava. A taxa só está garantida se levar até o fim.",
          "risk": "Muito baixo de calote, porque quem garante é o governo federal, considerado o risco mais baixo do país (por isso nem precisa de FGC). O cuidado é a oscilação: se precisar vender antes do vencimento, o valor pode estar abaixo do esperado.",
          "tax": "Imposto de Renda só sobre o lucro, com a alíquota caindo de 22,5% até 15% conforme o tempo (15% depois de 2 anos). IOF se resgatar em menos de 30 dias.",
          "goodFor": "Quem quer travar uma taxa conhecida e tem um objetivo com data definida, como uma compra daqui a alguns anos, conseguindo prever quanto vai ter no fim."
        },
        {
          "name": "Tesouro IPCA+",
          "whatIs": "Outro título do governo federal, mas com rendimento misto: paga a inflação do período (medida pelo IPCA) mais uma taxa de juros fixa por cima. Ou seja, garante que seu dinheiro renda acima da inflação, protegendo o poder de compra ao longo do tempo.",
          "liquidity": "Igual aos outros títulos do Tesouro: dá pra vender antes do vencimento com resgate em D+1. Mas, se vender antes do prazo, o preço oscila e o valor pode vir diferente do esperado. A proteção contra a inflação só é garantida levando até o vencimento.",
          "risk": "Muito baixo de calote, garantido pelo governo federal (sem necessidade de FGC). Como o prefixado, tem risco de oscilação se você vender antes do vencimento, então o ideal é combinar o prazo com o seu objetivo.",
          "tax": "Imposto de Renda só sobre o lucro, alíquota caindo de 22,5% até 15% conforme o tempo aplicado (15% depois de 2 anos). IOF se resgatar em menos de 30 dias.",
          "goodFor": "Objetivos de longo prazo em que proteger o dinheiro da inflação importa, como aposentadoria ou faculdade dos filhos, garantindo que o valor não perca poder de compra com os anos."
        }
      ]
    },
    {
      "key": "longo",
      "title": "Longo prazo, aceita oscilar (renda variável)",
      "subtitle": "Dinheiro que pode ficar anos parado e você aceita ver subir e descer no caminho.",
      "instruments": [
        {
          "name": "Fundos de investimento",
          "whatIs": "Um condomínio de dinheiro: várias pessoas juntam recursos e um gestor profissional aplica esse bolo em vários ativos (ações, títulos, imóveis, moedas e outros). Você compra cotas e seu dinheiro acompanha o resultado da carteira. Existem fundos mais conservadores e fundos bem agressivos, então a palavra \"fundo\" sozinha não diz o risco: depende do que ele investe.",
          "liquidity": "Varia muito de fundo pra fundo e está escrito no regulamento. Alguns devolvem o dinheiro em poucos dias, outros têm prazo de resgate de semanas (você pede hoje e o dinheiro cai dias depois). Sempre confira o prazo de resgate antes de aplicar, porque não dá pra sacar na hora como na poupança.",
          "risk": "Variável, de baixo a alto, conforme o tipo de fundo. Um fundo de ações ou multimercado pode oscilar bastante e até perder valor; um de renda fixa balança menos. Fundo não tem garantia do FGC. A segurança vem da diversificação e da regulação, não de um seguro.",
          "tax": "Na maioria dos fundos o IR cai com o tempo: começa em 22,5% e vai até 15% acima de dois anos, cobrado só sobre o lucro no resgate. Muitos fundos de renda fixa e multimercado ainda têm o \"come-cotas\", um adiantamento de imposto duas vezes por ano. Fundos de ações têm regra própria (15% sobre o lucro no resgate, sem come-cotas).",
          "goodFor": "Quem quer investir com gestão profissional e diversificação sem escolher ativo por ativo, mirando o longo prazo e aceitando que o valor oscila no caminho. Bom pra delegar a parte técnica, desde que você entenda em que o fundo investe e o prazo pra resgatar."
        },
        {
          "name": "Ações",
          "whatIs": "Comprar uma ação é virar dono de um pedacinho de uma empresa listada na bolsa. Se a empresa cresce e vale mais, sua fatia tende a valer mais; se vai mal, pode valer menos. Algumas empresas também distribuem parte do lucro pros donos (os dividendos), que caem na sua conta de tempos em tempos.",
          "liquidity": "Alta nas empresas mais negociadas: dá pra comprar e vender pela corretora durante o horário da bolsa (dias úteis, em geral das 10h às 17h). O dinheiro da venda costuma ficar disponível pra saque em dois dias úteis. Fora do horário da bolsa não dá pra negociar.",
          "risk": "Alto: o preço sobe e desce todo dia e você pode perder parte do dinheiro, ainda mais no curto prazo. Não tem garantia do FGC nem do governo. O risco diminui, mas não some, com prazo longo e com diversificação, ou seja, não colocar tudo numa empresa só.",
          "tax": "Vendas até R$ 20 mil no mês são isentas de IR sobre o lucro. Acima disso, paga 15% sobre o lucro em operações normais (e 20% no day trade). Você mesmo apura e paga via DARF no mês seguinte. Dividendos hoje chegam isentos, mas há discussão de mudança nessa regra, então vale acompanhar.",
          "goodFor": "Objetivos de longo prazo de quem aceita ver o valor balançar bastante em troca de um potencial de crescimento maior. Serve pra construir patrimônio ao longo de anos, não pra dinheiro que você vai precisar logo nem pra reserva de emergência."
        },
        {
          "name": "Fundos imobiliários (FIIs)",
          "whatIs": "Um jeito de investir em imóveis sem comprar um imóvel inteiro. O fundo junta dinheiro de muita gente e aplica em coisas como shoppings, galpões de logística, prédios de escritórios ou títulos ligados ao setor imobiliário. Você compra cotas na bolsa e costuma receber aluguéis distribuídos, em geral todo mês.",
          "liquidity": "Você compra e vende as cotas na bolsa pela corretora, no horário de funcionamento dela, e recebe o dinheiro da venda em poucos dias úteis. Mas o preço depende de ter comprador na hora: fundos pouco negociados podem ser mais difíceis de vender rápido pelo preço que você queria.",
          "risk": "Médio a alto: a cota oscila com o mercado e com a saúde dos imóveis (imóvel vazio, inquilino que sai, juros subindo). Pode valer menos do que você pagou. Não tem garantia do FGC. Os aluguéis distribuídos também variam de mês pra mês, não são fixos nem garantidos.",
          "tax": "Os rendimentos mensais (os \"aluguéis\") normalmente chegam isentos de IR pra pessoa física, desde que cumpridas as regras do fundo. Já o lucro na venda das cotas é tributado em 20%, sem aquela isenção de R$ 20 mil que existe nas ações, e você apura e paga via DARF.",
          "goodFor": "Quem busca uma renda recorrente vinda de imóveis e pensa no longo prazo, aceitando que o valor das cotas sobe e desce. Funciona pra diversificar o patrimônio em imóveis sem a burocracia e o custo de comprar um imóvel físico."
        },
        {
          "name": "Criptomoedas",
          "whatIs": "Moedas digitais que existem só na internet, sem banco central nem governo por trás (as mais conhecidas são Bitcoin e Ethereum). O preço é definido só pela oferta e procura no mundo todo, sem nada que segure o valor. É a aplicação mais especulativa desta lista.",
          "liquidity": "Negocia 24 horas por dia, todos os dias, inclusive fim de semana e feriado, em corretoras de cripto. Em tese dá pra vender a qualquer momento, mas o preço pode estar muito diferente do que você pagou, e sacar pro banco depende dos prazos da corretora que você usa.",
          "risk": "Alto, o mais alto da lista: o preço pode dobrar ou cair pela metade em pouco tempo. Não tem garantia do FGC nem do governo, e há riscos extras de golpe, de corretora quebrar e de perder o acesso à sua carteira. Encare como dinheiro que você aceita ver oscilar muito e, no limite, perder.",
          "tax": "Vendas de cripto até R$ 35 mil no mês são isentas de IR sobre o lucro. Passando disso, o lucro é tributado (a partir de 15%, com alíquotas maiores pra ganhos muito altos), apurado e pago por você via DARF. Há também obrigação de informar as operações à Receita conforme as regras vigentes, que vêm mudando.",
          "goodFor": "Quem quer expor uma fatia pequena do patrimônio a um ativo de altíssimo risco e altíssima oscilação, com horizonte longo e estômago pra perdas. Não serve pra reserva de emergência nem pra dinheiro que você não pode perder."
        }
      ]
    }
  ]
};
