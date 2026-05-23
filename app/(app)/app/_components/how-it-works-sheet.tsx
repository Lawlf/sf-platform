"use client";

import { HelpCircle, Sparkles } from "lucide-react";

import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/app/components/ui/sheet";

const TOPICS = {
  "saldo-livre": {
    title: "Saldo livre por mês",
    tag: "Conceito",
    body: "É o que sobra da sua renda mensal depois de pagar todas as parcelas e contas fixas. Quanto maior, mais flexibilidade você tem pra poupar, investir ou amortizar dívidas.",
    technical:
      "Cálculo: soma de renda mensal equivalente (incluindo semanais convertidas) menos soma das parcelas atuais (financiamento, empréstimo, mínimo do cartão a 15%, juros do cheque especial).",
  },
  "renda-comprometida": {
    title: "Renda comprometida",
    tag: "Conceito",
    body: "É a parte da sua renda mensal que vai pra pagar dívidas. Se você ganha R$ 8.500 e paga R$ 2.380 em parcelas, sua renda comprometida é 28%. Bancos costumam considerar saudável até 30%. Acima de 50%, fica difícil pagar contas básicas.",
    technical:
      "Fórmula: (soma das parcelas mensais) dividido pela renda mensal equivalente. Parcelas incluem financiamento (Price ou SAC), empréstimo (parcela fixa) e mínimo do cartão (15% da fatura).",
  },
  cet: {
    title: "CET (Custo Efetivo Total)",
    tag: "Conceito",
    body: "Mostra o custo real anual do empréstimo, incluindo juros, taxas administrativas, seguros e IOF. É o número que permite comparar produtos diferentes com a mesma régua. Bancos são obrigados pela Lei a informar o CET.",
    technical:
      "É a taxa interna de retorno (IRR) do fluxo de caixa do contrato. Calculada por Newton-Raphson resolvendo: principal líquido igual à soma das parcelas descontadas pelo CET.",
  },
  "price-vs-sac": {
    title: "Price vs SAC",
    tag: "Conceito",
    body: "Price (Sistema Francês): parcela fixa do começo ao fim. Mais previsível. Você paga muito juros no início e quase nada no fim. SAC (Sistema de Amortização Constante): parcela cai com o tempo. Começa alta e termina baixa. Total de juros pago é menor que Price.",
    technical:
      "Price: parcela = P x i / (1 - (1+i)^-n). SAC: amortização constante = P/n, juros do mês = saldo x i.",
  },
  iof: {
    title: "Valor recebido vs contratado",
    tag: "Conceito",
    body: "Valor recebido é o que cai na sua conta. Valor contratado é o que entra na sua dívida e você precisa pagar, incluindo IOF e tarifas embutidas. A diferença geralmente é entre 2% e 6% do valor pra empréstimo pessoal.",
    technical:
      "IOF empréstimo pessoa física (2026): 0,38% fixo + 0,0082% ao dia limitado a 3% (365 dias). Tarifas de cadastro/abertura variam por banco. Tudo isso entra no principal contratado para fins de Price e CET.",
  },
  rotativo: {
    title: "Rotativo do cartão",
    tag: "Conceito",
    body: "Quando você paga só o mínimo da fatura, o restante vira rotativo: o banco financia o saldo com juros altíssimos (média 400% ao ano). É a dívida mais cara do mercado brasileiro. Em 1 mês a fatura pode dobrar.",
    technical:
      "Pelo Bacen (2017+), o rotativo só pode durar 1 mês. Depois disso, deve virar parcelamento de fatura com juros menores. Mas mesmo o parcelamento costuma ter taxas de 8% a 15% ao mês.",
  },
  "cheque-especial": {
    title: "Como o cheque especial cobra juros",
    tag: "Conceito",
    body: "Cheque especial cobra juros diários sobre o saldo devedor. Diferente do empréstimo, não tem parcela: o saldo cresce todo dia que você fica negativo. É a 2ª dívida mais cara do mercado, ficando atrás só do rotativo.",
    technical:
      "Cap legal de 8% ao mês (Bacen 2020). Se você usar R$ 1.000 do cheque especial por 30 dias, paga ~R$ 80 só de juros. Vale sempre quitar antes do salário entrar pra zerar o saldo.",
  },
  acoes: {
    title: "Como funciona o acompanhamento de ações?",
    tag: "Patrimônio",
    body: "Cadastre suas ações informando o ticker, quantos papéis você tem e o preço médio que pagou. Toque em Atualizar cotação para ver o preço atual e quanto você ganhou ou perdeu até agora.",
    technical:
      "Ganho ou perda é calculado como (cotação atual menos preço médio) multiplicado pela quantidade de ações. No plano Pro, suas cotações atualizam sozinhas todo dia.",
  },
  "manutencao-reservas": {
    title: "Quando devo revisar minhas reservas?",
    tag: "Manutenção",
    body: "A cada 30 dias, lembramos você de conferir suas reservas que rendem. Verifique se a taxa (% do CDI ou ao ano) mudou, atualize o saldo se sacou ou depositou, e marque como revisada para zerar o contador.",
    technical:
      "Reservas com rendimento (cash + yieldType diferente de none) cuja última revisão foi há 30 dias ou mais entram no lembrete. Em breve no plano Pro: revisão automática via Open Finance, dispensando o ajuste manual.",
  },
} as const;

