import { z } from "zod";

const emptyToUndefined = z
  .string()
  .optional()
  .transform((v) => (v && v.length > 0 ? v : undefined));

const envSchema = z.object({
  // required
  DATABASE_URL: z
    .string()
    .min(1, "DATABASE_URL is required")
    .startsWith("postgres", "DATABASE_URL must be a Postgres connection string"),
  NEXT_PUBLIC_APP_URL: z.string().url("NEXT_PUBLIC_APP_URL must be a valid URL"),
  SESSION_COOKIE_SECRET: z.string().min(32, "SESSION_COOKIE_SECRET must be at least 32 characters"),

  // optional (filled in later plans)
  GOOGLE_OAUTH_CLIENT_ID: emptyToUndefined,
  GOOGLE_OAUTH_CLIENT_SECRET: emptyToUndefined,
  RESEND_API_KEY: emptyToUndefined,
  UPSTASH_REDIS_REST_URL: emptyToUndefined,
  UPSTASH_REDIS_REST_TOKEN: emptyToUndefined,
  SENTRY_DSN: emptyToUndefined,
  PLAUSIBLE_DOMAIN: emptyToUndefined,
  // Segredo do cron para a rota de atualização diária de cotações.
  CRON_SECRET: emptyToUndefined,
  EXCHANGE_RATE_API_URL: emptyToUndefined,

  // Stripe billing
  STRIPE_SECRET_KEY: emptyToUndefined,
  STRIPE_PUBLISHABLE_KEY: emptyToUndefined,
  STRIPE_WEBHOOK_SECRET: emptyToUndefined,
  /** Comma-separated list. Defaults to "card". Ex: "card,pix" once PIX is activated on the Stripe account. */
  STRIPE_PAYMENT_METHODS: z
    .string()
    .optional()
    .transform((v) => (v && v.length > 0 ? v : "card")),

  // QStash (async webhook processing in production). When unset, webhooks process inline.
  QSTASH_TOKEN: emptyToUndefined,
  QSTASH_CURRENT_SIGNING_KEY: emptyToUndefined,
  QSTASH_NEXT_SIGNING_KEY: emptyToUndefined,

  // Admin step-up: 32 raw bytes, base64-encoded. Encrypts TOTP secrets at rest.
  ADMIN_TOTP_ENC_KEY: emptyToUndefined,

  // Cloudflare R2 (anexos de arquivo). Object storage S3-compatível.
  R2_ACCOUNT_ID: emptyToUndefined,
  R2_ACCESS_KEY: emptyToUndefined,
  R2_SECRET: emptyToUndefined,
  R2_BUCKET: emptyToUndefined,

  // Digital Asset Links da TWA (app Android via PWABuilder). Sem isto a TWA abre
  // com a barra de URL do Chrome visível. Fingerprint SHA-256 sai do keystore que
  // o PWABuilder gera no empacotamento; preencher depois do primeiro build.
  ANDROID_PACKAGE_NAME: emptyToUndefined,
  ANDROID_CERT_SHA256: emptyToUndefined,
});

export type Env = z.infer<typeof envSchema>;

export function parseEnv(raw: Record<string, string | undefined>): Env {
  const parsed = envSchema.safeParse(raw);
  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((i) => `${i.path.join(".") || "(root)"}: ${i.message}`)
      .join("; ");
    throw new Error(`Invalid environment configuration: ${issues}`);
  }
  return parsed.data;
}

let cached: Env | null = null;

export function loadEnv(): Env {
  if (cached) return cached;
  cached = parseEnv(process.env);
  return cached;
}

function required<K extends keyof Env>(key: K, value: Env[K]): NonNullable<Env[K]> {
  if (value === undefined || value === null || value === "") {
    throw new Error(`Missing required env var: ${String(key)}`);
  }
  return value as NonNullable<Env[K]>;
}

export function requireResendConfig(env: Env = loadEnv()): { apiKey: string } {
  return {
    apiKey: required("RESEND_API_KEY", env.RESEND_API_KEY),
  };
}

export function requireUpstashConfig(env: Env = loadEnv()): { url: string; token: string } {
  return {
    url: required("UPSTASH_REDIS_REST_URL", env.UPSTASH_REDIS_REST_URL),
    token: required("UPSTASH_REDIS_REST_TOKEN", env.UPSTASH_REDIS_REST_TOKEN),
  };
}

export function requireGoogleOauthConfig(env: Env = loadEnv()): {
  clientId: string;
  clientSecret: string;
} {
  return {
    clientId: required("GOOGLE_OAUTH_CLIENT_ID", env.GOOGLE_OAUTH_CLIENT_ID),
    clientSecret: required("GOOGLE_OAUTH_CLIENT_SECRET", env.GOOGLE_OAUTH_CLIENT_SECRET),
  };
}

export function requireStripeConfig(env: Env = loadEnv()): {
  secretKey: string;
  webhookSecret: string;
  paymentMethods: string[];
} {
  return {
    secretKey: required("STRIPE_SECRET_KEY", env.STRIPE_SECRET_KEY),
    webhookSecret: required("STRIPE_WEBHOOK_SECRET", env.STRIPE_WEBHOOK_SECRET),
    paymentMethods: env.STRIPE_PAYMENT_METHODS.split(",")
      .map((s) => s.trim())
      .filter((s) => s.length > 0),
  };
}

export interface QStashConfig {
  token: string;
  currentSigningKey: string;
  nextSigningKey: string;
}

/** Returns null if QStash is not configured (dev fallback to inline processing). */
export function getQStashConfig(env: Env = loadEnv()): QStashConfig | null {
  if (!env.QSTASH_TOKEN || !env.QSTASH_CURRENT_SIGNING_KEY || !env.QSTASH_NEXT_SIGNING_KEY) {
    return null;
  }
  return {
    token: env.QSTASH_TOKEN,
    currentSigningKey: env.QSTASH_CURRENT_SIGNING_KEY,
    nextSigningKey: env.QSTASH_NEXT_SIGNING_KEY,
  };
}

export function requireAdminTotpKey(env: Env = loadEnv()): Buffer {
  const b64 = required("ADMIN_TOTP_ENC_KEY", env.ADMIN_TOTP_ENC_KEY);
  const key = Buffer.from(b64, "base64");
  if (key.toString("base64") !== b64 || key.length !== 32) {
    throw new Error("ADMIN_TOTP_ENC_KEY must be canonical base64 decoding to exactly 32 bytes");
  }
  return key;
}

export interface R2Config {
  accountId: string;
  accessKey: string;
  secret: string;
  bucket: string;
}

export function requireR2Config(env: Env = loadEnv()): R2Config {
  return {
    accountId: required("R2_ACCOUNT_ID", env.R2_ACCOUNT_ID),
    accessKey: required("R2_ACCESS_KEY", env.R2_ACCESS_KEY),
    secret: required("R2_SECRET", env.R2_SECRET),
    bucket: required("R2_BUCKET", env.R2_BUCKET),
  };
}

