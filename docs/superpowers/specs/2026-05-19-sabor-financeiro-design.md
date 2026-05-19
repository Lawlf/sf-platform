# Sabor Financeiro, Design Spec v0.1

**Date:** 2026-05-19
**Status:** Draft for review
**Domain:** saborfinanceiro.com.br
**Repo:** github.com/Sabor-Financeiro/sf-platform
**Author:** Brainstorm session output

## 1. Visão & Escopo MVP

### 1.1 Tese de produto

Sabor Financeiro é um "Financial Health OS" brasileiro com lente macro. O produto NÃO foca em tracking centavo a centavo (gasto-de-mercado-de-50-reais), terreno já saturado por Mobills, Organizze, GuiaBolso e pelos próprios apps de banco. O foco é o que essas plataformas não entregam: clareza sobre o impacto real de dívidas (financiamento, empréstimo, rotativo, cheque especial), projeção de quitação, fluxo de caixa mensal e linha do tempo do patrimônio líquido.

Premissa: o brasileiro médio sangra em juros compostos (rotativo de cartão, cheque especial, parcelamento de fatura, financiamento longo) e não enxerga o tamanho do buraco. Banco mostra saldo, não mostra trajetória nem custo real. Sabor Financeiro entrega essa lente.

### 1.2 Cobertura v0.1

- Cadastro de renda (salário recorrente, freelas, extras one-off).
- Cadastro de dívidas em quatro categorias: financiamento (imóvel ou veículo, Price ou SAC), empréstimo pessoal ou consignado, cartão de crédito (fatura, parcelamento e rotativo), cheque especial e dívida bancária avulsa.
- Dashboard com: fluxo de caixa mensal, total de dívidas, CET médio ponderado, percentual de renda comprometida, projeção de "data de quitação no ritmo atual".
- Simuladores: "e se eu pagar mais R$ X por mês?", "qual ordem de quitação rende mais?" (snowball vs avalanche).
- Linha do tempo do patrimônio líquido (renda menos dívidas) atualizada a cada lançamento e a cada virada de mês.
- Conteúdo contextual: micro-lição vinculada ao estado real do usuário (detecta rotativo ativo, ensina o custo do rotativo; detecta financiamento Price longo, ensina diferença Price/SAC e impacto de amortização extra).
- Landing pública.
- Área logada do usuário (PWA instalável, mobile-first).
- Painel administrativo (gerenciar conteúdo, ver métricas, gerenciar usuários).
- Auth: magic link (email com botão e código de 6 dígitos), Google OAuth, Apple OAuth.

### 1.3 Fora de escopo v0.1

- Investimentos (CDB, Tesouro, poupança, fundos). Entra em v0.2.
- Open Finance sync automático com bancos. Entra em v0.3+ por peso regulatório.
- App nativo iOS ou Android nas lojas. PWA cobre v0.1.
- IA ou LLM insights. Entra em v0.2 como feature Pro.
- Pagamento e assinatura. Produto fica grátis em v0.1 para validar tração. Schema reserva campo `plan` para Free vs Pro futuro.
- Multi-usuário ou orçamento familiar.
- Multi-moeda (BRL only).
- Internacionalização (PT-BR only).
- Notificações push (manifest fica configurado, lógica de scheduling vai pra v0.1.1 ou v0.2).

### 1.4 Métricas de sucesso v0.1

- D7 retention acima de 25% (usuário volta na semana seguinte ao cadastro).
- Pelo menos 60% dos cadastrados registram ao menos 1 dívida.
- NPS qualitativo positivo em entrevistas com os 10 primeiros usuários ativos.

## 2. Arquitetura & Stack

### 2.1 Modelo de deploy

Monolito Next.js 15 em uma única codebase. Backend "temporário" é entregue por Route Handlers e Server Actions do próprio Next.js, mas estruturado de forma hexagonal desde o dia 1. Quando o produto precisar extrair backend standalone (NestJS ou outro), troca-se apenas a camada de presentation. Domain, application e infrastructure são portáveis.

Três superfícies, um codebase:

- `/(public)` rotas públicas (landing, sign-in, sign-up, páginas estáticas).
- `/(app)` área logada do usuário (PWA installable).
- `/(admin)` painel administrativo (role-gated).

### 2.2 Estrutura de pastas

