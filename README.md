# Sabor Financeiro

Plataforma de saúde financeira com foco em dívidas, projeção de quitação e timeline do patrimônio líquido.

Documentação completa em `docs/superpowers/specs/2026-05-19-sabor-financeiro-design.md`.

## Stack

Next.js 15 (App Router, React 19), TypeScript strict, Tailwind v4, shadcn/ui, lucide-react, Drizzle ORM, Supabase Postgres, Resend, Vercel.

## Pré-requisitos

- Node 22 LTS (ver `.nvmrc`)
- pnpm 9+ (via Corepack: `corepack enable && corepack prepare pnpm@latest --activate`)
- Projeto Supabase configurado (Postgres)

## Setup local

```bash
git clone git@github.com:Sabor-Financeiro/sf-platform.git
cd sf-platform
pnpm install
cp .env.example .env.local
# preencha DATABASE_URL, SESSION_COOKIE_SECRET (>= 32 chars), NEXT_PUBLIC_APP_URL
pnpm db:migrate
pnpm dev
```

Abre `http://localhost:3000`.

## Scripts

- `pnpm dev`: servidor de desenvolvimento
- `pnpm build`: build de produção
- `pnpm start`: servir build de produção localmente
- `pnpm lint`: ESLint
- `pnpm typecheck`: `tsc --noEmit`
- `pnpm format` / `pnpm format:check`: Prettier
- `pnpm test` / `pnpm test:watch` / `pnpm test:coverage`: Vitest
- `pnpm test:e2e`: Playwright
- `pnpm db:generate`: gera nova migração a partir do schema Drizzle
- `pnpm db:migrate`: aplica migrações pendentes
- `pnpm db:studio`: abre Drizzle Studio
- `pnpm db:check`: verifica drift entre schema e migrações
- `pnpm icons:pwa`: regenera ícones PWA a partir do logo em `icons/`

## Arquitetura

Monolito Next.js com camadas hexagonais internas:

```
src/
  domain/           # entidades, value objects, services puros, ports (interfaces)
  application/      # casos de uso, orquestração
  infrastructure/   # adapters concretos (Drizzle, OAuth, email, rate limit, etc.)
  presentation/     # tradução HTTP/form -> use case -> resposta
  shared/           # Result<T, E>, DomainError, helpers
app/                # Next.js App Router (UI + Route Handlers)
```

Veja `docs/superpowers/specs/2026-05-19-sabor-financeiro-design.md` para detalhes.

## Deploy

- **Web:** Vercel (branch `master` = produção; PR = preview)
- **DB:** Supabase Postgres (região `sa-east-1`)
- Variáveis em Vercel -> Settings -> Environment Variables, espelhando `.env.example`.

## Convenções

- Branch padrão: `master`.
- Nunca commitar `.env.local` ou segredos.
- Mensagens de commit em português, imperativo. Sem em-dash. Sem emoji. Sem `Co-Authored-By: Claude`.
- Acessibilidade WCAG AA mínimo; sem emoji em UI nem copy.

## Licença

Proprietária. Todos os direitos reservados.