export type HowItWorksTopic = keyof typeof TOPICS;
export type HowItWorksVariant = "chip" | "brand" | "plain";

export interface HowItWorksSheetProps {
  topic: HowItWorksTopic;
  triggerClassName?: string;
  variant?: HowItWorksVariant;
}

const TRIGGER_CLASSES: Record<HowItWorksVariant, string> = {
  chip: "focus-ring inline-flex items-center gap-1.5 rounded-full bg-white/20 px-2.5 py-1 text-[11px] font-semibold text-current backdrop-blur-sm transition-colors hover:bg-white/30",
  brand:
    "focus-ring inline-flex items-center gap-1.5 rounded-full border border-[color:var(--border-soft)] bg-[color:var(--surface-3)] px-2.5 py-1 text-[11px] font-semibold text-[color:var(--color-brand-800)] backdrop-blur-md transition-colors hover:bg-[color:var(--surface-1)]",
  plain:
    "focus-ring inline-flex items-center gap-1 text-[12px] font-semibold text-[color:var(--color-brand-800)] underline-offset-2 hover:underline",
};

export function HowItWorksSheet({
  topic,
  triggerClassName,
  variant = "chip",
}: HowItWorksSheetProps) {
  const data = TOPICS[topic];
  const triggerClass = `${TRIGGER_CLASSES[variant]} ${triggerClassName ?? ""}`.trim();
  const showIcon = variant !== "plain";

  return (
    <Sheet>
      <SheetTrigger asChild>
        <button type="button" className={triggerClass} aria-label={`Como funciona ${data.title}`}>
          {showIcon ? <HelpCircle size={12} strokeWidth={2.5} aria-hidden /> : null}
          Como funciona
        </button>
      </SheetTrigger>

      <SheetContent side="bottom" className="px-6 pb-8 pt-3">
        <div
          className="mx-auto mb-5 h-1 w-10 rounded-full bg-[color:var(--border-strong)] md:hidden"
          aria-hidden
        />

        <SheetHeader className="gap-3">
          <span className="inline-flex w-fit items-center gap-1.5 rounded-full bg-[color:var(--color-brand-500)]/[0.14] px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.6px] text-[color:var(--color-brand-800)]">
            <Sparkles size={11} strokeWidth={2.25} aria-hidden />
            {data.tag}
          </span>
          <SheetTitle>{data.title}</SheetTitle>
        </SheetHeader>

        <SheetDescription className="mt-3 text-[14px] leading-relaxed text-[color:var(--text-primary)]">
          {data.body}
        </SheetDescription>

        {data.technical ? (
          <div className="mt-5 rounded-2xl border border-[color:var(--border-soft)] bg-[color:var(--surface-2)] p-4">
            <div className="mb-1.5 text-[10px] font-bold uppercase tracking-[0.6px] text-[color:var(--color-brand-800)]">
              Para quem quer detalhe técnico
            </div>
            <p className="text-[13px] leading-relaxed text-[color:var(--text-secondary)]">
              {data.technical}
            </p>
          </div>
        ) : null}
      </SheetContent>
    </Sheet>
  );
}
