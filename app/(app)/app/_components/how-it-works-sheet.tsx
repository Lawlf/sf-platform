"use client";

import { HelpCircle, Sparkles } from "lucide-react";

import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/app/components/ui/sheet";

const TOPICS = {
  "saldo-livre": {
    title: "Saldo livre por mês",
    tag: "Conceito",
    body: "É o que sobra da sua renda mensal depois de pagar todas as parcelas e contas fixas. Quanto maior, mais flexibilidade você tem pra poupar, investir ou amortizar dívidas.",
    technical:
      "Cálculo: soma de renda mensal equivalente (incluindo semanais convertidas) menos soma das parcelas atuais (financiamento, empréstimo, mínimo do cartão a 15%, juros do cheque especial).",
  },
  "renda-comprometida": {
    title: "Renda comprometida",
    tag: "Conceito",
    body: "É a parte da sua renda mensal que vai pra pagar dívidas. Se você ganha R$ 8.500 e paga R$ 2.380 em parcelas, sua renda comprometida é 28%. Bancos costumam considerar saudável até 30%. Acima de 50%, fica difícil pagar contas básicas.",
    technical:
      "Fórmula: (soma das parcelas mensais) dividido pela renda mensal equivalente. Parcelas incluem financiamento (Price ou SAC), empréstimo (parcela fixa) e mínimo do cartão (15% da fatura).",
  },
  cet: {
    title: "CET (Custo Efetivo Total)",
    tag: "Conceito",
    body: "Mostra o custo real anual do empréstimo, incluindo juros, taxas administrativas, seguros e IOF. É o número que permite comparar produtos diferentes com a mesma régua. Bancos são obrigados pela Lei a informar o CET.",
    technical:
      "É a taxa interna de retorno (IRR) do fluxo de caixa do contrato. Calculada por Newton-Raphson resolvendo: principal líquido igual à soma das parcelas descontadas pelo CET.",
  },
  "price-vs-sac": {
    title: "Price vs SAC",
    tag: "Conceito",
    body: "Price (Sistema Francês): parcela fixa do começo ao fim. Mais previsível. Você paga muito juros no início e quase nada no fim. SAC (Sistema de Amortização Constante): parcela cai com o tempo. Começa alta e termina baixa. Total de juros pago é menor que Price.",
    technical:
      "Price: parcela = P x i / (1 - (1+i)^-n). SAC: amortização constante = P/n, juros do mês = saldo x i.",
  },
  iof: {
    title: "Valor recebido vs contratado",
    tag: "Conceito",
    body: "Valor recebido é o que cai na sua conta. Valor contratado é o que entra na sua dívida e você precisa pagar, incluindo IOF e tarifas embutidas. A diferença geralmente é entre 2% e 6% do valor pra empréstimo pessoal.",
    technical:
      "IOF empréstimo pessoa física (2026): 0,38% fixo + 0,0082% ao dia limitado a 3% (365 dias). Tarifas de cadastro/abertura variam por banco. Tudo isso entra no principal contratado para fins de Price e CET.",
  },
  rotativo: {
    title: "Rotativo do cartão",
    tag: "Conceito",
    body: "Quando você paga só o mínimo da fatura, o restante vira rotativo: o banco financia o saldo com juros altíssimos (média 400% ao ano). É a dívida mais cara do mercado brasileiro. Em 1 mês a fatura pode dobrar.",
    technical:
      "Pelo Bacen (2017+), o rotativo só pode durar 1 mês. Depois disso, deve virar parcelamento de fatura com juros menores. Mas mesmo o parcelamento costuma ter taxas de 8% a 15% ao mês.",
  },
  "cheque-especial": {
    title: "Como o cheque especial cobra juros",
    tag: "Conceito",
    body: "Cheque especial cobra juros diários sobre o saldo devedor. Diferente do empréstimo, não tem parcela: o saldo cresce todo dia que você fica negativo. É a 2ª dívida mais cara do mercado, ficando atrás só do rotativo.",
    technical:
      "Cap legal de 8% ao mês (Bacen 2020). Se você usar R$ 1.000 do cheque especial por 30 dias, paga ~R$ 80 só de juros. Vale sempre quitar antes do salário entrar pra zerar o saldo.",
  },
  acoes: {
    title: "Como funciona o acompanhamento de ações?",
    tag: "Patrimônio",
    body: "Cadastre suas ações informando o ticker, quantos papéis você tem e o preço médio que pagou. Toque em Atualizar cotação para ver o preço atual e quanto você ganhou ou perdeu até agora.",
    technical:
      "Ganho ou perda é calculado como (cotação atual menos preço médio) multiplicado pela quantidade de ações. No plano Pro, suas cotações atualizam sozinhas todo dia.",
  },
  "manutencao-reservas": {
    title: "Quando devo revisar minhas reservas?",
    tag: "Manutenção",
    body: "A cada 30 dias, lembramos você de conferir suas reservas que rendem. Verifique se a taxa (% do CDI ou ao ano) mudou, atualize o saldo se sacou ou depositou, e marque como revisada para zerar o contador.",
    technical:
      "Reservas com rendimento (cash + yieldType diferente de none) cuja última revisão foi há 30 dias ou mais entram no lembrete.",
  },
  "projecao-quitacao": {
    title: "Projeção de quitação",
    tag: "Simulador",
    body: "Você escolhe uma dívida e quanto consegue pagar por mês. A gente projeta o saldo caindo mês a mês até zerar, somando os juros do caminho, e mostra a data prevista de quitação e o total que você vai desembolsar. Atenção: se a parcela for menor que os juros do mês, o saldo cresce em vez de cair e a dívida não acaba nunca.",
    technical:
      "Faça você mesmo: a cada mês, juros do mês = saldo x taxa mensal; novo saldo = saldo + juros - parcela. Repita até o saldo chegar a zero, contando os meses e somando os juros. Se a parcela for menor que os juros do mês, o saldo cresce e a dívida nunca termina.",
  },
  "pagar-extra": {
    title: "Pagar extra",
    tag: "Simulador",
    body: "A gente roda a projeção duas vezes: só com a parcela, e com a parcela mais um valor extra todo mês. A diferença mostra quantos meses sua dívida encurta e quanto de juros some. Como o extra abate direto no saldo, ele derruba os juros dos meses seguintes, e esse efeito é maior quanto antes você começa.",
    technical:
      "Faça você mesmo: projete a quitação duas vezes, com e sem o extra. A diferença de meses e de juros entre as duas projeções é o seu ganho. Como o extra abate direto no saldo, ele derruba os juros dos meses seguintes, e esse efeito cresce quanto antes você começa.",
  },
  "snowball-avalanche": {
    title: "Snowball vs Avalanche",
    tag: "Simulador",
    body: "Com várias dívidas e um valor fixo por mês pra atacá-las, a ordem muda o resultado. Quitar a menor primeiro dá uma vitória rápida pra manter o ânimo. Atacar a de juros mais alto economiza mais no fim. A gente compara as duas estratégias com o mesmo dinheiro pra você ver a diferença em meses e em juros.",
    technical:
      "Faça você mesmo: pague o mínimo de todas e jogue o que sobra do orçamento numa única dívida. Snowball: a de menor saldo. Avalanche: a de maior juro. Quando ela zera, o valor que ia pra ela vai pra próxima (efeito bola de neve). Avalanche costuma pagar menos juros no total.",
  },
  "compra-vs-investir": {
    title: "Vale a pena comprar?",
    tag: "Simulador",
    body: "A gente compara três caminhos pro mesmo dinheiro: comprar e manter o bem (que pode perder valor), comprar e revender depois, ou investir o valor no CDI. O custo de oportunidade mostra o quanto você deixa de ganhar comprando em vez de investir.",
    technical:
      "Faça você mesmo: valor do bem no fim = valor x (1 - depreciação anual) elevado aos anos. Valor investido = valor x (1 + CDI anual) elevado aos anos. Custo de oportunidade = valor investido menos o que o bem vale no fim. Use a depreciação do tipo do bem (carro cai rápido, imóvel pode subir).",
  },
  "independencia-financeira": {
    title: "Independência financeira",
    tag: "Simulador",
    body: "Pensa numa galinha dos ovos de ouro: você engorda o patrimônio até os ovos (o rendimento) pagarem suas contas todo mês, sem precisar encostar na galinha. Aí você é livre: pode parar de trabalhar e viver do que o patrimônio rende. A gente parte do que você já tem investido, do quanto aporta por mês e do seu custo de vida pra projetar quando esse dia chega.",
    technical:
      "Faça você mesmo: o patrimônio-alvo é o custo anual dividido pela taxa real (regra dos 4%: gasto anual x 25 quando a taxa real é 4%). A acumulação compõe mês a mês: novo saldo = saldo x (1 + taxa mensal) + aporte, com taxa mensal = (1 + taxa anual real) elevado a 1/12, menos 1. Use a taxa real (acima da inflação): no Brasil, o CDI costuma render de 4% a 5% reais ao ano.",
  },
  "divida-vs-investir": {
    title: "Quitar dívida ou investir?",
    tag: "Simulador",
    body: "Sobrou um dinheiro (13º, bônus, uma folga) e você não sabe se quita a dívida ou investe. Abater uma dívida 'rende' o juro que você deixa de pagar. Então a conta é direta: se o juro da dívida é maior que o rendimento do investimento, quitar ganha. Ex.: uma dívida a 5% ao mês é quase impossível de bater investindo.",
    technical:
      "Faça você mesmo: juros evitados = quantia x ((1 + juro da dívida)^anos - 1). Rendimento = quantia x ((1 + rendimento)^anos - 1). Compare os dois; o maior vence. Atalho: como os dois usam a mesma quantia, basta comparar as taxas. Use o rendimento líquido (após o IR, que cai de 22,5% para 15% conforme o prazo). No empate, quitar costuma ganhar pela segurança.",
  },
  "reserva-emergencia": {
    title: "Reserva de emergência",
    tag: "Simulador",
    body: "É o colchão que segura seu padrão de vida se a renda parar (perda de emprego, um imprevisto). A conta é simples: quantos meses do seu custo fixo a reserva de hoje cobre. O fôlego recomendado é de 6 a 12 meses, num lugar que você saca a qualquer hora (Tesouro Selic, CDB de liquidez diária).",
    technical:
      "Faça você mesmo: reserva-alvo = custo fixo mensal x meses de meta (ex.: 6). Meses cobertos = reserva atual dividida pelo custo fixo. Tempo pra completar = quanto falta dividido pelo aporte mensal. A reserva fica em renda fixa líquida (Tesouro Selic, CDB com liquidez diária); o rendimento dela aqui é ignorado de propósito, pra ser conservador.",
  },
  "juros-compostos": {
    title: "Juros compostos",
    tag: "Simulador",
    body: "Pensa numa bola de neve descendo a ladeira: ela rola, gruda mais neve e, quanto maior fica, mais neve gruda a cada volta. Seu dinheiro faz igual: o juro de um mês vira base pro juro do mês seguinte. Ex.: R$ 100 a 1% viram R$ 101; no mês seguinte o 1% incide sobre R$ 101, não sobre R$ 100. Com aportes e tempo, a bola fica gigante. A gente projeta quanto vira e quanto disso é só rendimento.",
    technical:
      "Faça você mesmo: composição mensal com taxa i = (1 + taxa anual)^(1/12) - 1. Patrimônio final = valor inicial x (1 + i)^n + aporte x ((1 + i)^n - 1) / i, com n = anos x 12. O rendimento é o patrimônio final menos tudo que você aportou. Quanto mais cedo começar, mais o tempo trabalha por você.",
  },
  "financiamento-price-sac": {
    title: "Financiamento: Price ou SAC?",
    tag: "Simulador",
    body: "Os dois sistemas pagam a mesma dívida de jeitos diferentes. Na Tabela Price a parcela é fixa do começo ao fim: previsível, mas você paga mais juro no início. No SAC a parcela começa mais alta e cai todo mês, e o total de juros sai menor porque o saldo é abatido mais rápido. A gente simula os dois lado a lado.",
    technical:
      "Faça você mesmo: taxa mensal = (1 + taxa anual)^(1/12) - 1. Price: parcela fixa = P x i / (1 - (1 + i)^-n). SAC: amortização constante = P / n; juros do mês = saldo x i; parcela = amortização + juros (cai com o saldo). O SAC paga menos juros no total porque abate o saldo mais rápido no começo.",
  },
  "regra-de-tres": {
    title: "Regra de três",
    tag: "Simulador",
    body: "Acha um valor que falta a partir de três que você já conhece. Direta: as duas grandezas crescem juntas (mais produto, mais preço a pagar). Inversa: uma sobe e a outra desce (mais gente trabalhando, menos tempo pra terminar). Na dúvida, pergunte: se o primeiro aumenta, o segundo aumenta ou diminui?",
    technical:
      "Faça você mesmo. Direta: A está para B assim como C está para X, então X = B x C ÷ A. Inversa: X = A x B ÷ C. Dica pra escolher: pergunte 'se o primeiro aumenta, o segundo aumenta ou diminui?'. Aumenta junto = direta; diminui = inversa.",
  },
  "salario-clt": {
    title: "Salário líquido CLT",
    tag: "Simulador",
    body: "Do salário bruto saem dois descontos obrigatórios: o INSS (que banca sua aposentadoria) e o Imposto de Renda. A gente calcula os dois e mostra o líquido passo a passo. O segredo que confunde todo mundo: as alíquotas funcionam como degraus de uma escada. Cada faixa do salário paga a sua taxa só na parte que cai nela, não no salário inteiro. Por isso ganhar um pouco a mais nunca faz você 'perder' dinheiro ao mudar de faixa.",
    technical:
      "INSS 2025 (progressivo, cada % só na parte da faixa): 7,5% até R$ 1.518; 9% até R$ 2.793,88; 12% até R$ 4.190,83; 14% até R$ 8.157,41 (teto). IRRF: base = bruto menos o maior entre (INSS + R$ 189,59 por dependente) e o desconto simplificado de R$ 564,80. Sobre a base: isento até R$ 2.259,20; depois 7,5%, 15%, 22,5% e 27,5%, sempre subtraindo a parcela a deduzir da faixa. Valores de referência 2025.",
  },
  "decimo-terceiro": {
    title: "13º salário líquido",
    tag: "Simulador",
    body: "O 13º é proporcional aos meses que você trabalhou no ano e é tributado separado do salário do mês. Costuma vir em duas parcelas: a 1ª (até 30/nov) cai sem descontos, e a 2ª (até 20/dez) já vem com o INSS e o Imposto de Renda do 13º inteiro. Por isso a 2ª parcela vem bem menor que a 1ª.",
    technical:
      "Faça você mesmo: 13º bruto = salário x meses trabalhados ÷ 12. Sobre esse valor incidem INSS (progressivo, mesma tabela do salário) e IRRF, calculados separadamente do salário mensal. 1ª parcela = metade do bruto. 2ª parcela = líquido total menos a 1ª. Valores de referência 2025.",
  },
  ferias: {
    title: "Férias líquidas",
    tag: "Simulador",
    body: "Nas férias você recebe o salário dos dias mais um terço a mais, garantido pela Constituição. O INSS e o Imposto de Renda incidem sobre esse total. Muita calculadora esquece o terço e erra a conta pra menos; aqui ele entra certo.",
    technical:
      "Faça você mesmo: salário dos dias = salário x dias ÷ 30. Terço = salário dos dias ÷ 3. Bruto = salário dos dias + terço. Sobre o bruto incidem INSS (progressivo) e IRRF (com a dedução mais vantajosa). O líquido é o bruto menos esses dois. Valores de referência 2025.",
  },
  "conversor-juros": {
    title: "Conversor de taxa de juros",
    tag: "Simulador",
    body: "Converte uma taxa de juros entre mensal e anual. O pulo do gato é que juros compõem: 1% ao mês NÃO vira 12% ao ano, vira 12,68% (o juro de um mês rende sobre o do anterior). Serve pra comparar ofertas que vêm em períodos diferentes na mesma régua.",
    technical:
      "Faça você mesmo: de mensal para anual, taxa anual = (1 + taxa mensal)^12 - 1. De anual para mensal, taxa mensal = (1 + taxa anual)^(1/12) - 1. Sempre com a taxa em decimal (1% = 0,01). É juros compostos, não multiplicação simples por 12.",
  },
  rescisao: {
    title: "Rescisão (demissão)",
    tag: "Simulador",
    body: "Na demissão sem justa causa você recebe as verbas rescisórias (saldo de salário, aviso prévio, 13º e férias proporcionais), saca o FGTS e ainda ganha a multa de 40% sobre ele. A gente soma tudo e aplica os descontos no que é tributado. Lembra que o aviso prévio e as férias proporcionais saem livres de imposto.",
    technical:
      "Faça você mesmo: saldo = salário/30 x dias trabalhados no mês. Aviso prévio = 30 dias + 3 por ano (teto 90), indenizado e isento. 13º proporcional = salário/12 x meses (tributado em separado). Férias proporcionais = salário/12 x meses x 4/3 (indenizadas, isentas). FGTS: saldo acumulado (~8% do salário por mês) + multa de 40%. Só o saldo de salário e o 13º pagam INSS e IR.",
  },
  "clt-vs-pj": {
    title: "CLT ou PJ?",
    tag: "Simulador",
    body: "Compara o que sobra no fim do mês como CLT e como PJ. No lado CLT a gente desconta INSS e IR, e dá pra somar FGTS, 13º e férias pra comparar de igual pra igual. No PJ depende do regime: o MEI paga um valor fixo por mês, e no Simples (ME) o imposto incide sobre o faturamento, ainda saindo o pró-labore e o contador.",
    technical:
      "MEI: DAS fixo (R$ 76,90 a R$ 81,90 em 2025), teto de R$ 81 mil/ano. Simples: imposto = faturamento x alíquota efetiva do anexo, sendo a efetiva = (RBT12 x nominal − dedução) / RBT12. Fator R = pró-labore ÷ faturamento; ≥ 28% cai no Anexo III (mais barato), senão Anexo V. O pró-labore paga INSS 11% (teto) + IRRF; o lucro distribuído é isento. Estimativa: contador e encargos variam.",
  },
  "clt-vs-pj-clt": {
    title: "Lado CLT: como calculamos",
    tag: "Cálculo",
    body: "Partimos do salário bruto e tiramos INSS e Imposto de Renda pra chegar no líquido, o que cai na conta. Ligue 'Com benefícios' pra somar o que o CLT te dá além do salário (FGTS, 13º, um terço de férias) e comparar de igual pra igual com o PJ. Juntos, esses benefícios valem cerca de 19% a mais sobre o bruto.",
    technical:
      "Benefícios somados (valor mensal equivalente): FGTS = 8% do salário; 13º = 1/12 (~8,33%); 1/3 de férias = 1/36 (~2,78%). Juntos, cerca de 19,1% a mais sobre o bruto. Dependentes reduzem o IR. Não inclui vale-transporte, vale-refeição nem plano de saúde (variam por empresa).",
  },
  "clt-vs-pj-pj": {
    title: "Lado PJ: como calculamos",
    tag: "Cálculo",
    body: "Depende do regime. O MEI paga um valor fixo por mês (o DAS) e tem teto de faturamento. No Simples (ME), o imposto é uma fatia do faturamento que cresce por faixa, e ainda saem o pró-labore (que paga INSS e IR) e o contador. O ponto que confunde: faturamento não é lucro. Se você revende produto, só fica com a margem, então informe os custos do negócio pra ver o que sobra de verdade. Em serviço, o custo costuma ser zero, porque você vende a sua hora.",
    technical:
      "MEI: DAS fixo de R$ 76,90 a R$ 81,90 (2025) conforme a atividade; teto de R$ 81 mil/ano. Simples: imposto = faturamento x alíquota efetiva do anexo. Fator R = pró-labore ÷ faturamento; ≥ 28% cai no Anexo III (mais barato), senão Anexo V. O pró-labore paga INSS 11% (até o teto) + IRRF; o lucro que sobra é distribuído isento de IR. Mexa no pró-labore, no anexo e no contador pra ver o efeito.",
  },
  "margem-markup": {
    title: "Margem e markup",
    tag: "Simulador",
    body: "Pensa num restaurante: o prato custa R$ 10 de ingredientes e é vendido por R$ 30, então sobram R$ 20. A margem olha pro preço (R$ 20 são 67% dos R$ 30) e nunca passa de 100%. O markup olha pro custo (R$ 20 são 200% dos R$ 10) e pode passar fácil. É o mesmo lucro, duas réguas. Confundir os dois faz errar o preço.",
    technical:
      "Faça você mesmo: com custo e preço, lucro = preço − custo; margem = lucro ÷ preço; markup = lucro ÷ custo. Pra achar o preço por uma margem desejada: preço = custo ÷ (1 − margem). Por markup: preço = custo x (1 + markup). Markup de 150% equivale a margem de 60%.",
  },
  ebitda: {
    title: "EBITDA",
    tag: "Simulador",
    body: "Pensa no seu restaurante: entraram R$ 100 de vendas no mês. Tire os ingredientes (custos) e o aluguel, a luz e o salário (despesas da operação). O que sobra é o EBITDA: o caixa que a cozinha gera sozinha. Ainda não é o lucro no seu bolso, porque faltam os juros de empréstimo, os impostos e o desgaste dos equipamentos.",
    technical:
      "Faça você mesmo: EBITDA = receita − custos diretos − despesas operacionais. Margem EBITDA = EBITDA ÷ receita. Referência de saúde (varia por setor): negativa = no vermelho; até 10% = apertada; de 10% a 25% = saudável; acima de 25% = ótima. Não é o lucro líquido no seu bolso: depois ainda saem juros de empréstimos, impostos e a depreciação de equipamentos.",
  },
  "valor-hora": {
    title: "Valor da sua hora",
    tag: "Simulador",
    body: "Pega sua renda do mês e divide pelas horas que você trabalha pra mostrar quanto vale uma hora sua. Vira uma régua prática: dá pra saber na hora se um freela, uma hora extra ou recusar um trabalho compensa. Use a renda líquida, o que sobra de fato, pra a conta ser honesta.",
    technical:
      "Faça você mesmo: horas no mês = horas por semana x (52 ÷ 12), ou seja, horas x 4,33. Valor da hora = renda mensal ÷ horas no mês. Valor do dia útil = renda ÷ 22. Use a renda líquida (o que sobra de fato) pra a régua ficar honesta.",
  },
  "meta-investimento": {
    title: "Meta de investimento",
    tag: "Simulador",
    body: "É o caminho contrário do juros compostos: em vez de 'quanto isso vira', responde 'quanto preciso guardar por mês' pra chegar numa meta no prazo. Ex.: pra juntar R$ 40 mil de entrada em 4 anos, ele mostra o aporte mensal exato. Bom pra planejar entrada de imóvel, intercâmbio ou aposentadoria.",
    technical:
      "Faça você mesmo: aporte mensal = (meta − inicial x (1 + i)^n) ÷ (((1 + i)^n − 1) ÷ i), com i = (1 + taxa anual)^(1/12) − 1 e n = anos x 12. Se o valor inicial já cresce até a meta no prazo, o aporte necessário é zero.",
  },
  "onde-rende-mais": {
    title: "Onde rende mais?",
    tag: "Simulador",
    body: "Compara as três aplicações mais comuns pelo que sobra de verdade, ou seja, depois do imposto. A poupança é isenta mas rende pouco; CDB e Tesouro Selic pagam IR mas costumam render mais. No fim, o que importa é o que cai no seu bolso, não a taxa anunciada.",
    technical:
      "Faça você mesmo: poupança = 0,5% ao mês (regra com Selic acima de 8,5% a.a.), isenta de IR. CDB = % do CDI, com IR regressivo sobre o rendimento (22,5% até 180 dias, 20% até 360, 17,5% até 720, 15% acima). Tesouro Selic ~ 100% do CDI, mesmo IR, mais custódia de 0,2% a.a. da B3.",
  },
  "avista-parcelado": {
    title: "À vista ou parcelado?",
    tag: "Simulador",
    body: "Vale pegar o desconto à vista ou parcelar sem juros e deixar o dinheiro rendendo? A gente traz cada parcela pra valor de hoje (porque R$ 100 daqui a um ano valem menos que R$ 100 hoje) e compara com o preço à vista. O menor dos dois, em valor de hoje, é a melhor escolha.",
    technical:
      "Faça você mesmo: preço à vista = preço cheio x (1 - desconto). Valor presente do parcelado = soma de cada parcela ÷ (1 + i)^k, com i = taxa mensal do seu investimento e k o número do mês. Se o à vista custa menos que esse valor presente, pague à vista; senão, parcele e invista o dinheiro.",
  },
  "meta-quitar": {
    title: "Meta de quitacao de divida",
    tag: "Meta",
    body: "Acompanha o quanto do saldo de uma divida ja foi eliminado em relacao ao valor original. O progresso sobe a cada mes que voce paga parcelas ou faz amortizacoes extras. A previsao de quitacao usa a projecao da parcela atual sobre o saldo restante, descontando os juros do caminho.",
    technical:
      "Progresso = (saldo inicial - saldo atual) / saldo inicial. ETA em meses: resolva saldo x (1 + i)^n - parcela x ((1 + i)^n - 1) / i = 0 para n, com i = taxa mensal e parcela = valor corrente. Se a parcela for menor que os juros do mes, o saldo cresce e o horizonte e indefinido.",
  },
  "meta-reserva": {
    title: "Meta de reserva de emergencia",
    tag: "Meta",
    body: "Mede quantos meses de custo fixo a sua reserva atual cobre em relacao ao alvo que voce definiu. O progresso avanca conforme voce deposita na reserva com seu saldo livre mensal. A previsao de conclusao e calculada pelo ritmo do seu aporte.",
    technical:
      "Alvo em centavos = custo fixo mensal x meses de meta. Progresso = reserva atual / alvo. ETA = (alvo - reserva atual) / aporte mensal (saldo livre). Rendimento da reserva e ignorado de proposito pra ser conservador; inclui-lo aceleraria marginalmente o prazo.",
  },
  "meta-juntar": {
    title: "Meta de poupanca (juntar um valor)",
    tag: "Meta",
    body: "Acompanha o acumulo em direcao a um valor especifico, como entrada de imovel ou viagem. O saldo pode crescer por aportes manuais ou por uma reserva vinculada. A previsao leva em conta juros compostos sobre o saldo existente mais os aportes futuros.",
    technical:
      "Progresso = saved / target. ETA: resolva target = saved x (1 + i)^n + aporte x ((1 + i)^n - 1) / i para n, com i = taxa mensal real e aporte = saldo livre. Se nao ha aporte e o saldo ja esta abaixo do alvo sem crescimento projetado, o horizonte e indefinido.",
  },
  "meta-independencia": {
    title: "Meta de independencia financeira",
    tag: "Meta",
    body: "Aponta a distancia entre seu patrimonio investido atual e o patrimonio-alvo calculado pela regra dos 4%, que garante renda passiva vitalicia cobrindo seu custo de vida. O progresso sobe conforme seu patrimonio cresce. A previsao projeta acumulacao com aportes e juros compostos.",
    technical:
      "Alvo = custo anual / 0,04 (regra dos 4%). Progresso = patrimonio atual / alvo. ETA: resolva alvo = atual x (1 + i)^n + aporte x ((1 + i)^n - 1) / i para n, com i = (1 + taxa real anual)^(1/12) - 1. Taxa real de referencia: 4% a.a. acima da inflacao (CDI historico).",
  },
} as const;

