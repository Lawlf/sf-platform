import {
  Accessibility,
  Bell,
  Crown,
  FileUp,
  Files,
  Globe,
  HelpCircle,
  Info,
  KeyRound,
  LayoutGrid,
  MessageCircle,
  Palette,
  Plug,
  Scale,
  ScrollText,
  ShieldCheck,
  SlidersHorizontal,
  Tag,
  UserCog,
  Users,
} from "lucide-react";
import type { Route } from "next";

export interface SettingItem {
  href: Route;
  label: string;
  description: string;
  icon: typeof Palette;
  disabled?: boolean;
  /** Sinônimos e jargão para a busca achar pelo termo que o usuário pensa. */
  keywords?: string[];
}

export interface SettingSection {
  title: string;
  items: SettingItem[];
}

export const SETTINGS_SECTIONS: SettingSection[] = [
  {
    title: "Minha conta",
    items: [
      {
        href: "/app/perfil/conta" as Route,
        label: "Dados pessoais",
        description: "Nome e email.",
        icon: UserCog,
        keywords: ["nome", "email", "conta", "perfil", "telefone", "dados"],
      },
      {
        href: "/app/configuracoes/planos" as Route,
        label: "Plano",
        description: "Veja seu plano atual.",
        icon: Crown,
        keywords: ["assinatura", "pro", "premium", "pagamento", "cobranca", "upgrade", "fatura", "preco"],
      },
      {
        href: "/app/perfil/seguranca" as Route,
        label: "Segurança",
        description: "Sessões ativas e desativar conta.",
        icon: KeyRound,
        keywords: ["senha", "login", "sessao", "2fa", "autenticacao", "passkey", "sair", "desativar", "excluir conta", "apagar conta"],
      },
      {
        href: "/app/lar" as Route,
        label: "Nosso lar",
        description: "Convites e o que você compartilha com quem divide as contas.",
        icon: Users,
        keywords: ["familia", "casal", "compartilhar", "convite", "household", "conjunto", "dividir"],
      },
    ],
  },
  {
    title: "Meus dados",
    items: [
      {
        href: "/app/configuracoes/importacao-de-dados/extrato" as Route,
        label: "Importar extrato do banco",
        description: "Baixe o extrato no app do seu banco e suba aqui.",
        icon: FileUp,
        keywords: ["ofx", "extrato", "importar", "banco", "csv", "arquivo", "upload", "transacoes"],
      },
      {
        href: "/app/configuracoes/integracoes" as Route,
        label: "Assistente de IA",
        description: "Conecte o ChatGPT ou Claude pra cuidar dos números por conversa.",
        icon: Plug,
        keywords: ["mcp", "chatgpt", "claude", "integracao", "integracoes", "conectar", "ia", "api", "token", "assistente"],
      },
      {
        href: "/app/configuracoes/documentos" as Route,
        label: "Meus documentos",
        description: "Contratos e comprovantes que você guardou.",
        icon: Files,
        keywords: ["anexos", "comprovantes", "contratos", "arquivos", "documentos", "pdf"],
      },
    ],
  },
  {
    title: "Meu mês",
    items: [
      {
        href: "/app/perfil/notificacoes" as Route,
        label: "Notificações",
        description: "Quando a gente te chama: conta pra vencer e fim do mês.",
        icon: Bell,
        keywords: ["alertas", "push", "avisos", "lembrete", "notificacao"],
      },
      {
        href: "/app/configuracoes/acessos-rapidos" as Route,
        label: "Acessos rápidos",
        description: "Escolha os atalhos da sua home.",
        icon: LayoutGrid,
        keywords: ["atalhos", "home", "inicio", "acessos"],
      },
      {
        href: "/app/configuracoes/categorias" as Route,
        label: "Categorias",
        description: "As fatias do seu mês. Crie, renomeie ou esconda as que não usa.",
        icon: Tag,
        keywords: ["categoria", "fatias", "gastos", "tags"],
      },
    ],
  },
];

export const SETTINGS_ADVANCED_SECTIONS: SettingSection[] = [
  {
    title: "Ajustes finos",
    items: [
      {
        href: "/app/configuracoes/perfis" as Route,
        label: "Perfis",
        description: "Separe o dinheiro pessoal do dinheiro do seu negócio.",
        icon: SlidersHorizontal,
        keywords: ["perfil", "pessoal", "negocio", "pj", "pf", "separar", "empresa"],
      },
      {
        href: "/app/configuracoes/estilo" as Route,
        label: "Estilo com dinheiro",
        description: "Como você lida com dinheiro.",
        icon: Scale,
        keywords: ["estilo", "comportamento", "perfil financeiro"],
      },
      {
        href: "/app/configuracoes/idioma-regiao" as Route,
        label: "Idioma e região",
        description: "Português (Brasil). Escolha a moeda padrão dos seus lançamentos.",
        icon: Globe,
        keywords: ["idioma", "lingua", "moeda", "regiao", "currency", "dolar", "real", "cambio"],
      },
      {
        href: "/app/perfil/aparencia" as Route,
        label: "Aparência",
        description: "Tema claro, escuro ou seguir sistema.",
        icon: Palette,
        keywords: ["tema", "escuro", "claro", "dark", "light", "cores", "modo noturno"],
      },
      {
        href: "/app/perfil/acessibilidade" as Route,
        label: "Acessibilidade",
        description: "Modo daltônico e leitura.",
        icon: Accessibility,
        keywords: ["daltonico", "contraste", "leitura", "fonte", "tamanho", "a11y", "movimento"],
      },
    ],
  },
  {
    title: "Suporte",
    items: [
      {
        href: "/app/ajuda" as Route,
        label: "Ajuda e FAQ",
        description: "Tire dúvidas e veja respostas rápidas.",
        icon: HelpCircle,
        keywords: ["ajuda", "duvida", "faq", "suporte", "como"],
      },
      {
        href: "/app/falar-com-a-gente" as Route,
        label: "Falar com a gente",
        description: "Conte um problema, sugestão ou dúvida. Respondemos aqui no app.",
        icon: MessageCircle,
        keywords: ["suporte", "contato", "feedback", "problema", "bug", "sugestao", "reclamar"],
      },
      {
        href: "/app/configuracoes/sobre" as Route,
        label: "Sobre o app",
        description: "O Sabor Financeiro e onde a gente anda nas redes.",
        icon: Info,
        keywords: ["sobre", "versao", "redes", "instagram", "tiktok"],
      },
    ],
  },
  {
    title: "Documentos",
    items: [
      {
        href: "/termos" as Route,
        label: "Termos de uso",
        description: "Regras de uso da plataforma.",
        icon: ScrollText,
        keywords: ["termos", "regras", "uso"],
      },
      {
        href: "/privacidade" as Route,
        label: "Política de privacidade",
        description: "Como tratamos seus dados.",
        icon: ShieldCheck,
        keywords: ["privacidade", "dados", "lgpd"],
      },
    ],
  },
];
