# Estratégia de Receita: o que move o ponteiro do Sabor Financeiro

Documento de decisão. Baseado em auditoria real da plataforma (maio/2026), não em achismo.
Objetivo: sair do "produto pronto" para "produto que vende e retém".

---

## 1. A verdade sobre o modelo (o gargalo de verdade)

O Sabor Financeiro é um rastreador **macro mensal** (patrimônio, dívida, renda). Isso tem um inimigo estrutural: **baixa frequência natural de uso**.

O usuário entra, preenche os números uma vez, e some. Sem motivo pra voltar:

- Não percebe valor recorrente.
- Não vê progresso.
- Cancela o Pro (ou nem assina).
- Não indica pra ninguém.

> O problema de dinheiro **não é falta de ferramentas**. É o **loop de retorno mensal**. Resolver isso é o que faz a assinatura valer R$ 19,90/mês.

Conclusão direta: adicionar mais simuladores **não move o ponteiro**. Ninguém assina recorrência pra rodar uma calculadora duas vezes.

---

## 2. As 3 alavancas que fazem dinheiro (em ordem)

### Alavanca 1: Prescrição, não diagnóstico (MAIOR alavanca)

Hoje a home mostra **diagnóstico**: saldo livre, % de renda comprometida. Leigo **não paga por diagnóstico**. Paga por **decisão**: "o que eu faço agora?".

A matemática já existe (quitação, snowball/avalanche, pagamento extra). Mas está escondida num menu `/simular` que o próprio usuário admite nunca ter testado.

**A jogada:** puxar essa matemática pra dentro da home como conselho automático e ranqueado.

> "Quite o cartão Nubank primeiro. Você economiza R$ 1.240 em juros e 4 meses."

Isso transforma um simulador raso e ignorado no **conselheiro central, sempre ligado**. Mesmo código, valor 10x maior. É o que converte free em Pro.

### Alavanca 2: Progresso visível (gráfico de evolução)

A linha do tempo hoje é uma lista de meses sem gráfico (não há lib de gráfico instalada).

O gancho emocional de um rastreador macro é **ver a linha andar** ("tô melhorando?"). Um gráfico de patrimônio líquido / dívida ao longo dos meses gera:

- Motivo pra voltar todo mês (loop de retorno).
- Momento "print e compartilha" (sua perna de distribuição).

### Alavanca 3: Integridade do Pro (conteúdo) - RISCO ATIVO

A Trilha de conteúdo hoje é só rótulos ("building", "queued"). Zero módulo jogável, 1 pergunta de diagnóstico. **Mas está travada atrás do Pro e vendida na proposta.**

Você está vendendo sala vazia pros 6 pagantes atuais + o lote do lançamento. Risco de reembolso, churn e reputação.

**Decisão obrigatória agora**, escolha uma:

- Entregar **uma** trilha completa de verdade ("Sair do vermelho", 3 módulos com conteúdo real), OU
- **Remover** conteúdo da copy de venda do Pro até existir de fato.

### Gatilho de retorno: resumo mensal (push, já é Pro)

Notificação "seu mês fechou, veja o que mudou e seu próximo passo". Baixo esforço, é o disparo que traz o usuário de volta. Liga as 3 alavancas acima.

---

## 3. O funil free → Pro (onde o dinheiro entra)

Usa só o que **já está codado**:

1. **Topo:** usuário cria conta grátis, preenche os números.
2. **Valor grátis:** vê saldo livre + % comprometida (diagnóstico). De graça.
3. **A parede:** "Qual dívida quitar primeiro e quanto você economiza?" → **Pro**.
4. **Pro entrega:** prescrição (matemática do simulador na home) + gráfico de evolução + resumo mensal por push.

A parede cai exatamente no momento de maior dor. O usuário já viu o problema (diagnóstico grátis); o Pro vende a **saída**.

---

## 4. Tráfego pago

Regra de criativo: **sem rosto do fundador** (preferência registrada). Tudo faceless: gravação de tela do app, mockups, texto na tela, voz off opcional.

### Canal A: Google Search (maior intenção, comece aqui)

O simulador + prescrição batem com buscas de **alta intenção de compra**. Quem busca isso quer resolver AGORA:

