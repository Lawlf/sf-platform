# Resend Setup Checklist

Sender domain: `saborfinanceiro.com.br`.

## 1. Verify the domain in Resend

1. https://resend.com/domains -> Add Domain -> `saborfinanceiro.com.br`.
2. Resend lists 3-4 DNS records to add at the registrar (typically registro.br):
   - SPF: `TXT @ "v=spf1 include:_spf.resend.com -all"`
   - DKIM: `TXT resend._domainkey "<value Resend provides>"`
   - Return-Path / Bounce: `MX bounces.saborfinanceiro.com.br ...` or `CNAME` depending on plan.
3. Propagation: 15 minutes to 24 hours. The Resend dashboard polls automatically.

## 2. DMARC

Add a `TXT _dmarc.saborfinanceiro.com.br` record:

```
v=DMARC1; p=quarantine; rua=mailto:dmarc@saborfinanceiro.com.br; ruf=mailto:dmarc@saborfinanceiro.com.br; fo=1; aspf=s; adkim=s
```

Mailbox `dmarc@saborfinanceiro.com.br` needs to exist (or use an external aggregator like dmarcian).

## 3. Configure env vars

`.env.local` (dev) and Vercel (production):

```
RESEND_API_KEY=re_xxx
```

Sender addresses are NOT configured via env. They are hardcoded per purpose in
`src/infrastructure/email/senders.ts`:

```
auth          -> nao-responda@saborfinanceiro.com.br
transactional -> nao-responda@saborfinanceiro.com.br
```

Add new purposes (notifications, marketing, etc.) by extending the `EmailPurpose`
union in `src/domain/ports/services/email.service.ts` and adding an entry to
`EMAIL_SENDERS` in `senders.ts`. This is a brand/product decision and lives
alongside the code, not in deployment config.

Vercel: Settings -> Environment Variables -> add `RESEND_API_KEY` for the
`Production` (and `Preview` if you want previews to send real email) environments.

## 4. Smoke test

Two options:

A) Use Resend's "Send test email" button in the dashboard.

B) Trigger a magic link locally:

```bash
pnpm dev
# in another terminal
curl -X POST http://localhost:3000/api/auth/magic-link/request \
  -H "Content-Type: application/json" \
  -d '{"email":"your.address@example.com"}'
```

The email should arrive within a few seconds. Click the link or paste the 6-digit code.

## 5. Troubleshooting

- **HTTP 403 from Resend**: domain not verified yet. Use sandbox sender (`onboarding@resend.dev`) until verification completes.
- **Email goes to spam**: confirm SPF, DKIM, DMARC all pass via mail-tester.com.
- **Rate limit (HTTP 429)**: Resend free tier is 100/day, 3000/month. Upgrade if exceeded.
- **Bounces**: check the Resend dashboard's "Bounces" tab; common causes are invalid recipient addresses or domain reputation issues.
