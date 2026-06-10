const COMPE_BANK_NAMES: Record<string, string> = {
  "001": "Banco do Brasil",
  "033": "Santander",
  "041": "Banrisul",
  "070": "BRB",
  "077": "Banco Inter",
  "104": "Caixa",
  "208": "BTG Pactual",
  "212": "Banco Original",
  "237": "Bradesco",
  "246": "Banco ABC",
  "260": "Nubank",
  "290": "PagBank",
  "318": "Banco BMG",
  "323": "Mercado Pago",
  "336": "C6 Bank",
  "341": "Itaú",
  "380": "PicPay",
  "389": "Banco Mercantil",
  "422": "Banco Safra",
  "623": "Banco PAN",
  "655": "Banco Votorantim",
  "735": "Neon",
  "748": "Sicredi",
  "756": "Sicoob",
};

export function bankNameFromId(bankId: string): string | null {
  const normalized = bankId.replace(/\D/g, "").padStart(3, "0").slice(-3);
  return COMPE_BANK_NAMES[normalized] ?? null;
}
