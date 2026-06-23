import { z } from "zod";

// Mensagens de validação em PT-BR por padrão. Mensagens explícitas (.min(1, "..."))
// continuam vencendo; isto só cobre os validadores sem mensagem, que senão cairiam
// no inglês padrão do zod v4 na cara do usuário. Importado como side-effect no
// root server (layout) e no root client (query-provider) pra valer nos dois runtimes.
z.config(z.locales.pt());