```
src/
  domain/                      # núcleo, zero deps de framework
    entities/                  # Debt, Income, User, FinancialSnapshot, ContentLesson
    value-objects/             # Money, InterestRate, Period, AmortizationSchedule
    services/                  # cálculos puros: Price, SAC, CET, payoff projector, snowball/avalanche
    ports/                     # interfaces: IDebtRepository, IIncomeRepository, IAuthService, IOAuthProvider, IEmailService, IClock
  application/                 # casos de uso, orquestração
    use-cases/
      auth/
      onboarding/
      income/
      debt/
      simulation/
      dashboard/
      content/
      admin/
    dtos/
  infrastructure/              # adapters concretos
    persistence/
      drizzle/
        schema/                # schemas Drizzle: users, sessions, magic_link_tokens, oauth_accounts, debts, incomes, snapshots, content_lessons, content_impressions
        repositories/          # DrizzleDebtRepository implements IDebtRepository, etc.
        client.ts              # cliente Drizzle + pool
    auth/
      session-auth.service.ts
      magic-link.service.ts
      google-oauth.provider.ts
      apple-oauth.provider.ts
    email/
      resend-email.service.ts
      templates/               # React Email
    rate-limit/
      upstash-rate-limiter.ts
    config/
  presentation/                # delivery layer (trocável)
    http/
      route-handlers/          # importados por app/api/*/route.ts
      validators/              # Zod schemas request/response
      mappers/                 # dto <-> entity
      middleware/
  shared/
    errors/                    # Result<T, E>, DomainError, ValidationError
    types/
    utils/
app/                           # Next.js App Router
  (public)/
    page.tsx                   # landing
    entrar/
    cadastrar/
    sobre/
    privacidade/
    termos/
  (app)/
    layout.tsx                 # bottom nav + auth guard
    app/
      page.tsx                 # dashboard
      onboarding/
      dividas/
      renda/
      simular/
      conteudo/
      perfil/
  (admin)/
    layout.tsx                 # admin shell + role guard
    admin/
      page.tsx
      usuarios/
      conteudo/
      metricas/
  api/
    auth/
    debts/
    incomes/
    simulations/
    content/
    admin/
public/
  manifest.webmanifest
  icons/                       # ícones PWA gerados a partir do logo existente
test/
  fixtures/
  helpers/
drizzle/
  migrations/
```

### 2.3 Princípios da arquitetura

- Domain não importa nada de fora. Zero deps de Next, Drizzle, Zod, React. TypeScript puro.
- Application só importa de domain.
- Infrastructure implementa ports de domain (repositories, services externos).
- Presentation traduz HTTP ou form data em chamadas de use case, e o retorno em HTTP response.
- Todo erro de domínio sobe via `Result<T, DomainError>` (estilo Lumis Commit).
- Domain services são puros e determinísticos. `Clock` é uma port, não `new Date()` direto.

### 2.4 Stack consolidada

| Camada             | Tecnologia                                                                                                  |
| ------------------ | ----------------------------------------------------------------------------------------------------------- |
| Framework web      | Next.js 15 (App Router, React 19 RSC), TypeScript strict                                                    |
| UI                 | Tailwind v4, shadcn/ui, lucide-icons                                                                        |
| Forms              | React Hook Form + Zod                                                                                       |
| Estado cliente     | Zustand (mínimo, só UI state)                                                                               |
| ORM                | Drizzle                                                                                                     |
| DB                 | Postgres via Supabase (DB only, sem usar Supabase Auth)                                                     |
| Auth               | Manual: magic link com Resend, Google OAuth PKCE, Apple OAuth PKCE, sessions DB-backed                      |
| Email transacional | Resend (free tier: 3000 emails/mês, 100/dia) + React Email                                                  |
| Rate limit         | Upstash Redis (free tier)                                                                                   |
| Validação          | Zod                                                                                                         |
| Testes             | Vitest (unit domain e application), Testcontainers Postgres (integration repos), Playwright (E2E)           |
| PWA                | Manifest + service worker via `@serwist/next` ou setup manual                                               |
| Observabilidade    | Pino logs estruturados, Sentry, Plausible self-hosted (analytics sem cookie), Vercel Analytics (Web Vitals) |
| Hospedagem web     | Vercel                                                                                                      |
| Hospedagem DB      | Supabase                                                                                                    |
| CI                 | GitHub Actions                                                                                              |

## 3. Modelo de Domínio & Casos de Uso

### 3.1 Entidades

```
User
  id, email (citext unique), email_verified_at?
  display_name, role: 'user' | 'admin', plan: 'free' | 'pro'
  created_at, updated_at, deactivated_at?, deactivation_reason?
  # Conta desativada NUNCA é deletada (retenção indefinida para LGPD/investigação).
  # Login bloqueado quando deactivated_at IS NOT NULL.

OauthAccount
  id, user_id, provider: 'google' | 'apple', provider_user_id
  unique (provider, provider_user_id)
  created_at

Session
  id_hash (sha256 do session id real), user_id
  expires_at, created_at, last_used_at, ip, user_agent

MagicLinkToken
  token_hash (sha256), code (6 dígitos numéricos), user_id?  (null se signup novo, criado on verify)
  email, expires_at (15 min), used_at?
  attempt_count (max 5)

Income
  id, user_id, label
  amount (Money), frequency: 'monthly' | 'weekly' | 'one_off'
  start_date, end_date?, is_active

Debt (discriminated union por kind)
  id, user_id, label, kind, status: 'active' | 'paid_off' | 'written_off'
  original_principal (Money), current_balance (Money)
  start_date, expected_end_date?, notes
  created_at, updated_at

  kind = 'financing'
    amortization_method: 'PRICE' | 'SAC'
    annual_interest_rate, term_months
    monthly_insurance?, monthly_admin_fee?

  kind = 'personal_loan'
    annual_interest_rate (ou cet_annual informado), term_months
    monthly_installment

  kind = 'credit_card'
    credit_limit, statement_day (1-31), due_day (1-31)
    current_statement (Money), revolving_balance? (Money), revolving_monthly_rate?
    installment_purchases: { description, total, installments_total, installments_remaining, monthly_value }[]

  kind = 'overdraft'
    bank_name, monthly_rate
    last_charge_date

DebtPayment
  id, debt_id, paid_at, amount (Money)
  principal_portion (Money), interest_portion (Money), is_extra (bool)

FinancialSnapshot   # gerado mensalmente (cron) ou on-demand
  id, user_id, as_of_date
  total_income (Money), total_debt_balance (Money), net_worth (Money)
  cet_weighted_average, income_committed_pct

ContentLesson
  id, slug, title, body_md, trigger_rules (jsonb), published_at?, created_at, updated_at

ContentImpression
  user_id, lesson_id, shown_at, dismissed_at?
  primary key (user_id, lesson_id)
```

