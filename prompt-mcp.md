# Prompt: implementar MCP server + camada de permissões no sf-platform

## Contexto e objetivo
O sf-platform (SaborFinanceiro) é um app de organização e educação financeira já em produção. Queremos expor as capacidades do app como um MCP server remoto, para que o usuário conecte o assistente de IA que ele já usa (Claude, ChatGPT, OpenClaw, Cursor, Gemini, qualquer cliente MCP) e consiga consultar e operar a própria vida financeira por linguagem natural: ver saldo, lançar transação, registrar dívida/empréstimo, gerar relatório, etc.

A entrada manual de dados é a maior fricção do produto. O MCP transfere essa fricção (e o custo de inferência) para o assistente que o usuário já paga, enquanto o app continua sendo o sistema de registro: dados, regras de anomalia, recomendações, educação financeira e conquistas vivem no app.

## Antes de codar
1. Explore o repositório e identifique o stack real, a estrutura de módulos, a camada de auth, a camada de acesso a dados, o padrão de tratamento de erro e a convenção de testes. Conforme a TUDO isso. Não introduza padrão novo se já existe equivalente no projeto.
2. Produza um plano curto antes de implementar em volume, listando os módulos que vai criar/editar e as decisões em aberto.

## Princípio de segurança inegociável
Autorização e enforcement vivem 100% no servidor, nunca no cliente nem no LLM. Trate qualquer cliente MCP e qualquer LLM como não-confiável. A confirmação que o cliente exibe é UX, não é controle.

## Escopo da implementação

### 1. MCP server remoto
- Transporte remoto (HTTP/SSE) compatível com clientes MCP, para conectar como connector externo, não apenas stdio local.
- Auth via OAuth 2.1 com permissões escopadas. Grant por usuário e por conexão, armazenado no servidor.
- Revogação imediata: o grant é checado no servidor a cada chamada, contra o estado atual. NÃO use token longo stateless que confie em si mesmo. Use token de vida curta mais tabela de grant server-side. Se o usuário rebaixar ou revogar no meio da sessão, a próxima tool já respeita.
- Toda invocação de tool logada e auditável: qual cliente/agente, qual grant, o que mudou (antes/depois), se é reversível. Esse audit é também o mecanismo de undo e o artefato de confiança exibido ao usuário.

### 2. Tools, agrupadas por recurso, read-first
- Exponha primeiro leitura: saldo/contas, transações, dívidas, empréstimos, metas, relatórios, anomalias/recomendações, conquistas, etc.
- Escrita e delete existem, mas só atuam quando o escopo permitir.
- Escopos granulares por recurso e verbo (ex: `transactions:read`, `transactions:write`, `debts:write`, `debts:delete`, `reports:read`), nunca um toggle global read/write/delete.
- Defense in depth: se a conexão é read-only, as tools de escrita/delete nem aparecem na lista daquela conexão, E o servidor revalida o escopo em toda chamada. Ao negar, a tool retorna erro claro de permissão para o LLM.

### 3. Ritual de confirmação, escalonado pelo raio de explosão
- Obrigatório e enforced no servidor para: delete, operação em massa, qualquer coisa irreversível, valor acima de um limite configurável, e qualquer mudança nas próprias permissões/integrações.
  - Implemente como two-phase: a tool destrutiva não executa de imediato, retorna um preview do que será afetado mais um token de confirmação de vida curta amarrado àquela operação exata, e só executa na segunda chamada com o token.
  - Ofereça também o caminho out-of-band: a mutação fica pendente e o usuário aprova dentro do app (tela de ações pendentes / push). Use out-of-band para o de maior valor ou risco.
- Sem ritual: escrita única, baixo valor e reversível (ex: lançar uma transação). Para essas, em vez de confirmação, garanta soft-delete, audit e undo barato.

### 4. Correção do dado (separada de permissão)
- Permissão impede ação não autorizada. NÃO impede valor errado autorizado (LLM alucina valor/data ao "adicionar empréstimo").
- Toda tool de escrita: schema estrito com validação, e devolve a estrutura parseada para confirmação antes de gravar qualquer dado financeiramente material, independente do escopo.
- Idempotência: chave de idempotência em toda escrita (o LLM repete e duplica chamada). Siga o padrão de idempotência que já existir no projeto.

### 5. Tela de permissões / "Integrações" no app
Crie a área nas configurações (nome sugerido "Integrações", ajuste ao vocabulário do app) onde o usuário:
- Conecta e gerencia clientes de IA: iniciar conexão OAuth, ver conexões ativas, revogar na hora.
- Concede e revoga escopos granularmente por conexão.
- Vê o log de auditoria do que a IA fez, com filtro e undo onde aplicável.
- Aprova ou recusa ações pendentes (out-of-band).

Use o design system e os componentes já existentes no projeto.

### 6. Superfícies de propagação (anunciar que temos isso)
Edite os pontos do produto para anunciar e habilitar a capacidade MCP:
- Ponto de entrada in-app para "Integrações" (menu/config).
- Seção na landing/marketing existente: conecte seu Claude, ChatGPT, OpenClaw ou qualquer assistente de IA e cuide das finanças por conversa. Liste os clientes compatíveis e deixe explícito que é via MCP (padrão aberto, conecta em qualquer assistente compatível).
- Guia de conexão (doc/página): passo a passo para conectar em Claude, ChatGPT e OpenClaw, escopos disponíveis e o que cada um permite.
- Não invente claims de segurança que o código não sustenta. Descreva exatamente o modelo implementado: OAuth escopado, confirmação em ações destrutivas, audit e revogação imediata.

## Restrições de processo
- NÃO faça commit, push, nem abra PR. Deixe tudo no working tree para revisão manual.
- NÃO rode migration contra banco real ou produção. Gere os arquivos de migration mas não aplique. Sinalize claramente o que precisaria rodar.
- NÃO toque em config de produção, secrets, nem em dados reais.
- Inclua testes seguindo o padrão de testes do projeto, cobrindo principalmente o enforcement de escopo e o fluxo de confirmação two-phase.
- Implemente em blocos lógicos e, ao final, entregue um resumo: o que foi criado/editado, o modelo de escopo e confirmação implementado, migrations pendentes, e as decisões que precisam da minha revisão.
- Priorize segurança e conformidade com os padrões do projeto acima de velocidade.