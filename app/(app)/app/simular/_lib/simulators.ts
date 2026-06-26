import {
  Activity,
  Banknote,
  Briefcase,
  Calculator,
  Clock,
  CreditCard,
  Divide,
  FileText,
  Gift,
  Landmark,
  Layers,
  LineChart,
  Palmtree,
  Percent,
  PiggyBank,
  Rocket,
  Scale,
  ShieldCheck,
  ShoppingBag,
  Tag,
  Target,
  TrendingUp,
  type LucideIcon,
} from "lucide-react";
import type { Route } from "next";

/**
 * Registry único dos simuladores: fonte de verdade que alimenta o hub (busca +
 * seções por categoria) e fica disponível para cross-link/uso interno. Os
 * engines de cálculo ficam em `src/domain/services` (puros, reutilizáveis); aqui
 * mora só a metadata de descoberta/UI.
 */
export type SimCategoryId =
  | "dividas"
  | "patrimonio"
  | "trabalho"
  | "negocio"
  | "decisoes"
  | "ferramentas";

// Ordem pela dor do ICP: o que pesa no mês primeiro; jargão/negócio/ferramentas
// técnicas por último.
export const SIM_CATEGORIES: ReadonlyArray<{ id: SimCategoryId; label: string }> = [
  { id: "dividas", label: "Dívidas" },
  { id: "patrimonio", label: "Investir & Patrimônio" },
  { id: "decisoes", label: "Compras & Decisões" },
  { id: "trabalho", label: "Trabalho" },
  { id: "negocio", label: "Negócio (PJ)" },
  { id: "ferramentas", label: "Mais ferramentas" },
];

// Os que respondem a dor direta do ICP (autônomo, renda irregular). Aparecem
// numa secao "Pra voce agora" no topo, sem sair das categorias.
const FEATURED_IDS: ReadonlyArray<string> = [
  "reserva",
  "rotativo",
  "compra",
  "valor-hora",
  "onde-rende-mais",
];

export interface SimulatorMeta {
  id: string;
  href: Route;
  title: string;
  desc: string;
  icon: LucideIcon;
  category: SimCategoryId;
  /** Sinônimos e termos para a busca (sem acento já normalizado na busca). */
  keywords: string[];
}

