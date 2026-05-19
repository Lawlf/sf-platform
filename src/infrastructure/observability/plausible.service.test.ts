import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

describe("trackPlausibleEvent", () => {
  beforeEach(() => {
    vi.stubEnv("DATABASE_URL", "postgres://u:p@h:5432/db");
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "https://saborfinanceiro.com.br");
    vi.stubEnv("SESSION_COOKIE_SECRET", "a".repeat(32));
    vi.resetModules();
  });
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it("is a no-op when PLAUSIBLE_DOMAIN is unset", async () => {
    vi.stubEnv("PLAUSIBLE_DOMAIN", "");
    vi.resetModules();
    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(new Response("", { status: 202 }));
    const { trackPlausibleEvent } = await import("./plausible.service");
    await trackPlausibleEvent({ name: "signup_completed" });
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("posts to Plausible when domain is set", async () => {
    vi.stubEnv("PLAUSIBLE_DOMAIN", "saborfinanceiro.com.br");
    vi.resetModules();
    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(new Response("", { status: 202 }));
    const { trackPlausibleEvent } = await import("./plausible.service");
    await trackPlausibleEvent(
      { name: "magic_link_requested", props: { kind: "email" } },
      { ip: "1.2.3.4", userAgent: "ua" },
    );
    expect(fetchSpy).toHaveBeenCalledTimes(1);
    const [url, init] = fetchSpy.mock.calls[0]!;
    expect(url).toBe("https://plausible.io/api/event");
    expect(init?.method).toBe("POST");
    expect((init?.headers as Record<string, string>)["X-Forwarded-For"]).toBe("1.2.3.4");
    const body = JSON.parse(init?.body as string);
    expect(body.name).toBe("magic_link_requested");
    expect(body.domain).toBe("saborfinanceiro.com.br");
    expect(body.props.kind).toBe("email");
  });

  it("does not throw when fetch fails", async () => {
    vi.stubEnv("PLAUSIBLE_DOMAIN", "saborfinanceiro.com.br");
    vi.resetModules();
    vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("network"));
    const { trackPlausibleEvent } = await import("./plausible.service");
    await expect(trackPlausibleEvent({ name: "any" })).resolves.toBeUndefined();
  });
});
