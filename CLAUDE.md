# sf-platform — convenções de arquitetura

## Camadas

- `src/domain` — entidades, VOs, serviços puros, portas (`src/domain/ports`).
- `src/application` — use-cases; recebem deps por parâmetro, nunca instanciam infra.
- `src/infrastructure` — implementações (Drizzle, Upstash, Stripe, R2, clock).
- `src/presentation` — validators zod, middleware HTTP, wrapper de actions.
- `app/` — rotas Next; server actions são casca fina sobre use-cases.

## Repositórios

- Implementação Postgres usa o nome limpo: `AssetRepository` em `src/infrastructure/persistence/drizzle/repositories/asset.repository.ts`. A pasta já diz a tecnologia; NUNCA prefixar classe/arquivo com `Drizzle`.
- Porta (interface) leva sufixo `Port`: `AssetRepositoryPort` em `src/domain/ports/repositories/`.
- Implementação alternativa de uma mesma porta leva prefixo da tecnologia (ex.: `UpstashMagicLinkTokenRepository`).
- Não criar porta para repo com uma única implementação e sem fake de teste — só por necessidade, não por cerimônia.
- Escopo por dono + soft-delete: usar `ownedBy(table, userId)` de `src/infrastructure/persistence/drizzle/helpers.ts` em vez de re-escrever `and(eq(userId), isNull(deletedAt))`. Esquecer o escopo de userId é vazamento entre usuários.

## Composition root

- `src/infrastructure/container.ts` exporta `repos` (singleton de cada repositório) e `clock`.
- Server actions, route handlers e MCP importam do container; PROIBIDO `new XRepository()` ou `new SystemClock()` fora do container (testes podem).
- Use-cases continuam recebendo deps por parâmetro — o container é só o ponto de montagem.

## Server actions

- Mutações usam o wrapper `action()` de `src/presentation/actions/action.ts`:
  - `schema` zod valida o input (FormData é normalizado automaticamente);
  - handler recebe `(input, { userId })` — auth via `requireUser` já resolvida;
  - retorno único `ActionResult<T> = { ok: true; data: T } | { ok: false; message: string }`;
  - `DomainError` vira `message` PT-BR; erro desconhecido vira mensagem genérica (nunca vaza stack);
  - revalidação declarativa: `revalidates` com grupos de `revalidate-groups.ts`, paths dinâmicos via `revalidatePaths`.
- Use-case que retorna `Result`: embrulhar com `unwrap(...)` para o erro propagar ao wrapper. Nunca try/catch de mapeamento de erro dentro do handler.
- Queries (list-*, search-*, preview-*) ficam fora do wrapper.
- Nunca chamar `revalidatePath` solto em action migrada — grupos ou `revalidatePaths`.

## Validators

- Transformers compartilhados em `src/presentation/http/validators/shared.validators.ts` (`bigintFromString`, `positiveBigint`, `nonNegativeBigint`, `currencyEnum`, `nullableDate`). Não reinventar por feature.

## Comentários

- Código auto-explicativo por padrão; zero comentário narrando o que a próxima linha faz.
- Section dividers (`// ---- 1) etapa ----`) são proibidos: extrair função nomeada.
- Comentário permitido APENAS para invariante que o código não expressa: criptografia (TOTP/HMAC), compat legado, matemática não óbvia. Narrativa de cenário em teste matemático é permitida.
- `eslint-disable` sempre na linha específica, nunca no arquivo inteiro.

## Regras gerais

- Copy/UI sempre PT-BR com acentos; commits/PRs/branches sempre em inglês.
- Proibido emoji em qualquer lugar (UI, copy, commits); ícones via lucide.
- Sem texto de loading ("Carregando..."); usar Skeleton/Spinner.
- Verificação padrão: `pnpm typecheck && pnpm test && pnpm lint src app scripts`.
