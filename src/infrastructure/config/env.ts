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
  APPLE_OAUTH_CLIENT_ID: emptyToUndefined,
  APPLE_OAUTH_TEAM_ID: emptyToUndefined,
  APPLE_OAUTH_KEY_ID: emptyToUndefined,
  APPLE_OAUTH_PRIVATE_KEY: emptyToUndefined,
  EMAIL_FROM: emptyToUndefined,
  RESEND_API_KEY: emptyToUndefined,
  UPSTASH_REDIS_URL: emptyToUndefined,
  UPSTASH_REDIS_TOKEN: emptyToUndefined,
  SENTRY_DSN: emptyToUndefined,
  PLAUSIBLE_DOMAIN: emptyToUndefined,
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
