import type { ReactNode } from "react";

import type { Beat, ModuleBeats } from "../../_lib/beats";

const TICK = "linear-gradient(90deg, #f28e25, transparent)";
const BRAND_GRADIENT = "linear-gradient(135deg, #ef7a1a, #f28e25 60%, #f4a13a)";

function Eyebrow({ children }: { children: ReactNode }) {
  return (
    <div className="inline-flex items-center gap-1.5 text-[0.625rem] font-bold uppercase tracking-[0.08em] text-[color:var(--brand-ink)]">
      <span className="block h-[1.5px] w-3.5 rounded-full" style={{ background: TICK }} />
      {children}
    </div>
  );
}

function Cap({ children }: { children: ReactNode }) {
  return (
    <h2 className="mb-3 font-serif text-[1.3125rem] font-bold leading-[1.2] tracking-[-0.015em] text-[color:var(--text-primary)]">
      {children}
    </h2>
  );
}

function Capa() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center text-center">
      <Eyebrow>Sabor Financeiro</Eyebrow>
      <div className="mt-2 text-[0.6875rem] text-[color:var(--text-muted)]">Trilha · Sair do vermelho</div>
      <h1 className="mt-4 font-serif text-[1.875rem] font-bold leading-[1.06] tracking-[-0.025em] text-[color:var(--text-primary)]">
        Quanto você realmente paga
      </h1>
      <div className="mt-3 text-[0.6875rem] font-semibold text-[color:var(--text-muted)]">Módulo 1 de 3</div>
    </div>
  );
}

function Numeros() {
  return (
    <div className="flex flex-1 flex-col justify-center">
      <Cap>A parcela e a taxa não contam tudo</Cap>
      <div className="flex flex-col gap-2.5">
        <div className="flex gap-2.5">
          <div className="flex-1 rounded-[16px] border border-[color:var(--color-brand-500)]/[0.28] bg-[color:var(--color-brand-500)]/[0.07] px-2 py-3 text-center">
            <div className="text-[0.625rem] uppercase tracking-[0.06em] text-[color:var(--text-muted)]">Parcela</div>
            <div className="mt-0.5 font-serif text-[1.1875rem] font-bold text-[color:var(--text-primary)]">R$ 320</div>
          </div>
          <div className="flex-1 rounded-[16px] border border-[color:var(--color-brand-500)]/[0.28] bg-[color:var(--color-brand-500)]/[0.07] px-2 py-3 text-center">
            <div className="text-[0.625rem] uppercase tracking-[0.06em] text-[color:var(--text-muted)]">Taxa</div>
            <div className="mt-0.5 font-serif text-[1.1875rem] font-bold text-[color:var(--text-primary)]">3,5% a.m.</div>
          </div>
        </div>
        <div className="flex items-center justify-center gap-2.5 rounded-[16px] border border-[color:var(--border-soft)] bg-[color:var(--surface-1)] p-4 backdrop-blur-xl">
          <span className="font-serif text-[1.875rem] font-bold text-[color:var(--brand-ink)]">?</span>
          <span className="text-[0.8125rem] text-[color:var(--text-secondary)]">Custo real da dívida</span>
        </div>
      </div>
    </div>
  );
}

function Recibo() {
  const li = "flex justify-between py-1 text-[0.78125rem] text-[color:var(--text-secondary)]";
  return (
    <div className="flex flex-1 flex-col justify-center">
      <Cap>O CET é a conta inteira</Cap>
      <div className="rounded-[16px] border border-[color:var(--border-soft)] bg-[color:var(--surface-1)] p-4 backdrop-blur-xl">
        <div className={li}>
          Prato <b className="font-semibold text-[color:var(--text-primary)]">juros</b>
        </div>
        <div className={li}>
          Água <b className="font-semibold text-[color:var(--text-primary)]">tarifas</b>
        </div>
        <div className={li}>
          Couvert <b className="font-semibold text-[color:var(--text-primary)]">IOF</b>
        </div>
        <div className={li}>
          Gorjeta <b className="font-semibold text-[color:var(--text-primary)]">seguros</b>
        </div>
        <div className="my-2 h-px bg-[color:var(--border-strong)]" />
        <div className="flex items-baseline justify-between">
          <span className="font-serif text-[0.875rem] font-bold text-[color:var(--text-primary)]">A conta inteira</span>
          <span
            className="bg-clip-text font-serif text-[1.375rem] font-bold text-transparent"
            style={{ backgroundImage: BRAND_GRADIENT }}
          >
            = CET
          </span>
        </div>
      </div>
      <div className="mt-2.5 flex justify-center">
        <Eyebrow>Custo Efetivo Total</Eyebrow>
      </div>
    </div>
  );
}

