export const ACQUISITION_LABELS: Record<string, string> = {
  founder_direct: "Falei com quem criou",
  friend_referral: "Indicação de amigo",
  messaging_group: "Grupo de WhatsApp/Telegram",
  influencer: "Influenciador",
  instagram: "Instagram",
  tiktok: "TikTok",
  youtube: "YouTube",
  facebook: "Facebook",
  free_calculator: "Calculadora grátis",
  google_search: "Google",
  other: "Outro",
};

export function acquisitionLabel(channel: string): string {
  return ACQUISITION_LABELS[channel] ?? channel;
}