### 3.2 Value Objects

- `Money`: amount em centavos (`bigint`) + currency `'BRL'`. Imutável. Métodos `add`, `subtract`, `multiply`, `divide`, `format`. Operações entre moedas diferentes lançam erro de domínio.
- `InterestRate`: valor + período (`monthly` | `annual`). Conversão monthly ↔ annual via juros compostos: `(1 + monthly)^12 = 1 + annual`.
- `Period`: start + end. Util `monthsBetween`, `daysBetween`, `contains(date)`.
- `AmortizationSchedule`: array de `{ month: number, installment: Money, principal: Money, interest: Money, remainingBalance: Money }`. Imutável. Total reconcilia com principal original.

### 3.3 Domain Services puros

- `PriceAmortizationService.generate({ principal, annualRate, termMonths }) -> AmortizationSchedule`
- `SacAmortizationService.generate({ principal, annualRate, termMonths }) -> AmortizationSchedule`
- `CetCalculatorService.compute({ principal, installments, fees }) -> InterestRate` (Newton-Raphson sobre fluxo de caixa)
- `DebtPayoffProjectorService.project({ debt, monthlyPayment, extraPayment? }) -> { payoffDate, totalInterest, schedule }`
- `PayoffStrategyService.compare({ debts, monthlyBudget }) -> { snowball: PayoffPlan, avalanche: PayoffPlan }`
- `RevolvingCostProjectorService.project({ balance, monthlyRate, monthsAhead }) -> Money[]`
- `FinancialHealthService.snapshot({ incomes, debts, asOf }) -> FinancialSnapshot`
- `IncomeCommittedService.compute({ totalMonthlyIncome, totalMonthlyDebtService }) -> Rate`

### 3.4 Use Cases v0.1

**auth/**

- RequestMagicLink, VerifyMagicLinkByToken, VerifyMagicLinkByCode
- SignInWithGoogle, SignInWithApple
- SignOut, ListSessions, RevokeSession

**account/**

- UpdateProfile, ExportMyData
- DeactivateAccount (seta `deactivated_at` + revoga todas as sessions; nunca deleta dados)

**onboarding/**

- StartAdaptiveOnboarding (3-4 perguntas: tem renda regular?, tem dívida?, sabe o que é CET?)
- CompleteOnboarding (salva perfil e roteia copy)

**income/**

- RegisterIncome, UpdateIncome, ArchiveIncome, ListIncomes

**debt/**

- RegisterDebt (overloads por kind)
- UpdateDebt, RecordPayment, ArchiveDebt
- ListDebts, GetDebtDetail (inclui amortization schedule gerado on-demand)

**simulation/**

- ProjectPayoff, SimulateExtraPayment, ComparePayoffStrategies

**dashboard/**

- GetFinancialOverview (cards-resumo + alertas)
- GetTimeline (snapshots passados + projeção próximos N meses)
- GetUpcomingDueDates

**content/**

- GetContextualLessons (avalia trigger rules contra estado do usuário)
- MarkLessonShown, MarkLessonDismissed

**admin/**

- ListUsers (paginado, com métricas agregadas)
- GetUserDetail
- CreateLesson, UpdateLesson, PublishLesson, UnpublishLesson, DeleteLesson
- GetPlatformMetrics (DAU, signup count, dívidas registradas por kind, simulações rodadas)

### 3.5 Trigger rules de conteúdo contextual

```ts
type TriggerRule =
  | { kind: "has_active_revolving" }
  | { kind: "income_committed_above"; threshold: number /* 0..1 */ }
  | { kind: "has_debt_of_kind"; debtKind: DebtKind }
  | { kind: "no_debts_registered" }
  | { kind: "no_income_registered" }
  | { kind: "cet_average_above"; threshold: number /* annual */ }
  | { kind: "all_of"; rules: TriggerRule[] }
  | { kind: "any_of"; rules: TriggerRule[] };
