import { z } from "zod";

export const acquisitionChannelSchema = z
  .object({
    channel: z.enum([
      "founder_direct",
      "friend_referral",
      "messaging_group",
      "influencer",
      "instagram",
      "tiktok",
      "youtube",
      "facebook",
      "free_calculator",
      "google_search",
      "dont_remember",
      "other",
    ]),
    detail: z.string().trim().max(120).optional(),
  })
  .refine((v) => v.channel !== "other" || (v.detail?.length ?? 0) > 0, {
    message: "Conte rapidinho como você chegou.",
    path: ["detail"],
  });