function Lei() {
  return (
    <div className="flex flex-1 flex-col justify-center">
      <Cap>Mostrar o CET é lei</Cap>
      <div className="rounded-[16px] border border-[color:var(--border-soft)] bg-[color:var(--surface-1)] p-4 backdrop-blur-xl">
        <div className="text-[0.8125rem] text-[color:var(--text-secondary)]">Contrato de crédito</div>
        <div className="mt-1.5 text-[0.8125rem] text-[color:var(--text-muted)] opacity-60">
          Valor ······ Prazo ······ Parcela ······
        </div>
        <div className="mt-2.5 rounded-[14px] border border-[color:var(--color-brand-500)]/[0.28] bg-[color:var(--color-brand-500)]/[0.07] px-3 py-2.5">
          <div className="text-[0.625rem] uppercase tracking-[0.06em] text-[color:var(--text-muted)]">
            Custo Efetivo Total
          </div>
          <div className="mt-0.5 font-serif text-[1.1875rem] font-bold text-[color:var(--text-primary)]">
            CET ___ % a.a.
          </div>
        </div>
        <span className="mt-3 inline-block rotate-[-3deg] rounded-[8px] border-[1.5px] border-[color:var(--color-brand-500)] px-2.5 py-1 text-[0.625rem] font-bold uppercase tracking-[0.08em] text-[color:var(--brand-ink)]">
          Exigido por lei
        </span>
      </div>
    </div>
  );
}

function Comparar() {
  return (
    <div className="flex flex-1 flex-col justify-center">
      <Cap>Compare pelo CET, não pela parcela</Cap>
      <div className="flex gap-2.5">
        <div className="flex-1 rounded-[16px] border border-[color:var(--border-soft)] bg-[color:var(--surface-1)] p-3.5 backdrop-blur-xl">
          <div className="text-[0.6875rem] text-[color:var(--text-muted)]">Proposta A</div>
          <div className="mt-1 text-[0.8125rem] text-[color:var(--text-secondary)]">
            Parcela <b className="font-semibold text-[color:var(--text-primary)]">R$ 320</b>
          </div>
          <div className="mt-2 rounded-[12px] border border-[color:var(--border-soft)] px-2 py-2 text-center">
            <div className="text-[0.625rem] uppercase tracking-[0.06em] text-[color:var(--text-muted)]">CET</div>
            <div className="mt-0.5 font-serif text-[1.1875rem] font-bold text-[color:var(--text-primary)]">38% a.a.</div>
          </div>
        </div>
        <div className="flex-1 rounded-[16px] border border-[color:var(--color-negative)]/[0.3] bg-[color:var(--color-negative)]/[0.06] p-3.5">
          <div className="text-[0.6875rem] text-[color:var(--text-muted)]">Proposta B</div>
          <div className="mt-1 text-[0.8125rem] text-[color:var(--text-secondary)]">
            Parcela <b className="font-semibold text-[color:var(--text-primary)]">R$ 320</b>
          </div>
          <div className="mt-2 rounded-[12px] border border-[color:var(--color-negative)]/[0.3] px-2 py-2 text-center">
            <div className="text-[0.625rem] uppercase tracking-[0.06em] text-[color:var(--text-muted)]">CET</div>
            <div className="mt-0.5 font-serif text-[1.1875rem] font-bold text-[color:var(--color-negative)]">71% a.a.</div>
          </div>
        </div>
      </div>
      <div className="mt-2.5 text-center text-[0.6875rem] text-[color:var(--text-muted)]">
        Mesma parcela. Custo bem diferente.
      </div>
    </div>
  );
}

function Perigo() {
  const card =
    "flex items-center justify-between rounded-[16px] border border-[color:var(--color-negative)]/[0.3] bg-[color:var(--color-negative)]/[0.06] p-3.5";
  return (
    <div className="flex flex-1 flex-col justify-center gap-2.5">
      <Cap>Os dois mais caros do país</Cap>
      <div className={card}>
        <div>
          <div className="text-[0.6875rem] text-[color:var(--text-muted)]">Crédito</div>
          <div className="font-serif text-[0.9375rem] font-bold text-[color:var(--text-primary)]">Rotativo do cartão</div>
        </div>
        <span className="text-[0.875rem] font-bold text-[color:var(--color-negative)]">↑↑</span>
      </div>
      <div className={card}>
        <div>
          <div className="text-[0.6875rem] text-[color:var(--text-muted)]">Crédito</div>
          <div className="font-serif text-[0.9375rem] font-bold text-[color:var(--text-primary)]">Cheque especial</div>
        </div>
        <span className="text-[0.875rem] font-bold text-[color:var(--color-negative)]">↑</span>
      </div>
      <div className="text-center text-[0.6875rem] text-[color:var(--text-muted)]">São caros. Esse é o ponto.</div>
    </div>
  );
}