```

Admin cria lição no painel, escolhe regras via UI declarativa. App consulta lições aplicáveis a cada load do dashboard, ordena por relevância (rules mais específicas primeiro), exclui as já dismissadas pelo usuário.

## 4. UX & Visual

### 4.1 Princípios

- Mobile-first absoluto. Design parte de 360px de largura. Desktop é progressive enhancement.
- Bottom nav fixo na área logada com 5 slots: Início, Dívidas, Simular (FAB-like central), Conteúdo, Perfil.
- Onboarding adaptativo. 3-4 perguntas iniciais roteiam a experiência:
  - Iniciante recebe copy explicativa, glossário inline, lições proativas.
  - Intermediário recebe menos hand-holding e atalhos no dashboard.
- Entrada de dado em fluxo curto. Cadastrar dívida é wizard com 4 telas no máximo (tipo, valor e taxa, prazo, confirmação). Uma decisão por tela.
- Copy didática mas curta. Sem juridiquês bancário. "Juros que cresce em cima de juros" antes de "capitalização composta", com toggle pra ver o termo técnico.
- Sem dark patterns. Honestidade é o que constrói trust em produto financeiro.
- **Sem emojis em nenhuma parte da plataforma**. Nem em UI, copy, badges, conteúdo gerado pelo admin, notificações. Apenas ícones Lucide stroke clean.
- **Ícones usados estrategicamente, não em todo botão.** Regra base: ícone reforça reconhecimento em itens de navegação (bottom nav, breadcrumbs, links recorrentes), em ações de risco (excluir, sair) e em status (positivo, negativo, alerta). Botões de ação primária (CTA, "Continuar", "Cadastrar dívida", "Simular") são **texto puro**, sem ícone, para não competir com o label.
- **Alternância ícone vs palavra**: nunca ícone sozinho sem label acessível. Em superfícies compactas (mobile bottom nav, tabs), ícone + label curto. Em superfícies amplas (sidebar admin desktop), label puro com ícone opcional pequeno antes. Decisão por tela, não global.
- **Acessibilidade**:
  - Todo ícone significativo recebe `aria-label`. Ícone meramente decorativo recebe `aria-hidden="true"`.
  - Targets de toque mínimo 44x44px (Apple HIG e WCAG 2.2).
  - Foco visível em todo elemento interativo (`focus-visible:ring-2 ring-orange-500`).
  - Navegação completa por teclado (Tab, Shift+Tab, Enter, Esc).
  - Suporte a leitor de tela (NVDA, VoiceOver). Landmarks `<nav>`, `<main>`, `<aside>`, `<header>`. Headings em hierarquia (`h1` único por página).
  - `prefers-reduced-motion`: desabilita animações de glass, transições longas, parallax. Mantém só fades curtos.
  - `prefers-color-scheme`: suporte light/dark com toggle manual também.
  - Contraste mínimo WCAG AA (4.5:1 texto normal, 3:1 texto grande). Testado com plugin no Storybook ou Playwright.

### 4.2 Estilo visual

- **Glassmorphism**: superfícies translúcidas com `backdrop-filter: blur(20px)`, borda 1px sutil e sombra macia. Cards, bottom nav e modals usam vidro fosco. Performance no mobile é cuidado explícito (blur é GPU-pesado em Android médio, medir em devices reais).
- **Background base**: gradiente suave laranja para off-white em light mode, charcoal para preto em dark mode. O gradiente dá ao vidro algo pra filtrar; sem background colorido, glass vira só translucência sem efeito visual.
- **Ícones clean**: Lucide-icons, stroke 1.5-1.75, line style, sem fill pesado. Consistência total. Proibido: ícones coloridos, 3D, emoji-style, emoji unicode. Cada ícone usado tem propósito claro (ver §4.1: uso estratégico, não decorativo).
- **Hierarquia visual com vidro**:
  - Tier 1 (CTA, brand): laranja sólido, sem vidro.
  - Tier 2 (cards de conteúdo): vidro fosco + borda 1px laranja-suave ou white-alpha.
  - Tier 3 (chrome: bottom nav, header): vidro mais opaco com saturate boost.
- **Acessibilidade do glass**: texto sobre vidro com `background-color: rgba(...)` alpha ≥ 0.7 + blur. Nunca texto fino branco sobre vidro fino, contraste cai. WCAG AA mínimo em todos os pares de cor.

### 4.3 Paleta

| Token              | Cor       | Uso                                        |
| ------------------ | --------- | ------------------------------------------ |
| `brand-orange-500` | `#f28e25` | Brand, CTA primário, badges                |
| `brand-orange-600` | `#ef7a1a` | Hover do CTA, gradiente                    |
| `brand-orange-800` | `#ba5717` | Texto sobre fundo laranja claro, headlines |
| `positive`         | `#16a34a` | Saldo cresce, dívida cai, sucesso          |
| `negative`         | `#dc2626` | Rotativo, juros, dívida cresce, erro       |
| `charcoal-900`     | `#1f1d1c` | Fundo dark, texto principal light          |
| `off-white`        | `#fdf8f3` | Fundo light, texto principal dark          |

Tokens Tailwind a definir em `tailwind.config`:

- `glass-light`: `bg-white/60 backdrop-blur-xl border border-white/40`
- `glass-dark`: `bg-charcoal-900/60 backdrop-blur-xl border border-white/10`
- `glass-orange`: `bg-orange-500/15 backdrop-blur-xl border border-orange-500/30`

### 4.4 Bottom nav

```
┌───────────────────────────────────────┐
│                                       │
│         CONTEÚDO DA TELA              │
│                                       │
├───────────────────────────────────────┤
│ [home][wallet][ +  ][book][user]      │
│ Início Dívidas Simular Conteúdo Perfil│
└───────────────────────────────────────┘
```

Ícones Lucide propostos (apenas representação textual no diagrama; nunca emoji): `home`, `wallet`, `plus-circle` (slot central elevado, FAB-style), `book-open`, `user-round`. Slot central "Simular" é elevado porque simular cenário é a ação aspiracional do produto. Cada item tem `aria-label` PT-BR ("Ir para Início", "Ir para Dívidas", etc.); o ícone é decorativo (`aria-hidden`) e o label textual abaixo é o que o leitor de tela anuncia.

### 4.5 Mapa de telas v0.1

**Públicas:**

- `/` (landing)
- `/entrar` (magic link + Google + Apple)
- `/cadastrar` (mesmo fluxo unificado: se email existe, vira sign-in)
- `/verificar?token=...` (callback magic link)
- `/sobre`, `/privacidade`, `/termos`

**Logado:**

