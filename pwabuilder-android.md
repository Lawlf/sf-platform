# PWABuilder → Play Store (Android TWA)

Guia de empacotamento do Sabor Financeiro como app Android via PWABuilder.
Valores prontos pra copiar/colar.

---

## Pré-requisito

Deploy do site em produção com:

- `app/manifest.ts` com `id: "/app"` + `scope: "/"` (feito)
- Rota `/.well-known/assetlinks.json` no ar (feita)

O site precisa estar no ar ANTES de abrir o PWABuilder. Ele lê o manifest da
URL e auto-preenche quase tudo.

---

## Passo a passo

1. Acesse https://www.pwabuilder.com
2. Cole `https://www.saborfinanceiro.com.br` e clique Start.
3. Rode o audit (deve pontuar alto).
4. Package For Stores → Android → abre "Android Package Options".
5. Confira os campos com as tabelas abaixo.
6. O único que você escolhe de fato: Signing key = **New**.
7. Download Package.
8. **Guarde o `.keystore` + a senha** (perdeu = nunca mais atualiza o app no Play).
9. Pegue o fingerprint SHA-256 (vem no zip / no `assetlinks.json` de exemplo que
   o PWABuilder gera) e configure no Vercel:
   - `ANDROID_PACKAGE_NAME=br.com.saborfinanceiro.twa`
   - `ANDROID_CERT_SHA256=<fingerprint>`
10. Redeploy. Agora `https://www.saborfinanceiro.com.br/.well-known/assetlinks.json`
    serve o fingerprint real → a TWA abre fullscreen, sem barra de URL.
11. Play Console (conta dev US$25, paga uma vez) → criar app → subir o `.aab`.

---

## Tela principal

| Campo | Valor |
| --- | --- |
| Package ID | `br.com.saborfinanceiro.twa` |
| App name | `Sabor Financeiro` |
| Short name | `Sabor` |
| Include source code | desmarcado |

---

## All Settings

| Campo | Valor |
| --- | --- |
| Host | `www.saborfinanceiro.com.br` |
| Start URL | `/app` |
| Version | `1.0.0.0` |
| Version code | `1` |
| Theme color | `#f28e25` |
| Theme dark color | `#1f1d1c` |
| Background color | `#fdf8f3` |
| Nav color | `#fdf8f3` |
| Nav dark color | `#1f1d1c` |
| Nav divider color | `#fdf8f3` |
| Nav divider dark color | `#1f1d1c` |
| Icon URL | `https://www.saborfinanceiro.com.br/icons/icon-512.png` |
| Maskable icon URL | `https://www.saborfinanceiro.com.br/icons/icon-maskable-512.png` |
| Monochrome icon URL | (vazio) |
| Manifest URL | `https://www.saborfinanceiro.com.br/manifest.webmanifest` |
| Splash fade out duration (ms) | `300` |
| Settings shortcut | Enable |
| Display mode | Standalone |
| Notification delegation | Enable |
| Location delegation | off |
| Google Play billing | off |
| Fallback behavior | Custom Tabs |
| ChromeOS only | off |
| Meta Quest compatible | off |

---

## Signing key → New (primeira vez)

| Campo | Valor |
| --- | --- |
| Key alias | `sabor` |
| Key full name | `Sabor Financeiro` |
| Key organization | `Sabor Financeiro` |
| Key organizational unit | `App` |
| Key country code | `BR` |

---

## Domínio canônico: www (confirmado)

O canônico é `www.saborfinanceiro.com.br`. Todas as tabelas acima usam www.

- No Vercel (Settings → Environment Variables → Production), `NEXT_PUBLIC_APP_URL`
  deve ser `https://www.saborfinanceiro.com.br` (ou ficar não-setado, pois o
  default do `layout.tsx` já é www). Se estiver sem www, troque e redeploy.
- Teste: `https://www.saborfinanceiro.com.br/.well-known/assetlinks.json` precisa
  abrir direto (200, sem redirect).

## Play App Signing (depois do 1o upload)

Ao ativar Play App Signing no Console, o Google gera um SEGUNDO fingerprint.
Aí `ANDROID_CERT_SHA256` precisa dos DOIS, separados por vírgula
(chave de upload + chave gerenciada do Play). A rota já suporta vírgula.

## Notas

- Google Play billing OFF: cobrança é via Stripe (Custom Tab), não pela Play
  Store. Só ligaria Play Billing se vender assinatura DENTRO do app Android
  (Google corta 15-30%).
- Package ID `br.com.saborfinanceiro.twa` é IMUTÁVEL após o 1o upload no Play.
- iOS é decisão separada (wrapper PWABuilder primeiro; nativo só se a Apple
  rejeitar por minimum functionality).