export type HowItWorksTopic = keyof typeof TOPICS;
export type HowItWorksVariant = "chip" | "brand" | "plain";

export interface HowItWorksSheetProps {
  topic: HowItWorksTopic;
  triggerClassName?: string;
  variant?: HowItWorksVariant;
}

const TRIGGER_CLASSES: Record<HowItWorksVariant, string> = {
  chip: "focus-ring inline-flex items-center gap-1.5 rounded-full bg-white/20 px-2.5 py-1 text-[0.6875rem] font-semibold text-current backdrop-blur-sm transition-colors hover:bg-white/30",
  brand:
    "focus-ring inline-flex items-center gap-1.5 rounded-full border border-[color:var(--border-soft)] bg-[color:var(--surface-3)] px-2.5 py-1 text-[0.6875rem] font-semibold text-[color:var(--color-brand-800)] backdrop-blur-md transition-colors hover:bg-[color:var(--surface-1)]",
  plain:
    "focus-ring inline-flex items-center gap-1 text-[0.75rem] font-semibold text-[color:var(--color-brand-800)] underline-offset-2 hover:underline",
};

export function HowItWorksSheet({
  topic,
  triggerClassName,
  variant = "chip",
}: HowItWorksSheetProps) {
  const data = TOPICS[topic];
  const triggerClass = `${TRIGGER_CLASSES[variant]} ${triggerClassName ?? ""}`.trim();
  const showIcon = variant !== "plain";

  return (
    <Sheet>
      <SheetTrigger asChild>
        <button type="button" className={triggerClass} aria-label={`Como funciona ${data.title}`}>
          {showIcon ? <HelpCircle size={12} strokeWidth={2.5} aria-hidden /> : null}
          Como funciona
        </button>
      </SheetTrigger>

      <SheetContent side="bottom" className="px-6 pb-8 pt-3">
        <div
          className="mx-auto mb-5 h-1 w-10 rounded-full bg-[color:var(--border-strong)] md:hidden"
          aria-hidden
        />

        <SheetHeader className="gap-3">
          <span className="inline-flex w-fit items-center gap-1.5 rounded-full bg-[color:var(--color-brand-500)]/[0.14] px-2.5 py-1 text-[0.625rem] font-bold uppercase tracking-[0.6px] text-[color:var(--color-brand-800)]">
            <Sparkles size={11} strokeWidth={2.25} aria-hidden />
            {data.tag}
          </span>
          <SheetTitle>{data.title}</SheetTitle>
        </SheetHeader>

        <SheetDescription className="mt-3 text-[0.875rem] leading-relaxed text-[color:var(--text-primary)]">
          {data.body}
        </SheetDescription>

        {data.technical ? (
          <div className="mt-5 rounded-2xl border border-[color:var(--border-soft)] bg-[color:var(--surface-2)] p-4">
            <div className="mb-1.5 text-[0.625rem] font-bold uppercase tracking-[0.6px] text-[color:var(--color-brand-800)]">
              Para quem quer detalhe técnico
            </div>
            <p className="text-[0.8125rem] leading-relaxed text-[color:var(--text-secondary)]">
              {data.technical}
            </p>
          </div>
        ) : null}
      </SheetContent>
    </Sheet>
  );
}