- `/app` (Dashboard)
- `/app/onboarding/[step]` (1-4 telas, só primeira sessão)
- `/app/dividas` (lista)
- `/app/dividas/nova` (wizard tipo)
- `/app/dividas/[id]` (detalhe + amortização + pagamentos)
- `/app/dividas/[id]/pagar`
- `/app/renda` (lista + add)
- `/app/simular` (hub)
- `/app/simular/quitacao`
- `/app/simular/extra`
- `/app/simular/estrategia`
- `/app/conteudo` (feed)
- `/app/conteudo/[slug]`
- `/app/perfil`
- `/app/perfil/conta`
- `/app/perfil/seguranca` (sessões ativas + revogar)

**Admin (role-gated):**

- `/admin` (overview)
- `/admin/usuarios`
- `/admin/usuarios/[id]`
- `/admin/conteudo` (CRUD lições)
- `/admin/conteudo/nova`
- `/admin/conteudo/[id]`
- `/admin/metricas`

### 4.6 Composição do dashboard `/app`

1. Header com saudação personalizada + status financeiro resumido em uma frase (ex.: "Você está no caminho" ou "Atenção: rotativo ativo está custando R$ X por mês").
2. Cards-resumo em scroll horizontal mobile: Renda mensal, Dívida total, % renda comprometida, CET médio ponderado, Data prevista de liberdade financeira.
3. Linha do tempo horizontal do patrimônio líquido, últimos 6 meses + projeção próximos 6.
4. Lições contextuais (1 ou 2 cards aplicáveis ao estado atual).
5. Próximos vencimentos (dívidas com pagamento previsto no mês).
6. CTA "Simular cenário" puxando para o hub `/app/simular`.

### 4.7 Componentes shadcn/ui customizados

`Button` (variants: primary laranja sólido, ghost vidro, destructive), `Card`, `Sheet` (drawer lateral), `Drawer` (bottom sheet pra detalhes rápidos), `Tabs`, `Accordion`, `Dialog`, `Form`, `Input`, `NumberInput` (máscara monetária BRL), `Slider`, `DatePicker`, `Chart` (Recharts ou Tremor), `Skeleton`, `Toast`.

## 5. Auth, Segurança & LGPD

### 5.1 Modelo de auth

Auth é manual, sem framework pesado. Bibliotecas usadas:

- Hashing: nenhum hash de senha (não há senha). Tokens são bytes random, armazenados como sha256.
- OAuth PKCE: `oslo` ou implementação direta com `crypto.subtle`.
- Cookies: `cookies()` nativo do Next.js 15.
- Sessions: tabela `sessions` no Postgres.

### 5.2 Fluxos

**Magic link:**

1. User digita email em `/entrar` ou `/cadastrar` (fluxo unificado).
2. POST `/api/auth/magic-link/request`. Server gera token (32 bytes random, base64url) e código (6 dígitos numéricos), armazena `sha256(token)` e o código em `magic_link_tokens`, expira em 15 min, single-use.
3. Resend envia email com botão "Entrar agora" (`https://saborfinanceiro.com.br/verificar?token=...`) e código grande visível ("Ou use este código: **482917**").
4. Cliente exibe tela "Digite o código que enviamos" e/ou aguarda navegação via link.
   5a. Clicou no link: `GET /verificar?token=X` (Route Handler em `app/verificar/route.ts`), valida hash, marca `used_at`, cria session, seta cookie, redireciona para `/app`. Em erro, redireciona para `/entrar?error=link_invalido`.
   5b. Digitou o código: `POST /api/auth/magic-link/verify-code` com `{ email, code }`, valida, mesmo final.
5. Se usuário não existia, cria registro em `users` com `email_verified_at = now()`.

**Google OAuth (PKCE):**

1. User clica "Entrar com Google" em `/entrar`.
2. Server gera `state` (random) e `code_verifier`, armazena em cookie temporário, redireciona para Google com `code_challenge` e `code_challenge_method=S256`.
3. Google redireciona de volta para `/api/auth/google/callback?code=...&state=...`. Server valida `state`, troca `code` por tokens via `code_verifier`.
4. Valida o ID token (JWT) contra JWKS do Google. Extrai `sub`, `email`, `email_verified`, `name`, `picture`.
5. Lookup em `oauth_accounts` por `(provider='google', provider_user_id=sub)`. Se existe, carrega user. Se não:
   - Busca user por email. Se existe, vincula novo `oauth_accounts` (com confirmação: pede para o usuário verificar email atual via magic link antes de vincular, para evitar account takeover).
   - Se não existe, cria user + oauth_accounts, `email_verified_at = now()` (Google já verificou).
6. Cria session, redireciona para `/app` (ou `/app/onboarding/1` se for primeiro login).

**Apple OAuth (PKCE):**

Mesmo fluxo do Google, com diferenças:

- Client secret é JWT assinado com chave privada P8 fornecida pela Apple. O JWT precisa ser regerado periodicamente (validade máxima 6 meses). Geração via job ou env handoff manual no início.
- Apple só retorna nome e email na primeira autorização. Captura imediata e persiste; logins seguintes só vêm `sub`.
- `email` pode ser "private relay" (`@privaterelay.appleid.com`); aceito normalmente.

### 5.3 Sessions

