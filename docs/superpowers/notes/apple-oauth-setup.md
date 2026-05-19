# Apple Sign In Setup Checklist

Apple's Sign in with Apple requires an Apple Developer account ($99/year) and a few moving parts.

## 1. Apple Developer dashboard

1. https://developer.apple.com/account, then Certificates, IDs & Profiles.
2. Identifiers, then App IDs, then register a new App ID (or use existing). Enable "Sign In with Apple" capability.
3. Identifiers, then Services IDs, then register a Services ID (this is the `client_id`).
   - Identifier suggestion: `com.saborfinanceiro.web`.
   - Description: `Sabor Financeiro Web`.
   - Enable "Sign In with Apple".
   - Configure, then select your App ID as primary, add return URLs:
     - `https://saborfinanceiro.com.br/api/auth/apple/callback`
     - For previews: `https://<vercel-preview>.vercel.app/api/auth/apple/callback`
     - Apple does NOT accept `http://localhost`. For dev, use a tunnel (ngrok/cloudflared) and add the tunnel URL.
4. Keys, then create a new key.
   - Enable "Sign in with Apple".
   - Configure, then select your App ID.
   - Download the P8 file (you can only download once).
   - Note the Key ID (10 chars).
5. Account, then Membership, then note Team ID (10 chars).

## 2. Configure env vars

`.env.local`:

```
APPLE_OAUTH_CLIENT_ID=com.saborfinanceiro.web    # Services ID
APPLE_OAUTH_TEAM_ID=ABCDEFGHIJ                   # 10-char Team ID
APPLE_OAUTH_KEY_ID=KEYIDKEYID                    # 10-char Key ID
APPLE_OAUTH_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nMIGTAgEAMBMGByqGSM4...\n-----END PRIVATE KEY-----"
```

Important: the P8 file content is multi-line. To put it into a single .env line:

- Either replace newlines with `\n` literal escapes (the env loader converts them back), or
- Use a multi-line `.env.local` block if your editor supports it (most do via quoted strings).

Vercel:

- Settings, then Environment Variables, then add all four for Production (and Preview, if you've configured a preview return URL).

## 3. Local dev with tunnel

```bash
# Install cloudflared (one-time):
brew install cloudflared

# Run a tunnel:
cloudflared tunnel --url http://localhost:3000
```

Cloudflared gives you a stable HTTPS URL. Add it to the Apple Services ID return URLs and to `.env.local` as `NEXT_PUBLIC_APP_URL`.

## 4. Smoke test

`pnpm dev`, visit your tunnel URL `/entrar`, click "Entrar com Apple". Apple's consent page should appear. Sign in. Apple POSTs the callback. The app creates the user (first time) and redirects to `/app`.

## 5. Notes

- First-time authorization returns the user's name in a separate `user` POST body field, but we capture only the email + sub from the id_token. Name capture is a future enhancement.
- Apple may return a "private relay" email (`@privaterelay.appleid.com`); accept it.
- `email_verified` may be returned as boolean OR string `"true"`/`"false"`; the provider handles both.
- The client_secret JWT we sign is valid for 30 days; Apple's max is 6 months. If we want to rotate less often, bump the expiration in `apple-oauth.provider.ts` `buildClientSecret`.