export const SIMULATORS: ReadonlyArray<SimulatorMeta> = [
  // Investir & Patrimônio
  {
    id: "independencia",
    href: "/app/simular/independencia" as Route,
    title: "Independência financeira",
    desc: "Quando seu patrimônio paga suas contas?",
    icon: Rocket,
    category: "patrimonio",
    keywords: ["independencia", "liberdade", "aposentadoria", "fire", "renda passiva", "4%", "viver de renda", "parar de trabalhar", "dividendos"],
  },
  {
    id: "meta-investimento",
    href: "/app/simular/meta" as Route,
    title: "Meta de investimento",
    desc: "Quanto aportar por mês pra chegar lá?",
    icon: Target,
    category: "patrimonio",
    keywords: ["meta", "objetivo", "aporte", "quanto guardar", "entrada", "sonho", "planejar", "quanto investir", "aporte mensal", "chegar na meta"],
  },
  {
    id: "juros-compostos",
    href: "/app/simular/juros-compostos" as Route,
    title: "Juros compostos",
    desc: "Quanto seu dinheiro vira com o tempo?",
    icon: LineChart,
    category: "patrimonio",
    keywords: ["juros", "compostos", "aporte", "investir", "rendimento", "bola de neve", "render", "crescer dinheiro", "longo prazo"],
  },
  {
    id: "onde-rende-mais",
    href: "/app/simular/onde-rende-mais" as Route,
    title: "Onde rende mais?",
    desc: "Poupança, CDB ou Tesouro, já líquido.",
    icon: PiggyBank,
    category: "patrimonio",
    keywords: ["poupanca", "cdb", "tesouro", "selic", "render", "aplicar", "cdi", "investir", "comparar investimento", "melhor rendimento", "lci", "lca"],
  },
  {
    id: "reserva",
    href: "/app/simular/reserva" as Route,
    title: "Reserva de emergência",
    desc: "Quantos meses você aguenta sem renda?",
    icon: ShieldCheck,
    category: "patrimonio",
    keywords: ["reserva", "emergencia", "colchao", "custo fixo", "meses", "fundo de emergencia", "quanto guardar", "imprevisto", "seguranca"],
  },
  // Dívidas
  {
    id: "quitacao",
    href: "/app/simular/quitacao" as Route,
    title: "Projeção de quitação",
    desc: "Quando uma dívida termina?",
    icon: Calculator,
    category: "dividas",
    keywords: ["quitacao", "divida", "parcela", "quando termina", "saldo", "quando quito", "fim da divida", "prazo", "tempo pra quitar"],
  },
  {
    id: "extra",
    href: "/app/simular/extra" as Route,
    title: "Pagar extra",
    desc: "Quanto economizo pagando mais?",
    icon: TrendingUp,
    category: "dividas",
    keywords: ["pagar extra", "amortizar", "antecipar", "economia", "juros", "adiantar parcela", "quitar antes", "abater divida"],
  },
  {
    id: "rotativo",
    href: "/app/simular/rotativo" as Route,
    title: "Custo do rotativo do cartão",
    desc: "Pagar só uma parte da fatura, quanto custa?",
    icon: CreditCard,
    category: "dividas",
    keywords: ["rotativo", "cartao", "fatura", "minimo", "juros do cartao", "rolar fatura", "pagamento minimo", "juros altos", "credito rotativo"],
  },
  {
    id: "estrategia",
    href: "/app/simular/estrategia" as Route,
    title: "Qual dívida pagar primeiro",
    desc: "Menor saldo ou juro mais alto?",
    icon: Layers,
    category: "dividas",
    keywords: ["snowball", "avalanche", "bola de neve", "ordem", "estrategia", "dividas", "qual pagar primeiro", "priorizar", "metodo"],
  },
  {
    id: "divida-vs-investir",
    href: "/app/simular/divida-vs-investir" as Route,
    title: "Quitar dívida ou investir?",
    desc: "Onde sua folga rende mais?",
    icon: Scale,
    category: "dividas",
    keywords: ["quitar", "investir", "cdi", "folga", "13o", "bonus", "decisao", "vale a pena quitar", "render mais", "sobra"],
  },
  {
    id: "financiamento",
    href: "/app/simular/financiamento" as Route,
    title: "Financiamento: qual parcela cabe?",
    desc: "Veja a parcela e o custo total.",
    icon: Landmark,
    category: "dividas",
    keywords: ["financiamento", "price", "sac", "imovel", "casa", "carro", "amortizacao", "parcela", "prestacao", "entrada", "veiculo", "apartamento"],
  },
  // Trabalho (CLT)
  {
    id: "salario-clt",
    href: "/app/simular/salario-clt" as Route,
    title: "Salário líquido CLT",
    desc: "Quanto cai na conta após INSS e IR?",
    icon: Banknote,
    category: "trabalho",
    keywords: ["salario", "liquido", "clt", "inss", "irrf", "imposto", "holerite", "contracheque", "quanto recebo", "descontos", "salario bruto"],
  },
  {
    id: "decimo-terceiro",
    href: "/app/simular/decimo-terceiro" as Route,
    title: "13º salário líquido",
    desc: "Quanto sobra do décimo terceiro?",
    icon: Gift,
    category: "trabalho",
    keywords: ["13", "13o", "decimo terceiro", "gratificacao natalina", "parcela", "clt", "natal", "abono"],
  },
  {
    id: "ferias",
    href: "/app/simular/ferias" as Route,
    title: "Férias líquidas",
    desc: "Salário das férias + 1/3, já líquido.",
    icon: Palmtree,
    category: "trabalho",
    keywords: ["ferias", "terco", "1/3", "constitucional", "clt", "descanso", "abono pecuniario", "vender ferias"],
  },
  {
    id: "rescisao",
    href: "/app/simular/rescisao" as Route,
    title: "Rescisão (demissão)",
    desc: "Quanto recebe numa demissão sem justa causa?",
    icon: FileText,
    category: "trabalho",
    keywords: ["rescisao", "demissao", "acerto", "verbas", "fgts", "multa", "aviso previo", "sem justa causa", "fui demitido", "indenizacao", "calcular rescisao"],
  },
  // Negócio (PJ)
  {
    id: "clt-vs-pj",
    href: "/app/simular/clt-vs-pj" as Route,
    title: "CLT ou PJ?",
    desc: "Quanto sobra como CLT e como PJ?",
    icon: Briefcase,
    category: "negocio",
    keywords: ["clt", "pj", "mei", "simples", "pro-labore", "autonomo", "contratar", "freelancer", "das", "vale a pena pj", "carteira assinada", "comparar"],
  },
  {
    id: "valor-hora",
    href: "/app/simular/valor-hora" as Route,
    title: "Valor da sua hora",
    desc: "Quanto vale uma hora do seu trabalho?",
    icon: Clock,
    category: "trabalho",
    keywords: ["valor hora", "hora", "freela", "freelance", "jornada", "hora extra", "clt", "quanto vale minha hora", "precificar", "cobrar por hora", "diaria", "quanto cobrar"],
  },
  {
    id: "margem-markup",
    href: "/app/simular/margem" as Route,
    title: "Preço e lucro por venda",
    desc: "Quanto você lucra em cada venda.",
    icon: Tag,
    category: "negocio",
    keywords: ["margem", "markup", "preco", "lucro", "revenda", "produto", "remarcacao", "precificar", "quanto cobrar", "venda", "lucratividade"],
  },
  {
    id: "ebitda",
    href: "/app/simular/ebitda" as Route,
    title: "Quanto seu negócio gera de caixa",
    desc: "O caixa que sobra da operação.",
    icon: Activity,
    category: "negocio",
    keywords: ["ebitda", "caixa", "operacao", "margem", "receita", "despesas", "negocio", "lucro operacional", "fluxo de caixa", "geracao de caixa"],
  },
  // Compras & Decisões
  {
    id: "compra",
    href: "/app/simular/compra" as Route,
    title: "Vale a pena comprar?",
    desc: "Compare comprar vs investir.",
    icon: ShoppingBag,
    category: "decisoes",
    keywords: ["comprar", "vale a pena", "depreciacao", "custo de oportunidade", "investir", "vale comprar", "comprar agora ou esperar", "consumo"],
  },
  {
    id: "avista-parcelado",
    href: "/app/simular/avista-parcelado" as Route,
    title: "À vista ou parcelado?",
    desc: "Vale o desconto ou parcelar e investir?",
    icon: CreditCard,
    category: "decisoes",
    keywords: ["a vista", "parcelado", "desconto", "parcelas", "valor presente", "pagar a vista", "parcelar", "juros embutidos", "cartao"],
  },
  // Ferramentas
  {
    id: "conversor-juros",
    href: "/app/simular/conversor-juros" as Route,
    title: "Transformar taxa: mês ou ano",
    desc: "Mensal vira anual e vice-versa.",
    icon: Percent,
    category: "ferramentas",
    keywords: ["conversor", "taxa", "juros", "mensal", "anual", "am", "aa", "equivalente", "converter taxa", "ao mes ao ano", "transformar juros"],
  },
  {
    id: "regra-de-tres",
    href: "/app/simular/regra-de-tres" as Route,
    title: "Regra de três",
    desc: "Ache um valor proporcional.",
    icon: Divide,
    category: "ferramentas",
    keywords: ["regra de tres", "proporcao", "proporcional", "direta", "inversa", "calcular proporcao", "porcentagem", "calculo simples"],
  },
];

