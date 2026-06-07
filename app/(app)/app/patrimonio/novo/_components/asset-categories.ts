// Categorias de ativo. Fica fora do módulo "use client" do wizard pra poder ser
// importada como VALOR por server components (a page de /novo). Importar um const
// de um módulo client num RSC vira client-reference proxy e quebra em runtime.
export const CATEGORIES = ["vehicle", "real_estate", "investment", "cash", "other"] as const;
export type Category = (typeof CATEGORIES)[number];