- "qual dívida pagar primeiro"
- "como sair das dívidas"
- "vale a pena financiar carro" / "vale a pena comprar parcelado"
- "snowball ou avalanche"
- "quanto tempo pra quitar meu cartão"

CAC tende a ser mais baixo aqui porque a pessoa já tem o problema formado. Landing dedicada por busca (não joga todo mundo na home genérica).

### Canal B: Meta Ads (Instagram/Facebook, escala)

Público leigo brasileiro vive aqui. Formato: Reels com gravação de tela + estático carrossel.

Ângulos de criativo (lidere com a **pergunta/dor específica**, nunca com "controle suas finanças"):

- "Você sabe qual das suas dívidas tá te roubando mais? A maioria quita a errada primeiro."
- "Financiar esse carro custa o triplo. Veja o número antes de assinar."
- "Sobrou R$ 500 no fim do mês. Pagar dívida, guardar ou investir? Tem resposta certa."
- "Seu patrimônio cresceu ou encolheu esse mês? A maioria não faz ideia."

### Opção de topo de funil: calculadora pública (sem login)

Uma ferramenta grátis e pública ("Qual dívida quitar primeiro?") como landing de tráfego pago. Entrega valor instantâneo, depois: "Salve seu plano e acompanhe todo mês → crie sua conta". Funil clássico de SaaS, CAC baixo. Avaliar como fase 2.

---

## 5. O CTA

### No anúncio (ad-level)

CTA = **a pergunta + a promessa de resposta imediata e grátis**. Não "assine", não "controle suas finanças".

- "Descubra qual dívida quitar primeiro. Grátis."
- "Veja seu plano de saída em 2 minutos."
- "Vale a pena? Veja o número antes de comprar."

### No app (conversão free → Pro)

CTA na parede do paywall = **a decisão, não a feature**:

- "Ver qual dívida quitar primeiro" (não "Desbloquear simulador")
- "Ver meu plano de quitação" (não "Assinar Pro")
- "Quanto eu economizo?" como botão

> Regra de ouro: o botão vende o **resultado** (a decisão, a economia, o número), nunca o nome do recurso.

---

## 6. Economia do funil (pra de fato fazer dinheiro)

R$ 19,90/mês exige **CAC baixo**. Contas simples pra calibrar:

- Se o usuário fica em média 6 meses → LTV ≈ R$ 119.
- CAC alvo saudável ≤ 1/3 do LTV → mira em **CAC ≤ R$ 40**.
- Opção lifetime ajuda o fluxo de caixa no curto prazo (entrada cheia), mas não constrói receita recorrente. Use lifetime como **gatilho de escassez no lançamento**, não como motor de longo prazo.

Por isso retenção (Alavancas 1, 2 e gatilho de resumo mensal) é o que faz o LTV subir e a conta de tráfego fechar. **Tráfego pago sem loop de retorno = queimar dinheiro.**

---

## 7. O que NÃO fazer

- ❌ Mais simuladores / mais ferramentas. Ninguém assina por quantidade de calculadora.
- ❌ Rastreio de transação individual / micro. Quebra o posicionamento macro (seu fosso).
- ❌ Mais CRUD de entidade.
- ❌ Polir o simulador "pelo simulador". Só vale se virar prescrição na home.
- ❌ Vender conteúdo que não existe.
- ❌ Ligar tráfego pago antes de ter loop de retorno + integridade do Pro.

---

## 8. Próximo passo concreto

Ordem recomendada de execução:

| # | Move | Por quê | Esforço |
|---|------|---------|---------|
| P0 | Resolver integridade do conteúdo (1 trilha real OU tirar da copy) | parar de vender sala vazia | médio / baixo |
| P1 | Prescrição na home (matemática do simulador como conselho automático) | diagnóstico vira decisão, converte free→Pro | médio |
| P1 | Gráfico de evolução do patrimônio na linha do tempo | loop de retorno + momento de print | médio |
| P2 | Push de resumo mensal (já é Pro) | o gatilho de volta | baixo |
| Depois | Ligar tráfego pago (Google Search primeiro, Meta na sequência) | só depois do loop pronto | -- |

**Pick:** começar pela **Alavanca 1 (prescrição na home)**. Maior alavanca, reusa código existente, conserta o "simulador que nunca testei" transformando a matemática no produto, e cria a parede de conversão do funil.
