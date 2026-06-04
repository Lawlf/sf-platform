const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "::1"]);

function hostnameOf(rawUrl: string): string | null {
  try {
    return new URL(rawUrl).hostname;
  } catch {
    return null;
  }
}

export default function guardIntegrationDatabase() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error(
      "[it-guard] DATABASE_URL ausente. Os testes de integração só rodam contra um Postgres local descartável.",
    );
  }

  const host = hostnameOf(url);
  if (host && LOCAL_HOSTS.has(host)) return;

  const allowedRemote = process.env.VITEST_IT_ALLOW_REMOTE_HOST;
  if (allowedRemote && host === allowedRemote) return;

  throw new Error(
    [
      `[it-guard] ABORTADO. DATABASE_URL aponta para um host não-local: ${host ?? "desconhecido"}.`,
      "Os testes de integração TRUNCAM tabelas (inclusive users). Rodar contra produção apaga dados reais.",
      "Use um Postgres local (localhost/127.0.0.1) e dedicado a teste.",
      `Se for mesmo um banco de teste remoto descartável, defina VITEST_IT_ALLOW_REMOTE_HOST="${host ?? ""}" para liberar conscientemente.`,
    ].join("\n"),
  );
}