- Cookie: `sf_session`, atributos `HttpOnly`, `Secure` (prod), `SameSite=Lax`, `Path=/`, `Max-Age=30 dias`.
- Valor do cookie: 32 bytes random, base64url. Armazenado **hashed (sha256)** em `sessions.id_hash`.
- Lookup: hash o valor do cookie e busca por `id_hash`. Match valida, atualiza `last_used_at`.
- Renovação: sliding expiration, atualiza `expires_at = now() + 30d` a cada uso.
- Logout: deleta a linha.
- "Sair de todos os dispositivos": deleta todas as linhas do user.

### 5.4 CSRF

- Server Actions Next.js: proteção nativa via origin check e action ID não-determinístico. Confiar.
- Route Handlers que aceitam mutação via fetch: validar header `Origin` ou `Sec-Fetch-Site`.
- OAuth callback: validar `state` (CSRF + replay).

### 5.5 Rate limiting

- Backend: Upstash Redis com sliding window.
- Por endpoint:
  - `magic-link/request`: 3 por hora por email, 10 por hora por IP.
  - `magic-link/verify-code`: 5 tentativas por token. Após 5 falhas, invalida o token e força novo request.
  - `oauth/google/callback` e `oauth/apple/callback`: 20 por hora por IP.

### 5.6 Headers de segurança (middleware Next.js)

- `Strict-Transport-Security: max-age=31536000; includeSubDomains; preload`
- `X-Content-Type-Options: nosniff`
- `Referrer-Policy: strict-origin-when-cross-origin`
- `Permissions-Policy: camera=(), microphone=(), geolocation=()`
- `Content-Security-Policy`: `default-src 'self'`, `script-src 'self' 'nonce-{nonce}'` (nonce por request via middleware), `style-src 'self' 'unsafe-inline'` (Tailwind), `img-src 'self' data: https:`, `connect-src 'self' https://api.resend.com https://*.supabase.co https://*.upstash.io https://accounts.google.com https://appleid.apple.com`.

### 5.7 LGPD

- Política de privacidade clara em `/privacidade`, ativa antes do cadastro.
- Termo de uso aceito no cadastro via checkbox. Log do consentimento (`user_id`, `version`, `accepted_at`, `ip`).
- Direito de exportar dados: rota `/api/me/export` que retorna JSON com tudo do usuário (perfil, dívidas, rendas, snapshots, lições vistas, sessions ativas). v0.1.1 se apertar prazo.
- "Apagar conta" no produto = **desativar conta**, nunca hard-delete. Botão em `/app/perfil/conta`. Seta `users.deactivated_at = now()` + `deactivation_reason` (opcional). Login bloqueado a partir deste momento, sessions ativas revogadas, mas dados ficam retidos. Razão: LGPD permite (e em alguns cenários exige) retenção temporária de dados para fins de investigação, ordem judicial e comprovação. Cláusula específica de retenção será definida pelo usuário na política de privacidade, depois aplicada via job de purge se decidir prazo. v0.1 não implementa purge automático.
- Reativação da conta: solicitada manualmente (suporte) ou via fluxo "reativar" futuro. Não escopo v0.1.
- Logs estruturados sem PII em texto livre. Não logar email, valores monetários completos, nem detalhes de dívida. Logar apenas user_id e métricas agregadas.
- Dados em rest: criptografia at-rest do Supabase Postgres (já entregue pelo provider).
- Sem analytics terceiros invasivos. Plausible self-hosted (zero cookies) + Vercel Analytics (Web Vitals).

### 5.8 RBAC

- `users.role`: `'user'` (default) ou `'admin'`.
- Middleware Next.js verifica role em `/admin/*` e em handlers de admin. Não-admin recebe 404 (não 403, para evitar enumeration).
- Sem teams ou orgs no v0.1.

## 6. Testing, Deploy & Observability

### 6.1 Estratégia de testes

| Camada                       | Ferramenta                       | Cobertura alvo v0.1    | O que testa                                                                                                                         |
| ---------------------------- | -------------------------------- | ---------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| Unit (domain)                | Vitest                           | ≥ 90%                  | Value Objects (`Money`, `InterestRate`), services puros (Price, SAC, CET, payoff projector, snowball/avalanche). Coração do produto |
| Unit (application)           | Vitest                           | ≥ 70%                  | Use cases com ports mockadas                                                                                                        |
| Integration (infrastructure) | Vitest + Testcontainers Postgres | repos críticos         | Drizzle repos hitam Postgres real efêmero                                                                                           |
| E2E                          | Playwright                       | smoke dos golden paths | Magic link signup, OAuth Google signup, registrar dívida, ver dashboard, simular                                                    |

### 6.2 Princípios

- Domain tests não tocam DB nem Next. Rodam em menos de 100ms total.
- Sem mock de `Date` global. Injeção via port `IClock` em todo use case que precisa de tempo.
- Sem testes flakey tolerados. CI roda Playwright em workers paralelos com seed determinístico.
- Fixtures determinísticas em `test/fixtures/`. Dívidas-teste com valores conhecidos (ex.: financiamento R$ 200.000, 360 meses, 10% a.a. Price, parcela esperada R$ 1.755,14).
- Snapshots de schedule (Price e SAC) versionados.

### 6.3 CI (GitHub Actions)

Pipeline em PR e push para `master`:

- `pnpm install --frozen-lockfile`
- `pnpm lint` (ESLint + Prettier check)
- `pnpm typecheck` (`tsc --noEmit`)
- `pnpm test` (Vitest unit + integration)
- `pnpm test:e2e` (Playwright contra preview Vercel do PR)
- `drizzle-kit check` (valida migrations consistentes com schema)