function Acao() {
  const debt =
    "mb-1.5 flex items-center justify-between rounded-[12px] border border-[color:var(--border-soft)] bg-[color:var(--surface-2)] px-3 py-2.5";
  return (
    <div className="flex flex-1 flex-col justify-center">
      <Cap>Veja o CET das suas dívidas</Cap>
      <div className="mb-1.5 flex items-center justify-between rounded-[12px] border border-[color:var(--color-brand-500)]/[0.4] bg-[color:var(--color-brand-500)]/[0.08] px-3 py-2.5">
        <span className="font-serif text-[0.84375rem] font-semibold text-[color:var(--text-primary)]">Cartão Nubank</span>
        <span className="text-[0.75rem] font-bold text-[color:var(--brand-ink)]">CET 64% a.a.</span>
      </div>
      <div className={debt}>
        <span className="font-serif text-[0.84375rem] font-semibold text-[color:var(--text-primary)]">Empréstimo</span>
        <span className="text-[0.75rem] text-[color:var(--text-muted)]">CET 41% a.a.</span>
      </div>
      <div className={debt}>
        <span className="font-serif text-[0.84375rem] font-semibold text-[color:var(--text-primary)]">Financiamento</span>
        <span className="text-[0.75rem] text-[color:var(--text-muted)]">CET 22% a.a.</span>
      </div>
      <div
        className="mt-2 inline-flex w-full items-center justify-center rounded-full px-5 py-3 text-[0.8125rem] font-bold text-white"
        style={{ backgroundImage: BRAND_GRADIENT, boxShadow: "0 10px 30px rgba(186, 87, 23, 0.28)" }}
      >
        Cadastrar minhas dívidas
      </div>
    </div>
  );
}

const beats: Beat[] = [
  {
    label: "Abertura",
    durationSec: 7,
    Visual: Capa,
    lines: [
      "Sabor Financeiro.",
      "Trilha: Sair do vermelho.",
      "Módulo um de três.",
      "Quanto você realmente paga.",
    ],
  },
  {
    label: "O que ninguém olha",
    durationSec: 30,
    Visual: Numeros,
    lines: [
      "Esse é o primeiro passo pra sair do vermelho.",
      "E a gente começa por uma coisa que quase ninguém para pra olhar.",
      "Quanto uma dívida custa de verdade.",
      "Quando você parcela uma compra ou pega um empréstimo, no que você repara?",
      "Quase sempre na parcela. Coube no mês, fechou.",
      "Ou então naquela taxa de juros que aparece bonita em destaque.",
      "Só que esses dois números sozinhos escondem um pouco a verdade.",
      "Eles não mostram o tamanho real do buraco.",
    ],
  },
  {
    label: "O CET é a conta inteira",
    durationSec: 37,
    Visual: Recibo,
    lines: [
      "Quem mostra o tamanho real tem nome.",
      "É o Custo Efetivo Total. Todo mundo chama de CET.",
      "Imagina a conta de um restaurante.",
      "A taxa de juros é o preço do prato.",
      "Mas na conta final ainda chega a água, o couvert, a gorjeta.",
      "O CET é a conta inteira.",
      "Ele junta os juros, as tarifas, impostos como o IOF e aqueles seguros que às vezes vêm embutidos sem você nem reparar.",
      "Tudo o que sai do seu bolso num número só.",
    ],
  },
  {
    label: "Mostrar o CET é lei",
    durationSec: 18,
    Visual: Lei,
    lines: [
      "Por isso o custo efetivo total quase sempre é maior que a taxa que estava em destaque.",
      "E tem uma boa notícia.",
      "Aqui no Brasil o banco é obrigado a te mostrar esse número antes de você assinar.",
      "Não é cortesia. É lei.",
      "Então pode pedir. E deve.",
    ],
  },
  {
    label: "Compare pelo CET",
    durationSec: 27,
    Visual: Comparar,
    lines: [
      "Você deve estar pensando.",
      "Tá, mas por que isso muda alguma coisa pra mim?",
      "Muda tudo na hora de comparar.",
      "Duas propostas podem ter a mesma parcelinha camarada e custar valores bem diferentes lá no fim.",
      "Uma esticou o prazo e encheu de tarifa.",
      "Então a pergunta certa nunca é quanto fica a parcela. É qual o custo efetivo total.",
    ],
  },
  {
    label: "Os mais caros",
    durationSec: 27,
    Visual: Perigo,
    lines: [
      "E tem dois lugares onde esse custo costuma ser dos mais altos do país.",
      "O rotativo do cartão, que é quando você paga só o mínimo da fatura.",
      "E o cheque especial.",
      "Os dois são fáceis de cair e crescem sozinhos, rápido.",
      "Não precisa decorar taxa nenhuma porque elas mudam toda hora.",
      "Só precisa lembrar de uma coisa. São caros.",
    ],
  },
  {
    label: "Vira ação",
    durationSec: 22,
    Visual: Acao,
    lines: [
      "E é aqui que isso vira ação.",
      "Quando você junta as suas dívidas no app e olha o custo efetivo de cada uma lado a lado, o jogo muda de figura.",
      "Você para de olhar parcela por parcela e começa a enxergar quais dívidas estão de verdade sangrando o seu mês.",
      "Então fica o convite.",
      "Reúne as suas dívidas num lugar só, com o custo real de cada uma à mostra.",
      "No próximo módulo a gente decide qual atacar primeiro. Te espero lá.",
    ],
  },
];

export const module01: ModuleBeats = {
  trilhaSlug: "sair-do-vermelho",
  num: 1,
  title: "Quanto você realmente paga",
  audio: "trilha/sair-do-vermelho/01.mp3",
  beats,
};
