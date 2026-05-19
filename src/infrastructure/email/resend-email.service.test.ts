import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const sendMock = vi.fn();

vi.mock("resend", () => ({
  Resend: class {
    emails = { send: sendMock };
  },
}));

describe("ResendEmailService", () => {
  beforeEach(() => {
    vi.stubEnv("RESEND_API_KEY", "re_test");
    vi.stubEnv("EMAIL_FROM", "no-reply@saborfinanceiro.com.br");
    vi.stubEnv("DATABASE_URL", "postgres://u:p@h:5432/db");
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "http://localhost:3000");
    vi.stubEnv("SESSION_COOKIE_SECRET", "a".repeat(32));
    sendMock.mockReset();
    sendMock.mockResolvedValue({ data: { id: "abc" }, error: null });
    vi.resetModules();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("sends an email with the configured from address", async () => {
    const { ResendEmailService } = await import("./resend-email.service");
    const svc = new ResendEmailService();
    await svc.send({ to: "u@example.com", subject: "S", html: "<p>x</p>" });
    expect(sendMock).toHaveBeenCalledTimes(1);
    expect(sendMock).toHaveBeenCalledWith({
      from: "no-reply@saborfinanceiro.com.br",
      to: "u@example.com",
      subject: "S",
      html: "<p>x</p>",
    });
  });

  it("uses DEFAULT_EMAIL_FROM when EMAIL_FROM is empty", async () => {
    vi.stubEnv("EMAIL_FROM", "");
    vi.resetModules();
    const { ResendEmailService } = await import("./resend-email.service");
    const svc = new ResendEmailService();
    await svc.send({ to: "u@example.com", subject: "S", html: "<p>x</p>" });
    expect(sendMock.mock.calls[0]?.[0].from).toBe("onboarding@resend.dev");
  });

  it("throws on resend error", async () => {
    sendMock.mockResolvedValue({
      data: null,
      error: { name: "ValidationError", message: "bad request" },
    });
    vi.resetModules();
    const { ResendEmailService } = await import("./resend-email.service");
    const svc = new ResendEmailService();
    await expect(svc.send({ to: "u@example.com", subject: "S", html: "<p>x</p>" })).rejects.toThrow(
      /bad request/,
    );
  });
});
