import { Check, Minus } from "lucide-react";

interface Row {
  feature: string;
  hint?: string;
  free: boolean | string;
  pro: boolean | string;
}

interface Group {
  label: string;
  rows: Row[];
}

const GROUPS: Group[] = [
  {
    label: "Lançamentos e dados",
    rows: [
      {
        feature: "Dívidas ilimitadas",
        hint: "Financiamento, cartão, cheque especial, empréstimo, crediário.",
        free: true,
        pro: true,
      },
      {
        feature: "Renda ilimitada",
        hint: "Salário, freela, aluguel, comissão, bônus, 13º, restituição.",
        free: true,
        pro: true,
      },
      {
        feature: "Patrimônio (snapshot atual)",
        hint: "Carro, casa, móveis caros, eletrônicos.",
        free: true,
        pro: true,
      },
      {
        feature: "Linha do tempo (mês corrente)",
        free: true,
        pro: true,
      },
      {
        feature: "Histórico completo da linha do tempo",
        hint: "Sua trajetória mês a mês, não só o saldo de hoje.",
        free: false,
        pro: true,
      },
    ],
  },
  {
    label: "Análises e simuladores",
    rows: [
      {
        feature: "Dashboard com fluxo de caixa",
        free: true,
        pro: true,
      },
      {
        feature: "Custo real dos juros, somando tudo",
        hint: "CET ponderado.",
        free: true,
        pro: true,
      },
      {
        feature: "Quanto da renda está comprometido",
        free: true,
        pro: true,
      },
      {
        feature: "Projeção de quitação",
        hint: "Data exata no ritmo atual.",
        free: true,
        pro: true,
      },
      {
        feature: "Plano de saída mês a mês",
        hint: "No ritmo atual, em que mês cada dívida sai e pra onde vai sua sobra, mês a mês até o fim.",
        free: false,
        pro: true,
      },
      {
        feature: "Simulador: pagar mais por mês",
        free: true,
        pro: true,
      },
      {
        feature: "Simulador: ordem ótima de quitação",
        free: true,
        pro: true,
      },
      {
        feature: "Simulador: posso comprar isso?",
        free: true,
        pro: true,
      },
      {
        feature: "Comparar financiamentos lado a lado",
        hint: "Parcela fixa, parcela decrescente, banco A vs B.",
        free: false,
        pro: true,
      },
      {
        feature: "Comparar ofertas de empréstimo",
        free: false,
        pro: true,
      },
    ],
  },
  {
    label: "Investimentos",
    rows: [
      {
        feature: "Acompanhar ações da B3",
        hint: "Você declara o que tem, a gente puxa o preço e soma no patrimônio.",
        free: false,
        pro: true,
      },
      {
        feature: "Acompanhar criptomoedas",
        hint: "Bitcoin, Ethereum e principais. Mesmo modelo das ações.",
        free: false,
        pro: true,
      },
      {
        feature: "Valorização e desvalorização automática",
        free: false,
        pro: true,
      },
    ],
  },
  {
    label: "Avisos de vencimento",
    rows: [
      {
        feature: "Vencimentos próximos na tela",
        hint: "As parcelas que vencem nos próximos dias aparecem na sua lista de dívidas.",
        free: true,
        pro: true,
      },
      {
        feature: "Aviso de vencimento no celular",
        hint: "O lembrete chega por push e email, sem precisar abrir o app.",
        free: false,
        pro: true,
      },
      {
        feature: "Lembrete pra fechar o mês",
        hint: "Todo começo de mês, um aviso no celular pra você abrir e atualizar o que mudou.",
        free: false,
        pro: true,
      },
    ],
  },
  {
    label: "Em conjunto",
    rows: [
      {
        feature: "Visão conjunta do casal ou da família",
        hint: "Convide alguém e vejam renda, dívida e patrimônio somados, no nível de detalhe que escolherem.",
        free: false,
        pro: true,
      },
    ],
  },
  {
    label: "Exportação e privacidade",
    rows: [
      {
        feature: "Exportar CSV e PDF",
        free: true,
        pro: true,
      },
      {
        feature: "Lançamento manual, no seu ritmo",
        free: true,
        pro: true,
      },
      {
        feature: "Servidores no Brasil, LGPD",
        free: true,
        pro: true,
      },
    ],
  },
];

export function PlanComparison() {
  return (
    <div className="space-y-10">
      {GROUPS.map((group) => (
        <section key={group.label}>
          <h3 className="text-[13px] font-bold text-[color:var(--text-primary)]">
            {group.label}
          </h3>

          <div className="mt-3 overflow-hidden rounded-2xl border border-[color:var(--border-soft)] bg-[color:var(--surface-1)] backdrop-blur-md">
            <div className="hidden grid-cols-[1.5fr_0.6fr_0.6fr] items-center border-b border-[color:var(--border-soft)] bg-[color:var(--surface-2)] px-5 py-3 text-[11px] font-semibold uppercase tracking-wide text-[color:var(--text-muted)] sm:grid">
              <span>Recurso</span>
              <span className="text-center">Free</span>
              <span className="text-center">Pro</span>
            </div>

            <ul className="divide-y divide-[color:var(--border-soft)]">
              {group.rows.map((row) => (
                <li
                  key={row.feature}
                  className="grid grid-cols-[1fr_0.4fr_0.4fr] items-center gap-3 px-4 py-4 sm:grid-cols-[1.5fr_0.6fr_0.6fr] sm:px-5"
                >
                  <div className="min-w-0">
                    <p className="text-[14px] font-semibold text-[color:var(--text-primary)]">
                      {row.feature}
                    </p>
                    {row.hint ? (
                      <p className="mt-0.5 text-[12px] leading-snug text-[color:var(--text-muted)]">
                        {row.hint}
                      </p>
                    ) : null}
                  </div>
                  <CellValue value={row.free} tone="free" />
                  <CellValue value={row.pro} tone="pro" />
                </li>
              ))}
            </ul>
          </div>
        </section>
      ))}
    </div>
  );
}

function CellValue({
  value,
  tone,
}: {
  value: boolean | string;
  tone: "free" | "pro";
}) {
  if (value === true) {
    return (
      <div className="flex justify-center">
        <span
          className={
            tone === "pro"
              ? "flex h-7 w-7 items-center justify-center rounded-full bg-[color:var(--color-brand-500)] text-white"
              : "flex h-7 w-7 items-center justify-center rounded-full bg-[color:var(--color-positive)]/15 text-[color:var(--color-positive)]"
          }
        >
          <Check className="h-3.5 w-3.5" strokeWidth={3} aria-hidden />
        </span>
        <span className="sr-only">Incluso</span>
      </div>
    );
  }

  if (value === false) {
    return (
      <div className="flex justify-center text-[color:var(--text-muted)]">
        <Minus className="h-4 w-4" strokeWidth={2.5} aria-hidden />
        <span className="sr-only">Não incluso</span>
      </div>
    );
  }

  return (
    <div className="text-center text-[13px] font-semibold text-[color:var(--text-primary)]">
      {value}
    </div>
  );
}