/** Os simuladores em destaque ("Pra você agora"), na ordem de `FEATURED_IDS`. */
export function featuredSimulators(): SimulatorMeta[] {
  return FEATURED_IDS.map((id) => SIMULATORS.find((s) => s.id === id)).filter(
    (s): s is SimulatorMeta => s != null,
  );
}

/** Agrupa os simuladores por categoria, na ordem de `SIM_CATEGORIES`. */
export function simulatorsByCategory(): ReadonlyArray<{
  id: SimCategoryId;
  label: string;
  items: SimulatorMeta[];
}> {
  return SIM_CATEGORIES.map((cat) => ({
    id: cat.id,
    label: cat.label,
    items: SIMULATORS.filter((s) => s.category === cat.id),
  })).filter((group) => group.items.length > 0);
}

/** Normaliza texto para busca: minúsculas e sem acentos. */
export function normalizeForSearch(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim();
}

/** Filtra simuladores por uma consulta (título, descrição e palavras-chave). */
export function searchSimulators(query: string): SimulatorMeta[] {
  const q = normalizeForSearch(query);
  if (q === "") return [];
  return SIMULATORS.filter((s) => {
    const haystack = normalizeForSearch(`${s.title} ${s.desc} ${s.keywords.join(" ")}`);
    return haystack.includes(q);
  });
}