Merge bloqueado se algo falha.

### 6.4 Deploy

- **Web**: Vercel. Branch `master` = production. PRs ganham preview deploys automáticos.
- **DB**: Supabase Postgres. Project com região mais próxima do BR (sa-east-1).
- **Migrations**: `drizzle-kit` gera SQL versionado. Aplicação via job pre-deploy (`drizzle-kit migrate`). Forward-only no v0.1; rollback é nova migration corretiva.

### 6.5 Env vars

```
DATABASE_URL                       # Supabase Postgres connection string
SESSION_COOKIE_SECRET              # rotação rara
GOOGLE_OAUTH_CLIENT_ID
GOOGLE_OAUTH_CLIENT_SECRET
APPLE_OAUTH_CLIENT_ID
APPLE_OAUTH_TEAM_ID
APPLE_OAUTH_KEY_ID
APPLE_OAUTH_PRIVATE_KEY            # P8 conteúdo, multi-line
EMAIL_FROM                         # ex: nao-responda@saborfinanceiro.com.br
RESEND_API_KEY
UPSTASH_REDIS_URL
UPSTASH_REDIS_TOKEN
SENTRY_DSN                         # opcional, mas recomendado em prod
PLAUSIBLE_DOMAIN                   # ex: saborfinanceiro.com.br
NEXT_PUBLIC_APP_URL                # ex: https://saborfinanceiro.com.br
```

### 6.6 Email transacional

- Provider: Resend (3000 emails/mês free, 100/dia).
- Templates: React Email (compõe em componentes React, compila para HTML).
- Domínio próprio com SPF, DKIM, DMARC configurados antes do go-live.
- Emails v0.1: magic link (signup + signin unificados), confirmação de novo dispositivo (opcional), alerta de exclusão de conta agendada.

### 6.7 Observability

- Logs estruturados em JSON via Pino. Cada request ganha `correlationId` propagado pelos use cases via context.
- Vercel Log Drains exportam para Axiom ou Logflare (free tier suficiente em MVP).
- Erros não-tratados: Sentry no cliente e no servidor. Source maps subindo no build do Next.
- Métricas:
  - Vercel Analytics (Web Vitals, LCP, INP).
  - Plausible self-hosted (eventos de produto sem cookies).
- Eventos a tracar (sem PII): `signup_completed`, `magic_link_requested`, `oauth_signin` (provider), `debt_registered` (kind), `simulation_run` (type), `lesson_shown`, `lesson_dismissed`, `account_deactivated`.

### 6.8 Backups

- Supabase faz backup automático diário (free tier: 1 dia de retenção; pago: 7 a 30 dias).
- Snapshot manual antes de migration grande.
- Considerar export semanal pra storage frio (S3/R2) a partir de v0.1.1.

### 6.9 Error handling

- Domain retorna `Result<T, DomainError>`. Erros nomeados: `DebtNotFound`, `InvalidAmortizationParams`, `MagicLinkExpired`, `MagicLinkInvalid`, `MagicLinkAlreadyUsed`, `TooManyAttempts`, `OauthStateMismatch`, `OauthAccountLinkRequiresVerification`, `SessionNotFound`, `Forbidden`, etc.
- Use cases nunca lançam. Devolvem Result.
- Presentation traduz `DomainError` em HTTP status + payload `{ code, message, fieldErrors? }`. Mensagens em PT-BR amigáveis.
- Erros inesperados: captura no boundary do route handler, envia para Sentry, retorna 500 genérico sem stack.
- UI nunca expõe `code` técnico cru ao usuário final.

### 6.10 Performance budget mobile

- Dashboard LCP menor que 2.5s em 4G simulado.
- JS shipped por rota menor que 150KB gzipped.
- Imagens via `next/image` com AVIF/WebP, lazy by default.
- Service Worker pre-cacheia shell e assets críticos.
- Glass blur em mobile médio: testar perf em Moto G ou similar; degradar para opacity sólida se FPS cair abaixo de 50.

## 7. Roadmap

### 7.1 Pós-spec, pre-implementação

- Self-review deste spec.
- Aprovação do usuário.
- Invocar skill `writing-plans` para gerar plano detalhado de implementação dividido em milestones.

### 7.2 v0.1 (este spec)

Implementação por blocos:

