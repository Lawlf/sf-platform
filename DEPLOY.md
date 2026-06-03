# Deploy Sabor Financeiro na Vercel

Checklist de deploy. Repo migrado de `Sabor-Financeiro` (org) para `Lawlf/sf-platform`
(conta pessoal) para liberar deploy de repo privado no plano Hobby.

> Trocar para Vercel **Pro** no dia em que abrir venda pública. Hobby proíbe uso
> comercial no ToS; aceitável só na fase de teste/pré-launch sem tráfego real.

---

## 1. Estado do repositório (feito)

- [x] Remote trocado para `git@github.com:Lawlf/sf-platform.git`
- [x] `db:migrate` removido do `buildCommand` em `vercel.json` (migrations são manuais)
- [x] `master` + todas as branches enviadas para o novo remote

---

## 2. Importar projeto na Vercel

1. Vercel → **Add New → Project**
2. Conectar a conta GitHub pessoal (`Lawlf`) e dar acesso ao repo `sf-platform`
3. Importar `sf-platform`
4. Framework detecta **Next.js** automaticamente (já fixado no `vercel.json`)
5. **NÃO** fazer deploy ainda — configurar env vars primeiro (passo 3)
6. Region já fixada em `gru1` (São Paulo) via `vercel.json`

---

## 3. Variáveis de ambiente (Project Settings → Environment Variables)

Marcar para **Production** (e Preview se quiser deploys de PR).

### Obrigatórias

| Var | Valor / origem |
|-----|----------------|
| `DATABASE_URL` | URL **pooled** do Supabase (porta 6543) — runtime |
| `NEXT_PUBLIC_APP_URL` | URL de produção (ex `https://saborfinanceiro.com.br`) |
| `SESSION_COOKIE_SECRET` | string aleatória 32+ chars |
| `GOOGLE_OAUTH_CLIENT_ID` | Google Cloud Console |
| `GOOGLE_OAUTH_CLIENT_SECRET` | Google Cloud Console |
| `RESEND_API_KEY` | Resend Dashboard |
| `RESEND_WEBHOOK_SECRET` | gerado ao criar webhook no Resend (passo 5) |
| `UPSTASH_REDIS_REST_URL` | Upstash (rate limit + magic-link) |
| `UPSTASH_REDIS_REST_TOKEN` | Upstash |
| `STRIPE_SECRET_KEY` | Stripe Dashboard |
| `STRIPE_WEBHOOK_SECRET` | gerado ao criar webhook no Stripe (passo 5) |
| `STRIPE_PRICE_ID_PRO_MONTHLY` | `price_...` do plano Pro mensal |
| `ADMIN_TOTP_ENC_KEY` | `node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"` |
| `CRON_SECRET` | string aleatória longa (Vercel injeta como Bearer nos crons) |
| `VAPID_PUBLIC_KEY` | `pnpm vapid:generate` |
| `VAPID_PRIVATE_KEY` | `pnpm vapid:generate` |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY` | mesmo valor da public key |
| `VAPID_SUBJECT` | `mailto:nao-responda@saborfinanceiro.com.br` |

### Públicas (build-time, `NEXT_PUBLIC_`)

| Var | Valor |
|-----|-------|
| `NEXT_PUBLIC_PRO_PRICE_CENTS` | `1490` (confirmar preço atual antes) |
| `NEXT_PUBLIC_POSTHOG_KEY` | `phc_...` do PostHog |
| `NEXT_PUBLIC_POSTHOG_HOST` | `/ingest` |

### Opcionais

| Var | Uso |
|-----|-----|
| `BRAPI_TOKEN` | cotações de ações (sem ele, atualização fica indisponível) |
| `SENTRY_DSN` | observabilidade |
| `STRIPE_PUBLISHABLE_KEY` | reservado (não usado no MVP) |
| `GOOGLE_SITE_VERIFICATION` | Search Console |
| `BING_SITE_VERIFICATION` | Bing Webmaster |
| `YANDEX_SITE_VERIFICATION` | Yandex (mercado russo) |

> `DIRECT_URL` **não** precisa na Vercel — migrations são manuais e locais.

---

## 4. Banco de dados (manual, local, antes do primeiro deploy)

Migrations rodam localmente com a **conexão direta real** (não pooler):

```bash
# DIRECT_URL no .env.local = db.<ref>.supabase.co:5432 (sessão direta)
pnpm db:migrate
```

- [ ] Aplicar migration **0036** (pendente)
- [ ] Confirmar migrations 0026–0028 e 0032/0033 já aplicadas em produção
- [ ] Conferir que `DIRECT_URL` aponta para a conexão direta (pooler 6543 dá
      falso sucesso e não aplica DDL)

---

## 5. Webhooks (depois do primeiro deploy, com a URL de produção)

### Stripe
- [ ] Dashboard → Webhooks → criar endpoint `https://<prod>/api/webhooks/stripe`
- [ ] Habilitar evento `charge.refunded` (gap pendente)
- [ ] Copiar o novo `whsec_...` para `STRIPE_WEBHOOK_SECRET` na Vercel → redeploy

### Resend
- [ ] Dashboard → Webhooks → criar endpoint `https://<prod>/api/webhooks/resend`
- [ ] Copiar o novo secret para `RESEND_WEBHOOK_SECRET` na Vercel → redeploy

### Google OAuth
- [ ] Cloud Console → Credentials → adicionar redirect URI de produção
- [ ] Verificar domínio do remetente (`saborfinanceiro.com.br`) no Resend

---

## 6. Crons (automático)

Definidos em `vercel.json`, ativam sozinhos no deploy de produção:

- `/api/cron/push-notifications` → diário 12:00 UTC
- `/api/jobs/usage-purge` → diário 04:00 UTC

Autenticam via `CRON_SECRET` (Vercel envia como `Authorization: Bearer`).

---

## 7. Domínio

- [ ] Vercel → Project → Settings → Domains → adicionar `saborfinanceiro.com.br`
- [ ] Apontar DNS conforme instruções da Vercel
- [ ] Confirmar `NEXT_PUBLIC_APP_URL` bate com o domínio final

---

## 8. Primeiro deploy

1. Confirmar env vars (passo 3) e migrations aplicadas (passo 4)
2. Vercel → Deploy
3. Após subir: configurar webhooks (passo 5) com a URL real → redeploy
4. Smoke test: login (magic-link + Google), checkout Stripe (modo teste),
   push notification, painel admin

---

## 9. Antes da venda pública

- [ ] Migrar para **Vercel Pro** (sai do limite comercial do Hobby)
- [ ] Stripe em modo **live** (chaves live + price IDs live + webhook live)
- [ ] Revisar `NEXT_PUBLIC_PRO_PRICE_CENTS` vs preço real
