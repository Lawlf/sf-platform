export type ExpenseCategory =
  | "Mercado"
  | "Alimentação"
  | "Transporte"
  | "Moradia"
  | "Saúde"
  | "Compras"
  | "Lazer"
  | "Educação"
  | "Serviços"
  | "Outros";

const RULES: ReadonlyArray<{ category: ExpenseCategory; keywords: readonly string[] }> = [
  {
    category: "Mercado",
    keywords: ["mercado", "supermerc", "atacad", "hortifruti", "padaria", "acougue", "sacolao"],
  },
  {
    category: "Alimentação",
    keywords: [
      "restaurante",
      "ifood",
      "rappi",
      "lanch",
      "bar ",
      "cafe",
      "pizzar",
      "burguer",
      "hamburg",
      "food",
      "doceria",
      "sorvete",
    ],
  },
  {
    category: "Transporte",
    keywords: [
      "uber",
      "99app",
      "99 ",
      "99pop",
      "cabify",
      "posto",
      "combustiv",
      "ipiranga",
      "shell",
      "metro",
      "onibus",
      "bilhete unico",
      "estacion",
      "pedagio",
      "sem parar",
      "conectcar",
    ],
  },
  {
    category: "Moradia",
    keywords: [
      "aluguel",
      "condominio",
      "imobiliaria",
      "luz",
      "energia",
      "enel",
      "cemig",
      "cpfl",
      "light",
      "agua",
      "sanea",
      "sabesp",
      "gas ",
      "comgas",
      "internet",
      "vivo",
      "claro",
      "tim ",
      "net ",
      "oi fibra",
    ],
  },
  {
    category: "Saúde",
    keywords: [
      "farmacia",
      "drogaria",
      "droga ",
      "hospital",
      "clinica",
      "medic",
      "laborator",
      "saude",
      "odonto",
      "dentista",
      "psico",
      "academia",
      "smartfit",
    ],
  },
  {
    category: "Compras",
    keywords: [
      "loja",
      "magaz",
      "amazon",
      "mercadolivre",
      "mercado livre",
      "shopee",
      "aliexpress",
      "americanas",
      "renner",
      "riachuelo",
      "c&a",
      "zara",
      "centauro",
      "casas bahia",
    ],
  },
  {
    category: "Lazer",
    keywords: [
      "netflix",
      "spotify",
      "cinema",
      "prime video",
      "disney",
      "hbo",
      "max ",
      "globoplay",
      "steam",
      "playstation",
      "xbox",
      "game",
      "viagem",
      "hotel",
      "airbnb",
      "decolar",
      "latam",
      "gol ",
      "azul ",
    ],
  },
  {
    category: "Educação",
    keywords: ["escola", "faculdade", "universidade", "curso", "udemy", "alura", "livraria", "ensino"],
  },
  {
    category: "Serviços",
    keywords: [
      "assinatura",
      "mensalidade",
      "anuidade",
      "tarifa",
      "taxa ",
      "seguro",
      "cartorio",
      "advog",
      "contabil",
    ],
  },
];

export function classifyExpense(description: string): ExpenseCategory {
  const memo = description.toLowerCase();
  for (const rule of RULES) {
    if (rule.keywords.some((kw) => memo.includes(kw))) return rule.category;
  }
  return "Outros";
}