| Bloco                 | Itens                                                                                                                                                                                                                             |
| --------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Setup                 | Next.js 15 + TS strict + Tailwind v4 + shadcn/ui; estrutura hexagonal `src/{domain,application,infrastructure,presentation,shared}`; Drizzle + Supabase Postgres; CI GitHub Actions; Vercel deploy; PWA manifest + service worker |
| Auth                  | Magic link (Resend + código 6 dígitos + link), Google OAuth PKCE, Apple OAuth PKCE, sessions DB-backed, rate limit Upstash, headers de segurança, CSRF                                                                            |
| Domain core           | `Money`, `InterestRate`, `Period`, `AmortizationSchedule` VOs; services Price, SAC, CET, DebtPayoffProjector, PayoffStrategy (snowball/avalanche), RevolvingCostProjector, FinancialHealthService, IncomeCommittedService         |
| Dívidas               | Cadastro wizard por kind (financing, personal_loan, credit_card, overdraft); detalhe + amortização; registrar pagamento; arquivar                                                                                                 |
| Renda                 | Cadastro recorrente + extras one-off; lista e edit                                                                                                                                                                                |
| Dashboard             | Saudação + status, cards-resumo, timeline patrimônio líquido, próximos vencimentos, CTAs                                                                                                                                          |
| Simuladores           | Projeção quitação; pagar extra; comparador snowball vs avalanche                                                                                                                                                                  |
| Conteúdo              | Trigger rules engine; feed contextual; tela de lição (markdown render)                                                                                                                                                            |
| Onboarding adaptativo | 3-4 perguntas; roteia copy/atalhos                                                                                                                                                                                                |
| Landing pública       | Hero, proposta de valor, prova, CTA cadastro; `/sobre`, `/privacidade`, `/termos`                                                                                                                                                 |
| Admin                 | Login admin, CRUD lições + trigger rules UI, lista de usuários, métricas básicas                                                                                                                                                  |
| UX/Visual             | Glassmorphism tokens; ícones Lucide clean; bottom nav 5 slots; dark/light toggle; WCAG AA; mobile-first 360px                                                                                                                     |
| LGPD                  | Política, consentimento logado, export dados, desativação de conta (retenção indefinida, sem hard-delete em v0.1)                                                                                                                 |
| Observability         | Pino logs, Sentry, Plausible events, Vercel Analytics                                                                                                                                                                             |
| Testing               | Vitest domain ≥90%, application ≥70%; Playwright golden paths; Testcontainers Postgres para repos                                                                                                                                 |

### 7.3 v0.2 (pós-validação, 3 a 6 meses depois)

- **Investimentos**: CDB, Tesouro Direto, poupança, fundos. Rendimento líquido (IR regressivo, IOF, vs CDI/Selic benchmark). Patrimônio líquido completo (ativos menos passivos).
- **Pro tier**: paywall em features avançadas. Integração Stripe ou Pagar.me. Recibo fiscal (NFS-e via parceiro).
- **Insights por LLM**: chat "pergunta sobre suas finanças", recomendações personalizadas, análise contextual ("se você quitar o cheque especial sobra R$ X por mês").
- **Push notifications**: vencimento, lembrete de revisão mensal, conquista de meta.
- **Comparador de cenários side-by-side**: ex. "financiar carro vs comprar à vista usando reserva".
- **Export PDF**: relatório mensal de saúde financeira.
- **Metas**: definir objetivo ("quitar tudo em 24 meses") e tracking de progresso.

### 7.4 v0.3+ (médio e longo prazo)

- **Open Finance sync** (regulatório pesado, exige certificação e parceiro PISP/AISP).
- **App nativo iOS e Android** (React Native ou Capacitor; reusa `@sf/core` extraído em monorepo).
- **Multi-usuário / família**: orçamento conjunto, papéis.
- **Multi-moeda** (USD/EUR para quem tem renda em moeda estrangeira).
- **Marketplace de cursos** pagos (curadoria de educação financeira).
- **Integração com NFS-e/MEI** (MEIs unificando visão PJ + PF).
- **Recomendação de produtos financeiros** com afiliados (transparência total no conflito de interesse).
- **API pública** para parceiros (planejadores financeiros usando dados de clientes que autorizaram).

### 7.5 Decisões adiadas / open questions

- Provider de email: Resend confirmado.
- Hospedagem DB: Supabase confirmado (DB only, sem Supabase Auth).
- Hospedagem web: Vercel confirmado.
- Analytics: Plausible self-hosted vs Vercel Analytics vs PostHog. Decisão na fase de deploy. Default proposto: Plausible self-hosted.
- Domínio: `saborfinanceiro.com.br` (confirmado). Registrar em registro.br ainda.
- Tagline final pra landing: sugestões iniciais são "O sabor de uma vida financeira saudável" e "Entenda o quanto suas dívidas custam de verdade". Decisão durante implementação da landing.
- Política de retenção de logs (sentry, plausible): proposta 90 dias. Confirmar antes do go-live.
- Política de retenção de sessions inativas: proposta soft-purge após 60 dias sem uso (mesmo dentro do max-age 30d). Confirmar.
- Geração de ícones PWA a partir do logo existente em `icons/`: usar `pwa-asset-generator` ou similar.

## 8. Convenções

### 8.1 Código

- TypeScript strict (`"strict": true`, `"noUncheckedIndexedAccess": true`, `"exactOptionalPropertyTypes": true`).
- ESLint + Prettier configurados na raiz.
- Path aliases: `@/domain/*`, `@/application/*`, `@/infrastructure/*`, `@/presentation/*`, `@/shared/*`.
- Naming: arquivos `kebab-case.ts`, classes `PascalCase`, funções e variáveis `camelCase`, constantes `SCREAMING_SNAKE_CASE`.
- Imports: ordenados ESLint plugin.
- Nunca em-dash em código nem em prose. Usar vírgula, ponto, parênteses.

### 8.2 Commits e PRs

- Mensagens de commit em português, imperativo, curtas: "adiciona price amortization service", "ajusta rate limit em magic-link/request".
- Sem co-authored-by Claude ou qualquer atribuição de IA.
- Sem em-dash.
- Branches: `feature/<slug>`, `fix/<slug>`, `chore/<slug>`.
- PR template inclui: descrição, screenshot mobile (se UI), checklist de testes rodados.

### 8.3 Git

- Branch default: `master`.
- Remote: `git@github.com:Sabor-Financeiro/sf-platform.git`.
- Git commands são executados apenas com instrução explícita do usuário. O usuário controla commit e push timing.
