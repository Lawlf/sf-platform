import { z } from "zod";

export const requestMagicLinkSchema = z.object({
  email: z.string().email("Email inválido.").max(320),
});

export const verifyCodeSchema = z.object({
  email: z.string().email("Email inválido.").max(320),
  code: z.string().regex(/^\d{6}$/, "Código deve ter 6 dígitos."),
});

export type RequestMagicLinkBody = z.infer<typeof requestMagicLinkSchema>;
export type VerifyCodeBody = z.infer<typeof verifyCodeSchema>;
