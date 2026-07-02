import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { BreadcrumbJsonLd, FaqPageJsonLd, SoftwareToolJsonLd } from "../../_components/json-ld";
import { RevealOnScroll } from "../../_components/reveal-on-scroll";
import { CalcAccountCta, CalcShell } from "../../calculadora/_components/calc-shell";
import { COPA_MATCHES, getCopaMatch } from "../_lib/copa-2026.config";

import { FaqAccordion, type FaqItem } from "./_components/faq-accordion.client";
import { MatchInfoSheet } from "./_components/match-info-sheet.client";
import { TripCalculator } from "./_components/trip-calculator.client";

const siteUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://www.saborfinanceiro.com.br";

export const dynamicParams = false;

export function generateStaticParams(): { match: string }[] {
  return COPA_MATCHES.map((m) => ({ match: m.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ match: string }>;
}): Promise<Metadata> {
  const { match: slug } = await params;
  const match = getCopaMatch(slug);
  if (!match) return {};
  const title = `Quanto custa ver ${match.homeTeam} x ${match.awayTeam} na Copa do Mundo 2026?`;
  const description = `Descubra quanto custa assistir ${match.homeTeam} x ${match.awayTeam} ao vivo na Copa do Mundo 2026 (${match.stageLabel}, ${match.venueName}): voo da sua cidade, hotel, ingresso e todos os custos, numa calculadora grátis.`;
  const path = `/copa/${match.slug}`;
  return {
    title,
    description,
    alternates: { canonical: path },
    openGraph: { title, description, url: `${siteUrl}${path}`, type: "website" },
  };
}

const faq = (
  homeTeam: string,
  awayTeam: string,
  venueName: string,
  venueCity: string,
  kickoffLabel: string,
): FaqItem[] => [
  {
    q: `Quanto custa em média ir ver ${homeTeam} x ${awayTeam}?`,
    a: "Depende da sua cidade, do hotel, do setor do ingresso e de quantas pessoas vão. A calculadora monta uma faixa a partir dessas escolhas. É estimativa, não preço fechado.",
  },
  {
    q: "Os valores são reais?",
    a: "Os ingressos seguem as categorias oficiais da FIFA. Voo e hotel são estimativas com base em valores de 2026 e mudam conforme a data e a antecedência da compra. Confira a disponibilidade real antes de fechar qualquer coisa.",
  },
  {
    q: "Brasileiro precisa de visto para os Estados Unidos?",
    a: "Sim. O Brasil não tem isenção de visto para os EUA, então é preciso ter um visto de turismo válido. A calculadora soma esse custo se você marcar que ainda não tem.",
  },
  {
    q: `Onde é o jogo?`,
    a: `No ${venueName}, em ${venueCity}, ${kickoffLabel}. A calculadora usa o aeroporto de Newark (EWR), o mais próximo do estádio, como destino.`,
  },
  {
    q: "Não vou conseguir ir esse ano. E aí?",
    a: "Normal, são poucos dias. Dá pra usar esse mesmo número como uma meta pra Copa de 2030, que vai ser na Espanha, em Portugal e no Marrocos (com jogos de abertura na América do Sul). Quatro anos é tempo de sobra pra guardar no seu ritmo. No Sabor você registra essa meta e acompanha quanto falta.",
    cta: { label: "Criar minha meta pra 2030", href: "/entrar" },
  },
];

export default async function CopaMatchPage({
  params,
}: {
  params: Promise<{ match: string }>;
}) {
  const { match: slug } = await params;
  const match = getCopaMatch(slug);
  if (!match) notFound();

  const path = `/copa/${match.slug}`;
  const h1 = `Quanto custa ver ${match.homeTeam} x ${match.awayTeam}?`;
  const items = faq(match.homeTeam, match.awayTeam, match.venueName, match.venueCity, match.kickoffLabel);

  return (
    <CalcShell back={{ href: "/copa", label: "Copa 2026" }}>
      <SoftwareToolJsonLd name={h1} description={`Custo estimado para ver ${match.homeTeam} x ${match.awayTeam} na Copa 2026.`} path={path} />
      <FaqPageJsonLd items={items} />
      <BreadcrumbJsonLd
        items={[
          { name: "Início", url: "/" },
          { name: "Copa 2026", url: "/copa" },
          { name: `${match.homeTeam} x ${match.awayTeam}`, url: path },
        ]}
      />

      <RevealOnScroll as="div" stagger className="flex flex-col gap-5">
        <header>
          <div className="flex items-center gap-2">
            <p className="text-[0.8125rem] font-semibold text-[color:var(--color-brand-700)]">
              Copa do Mundo 2026 · {match.stageLabel}
            </p>
            <MatchInfoSheet
              stageLabel={match.stageLabel}
              kickoffLabel={match.kickoffLabel}
              venueName={match.venueName}
              venueCity={match.venueCity}
            />
          </div>
          <h1
            className="mt-1 text-2xl font-extrabold text-[color:var(--text-primary)] sm:text-[2rem] sm:leading-[1.1]"
            style={{ letterSpacing: "-0.03em" }}
          >
            {h1}
          </h1>
          <p className="mt-3 text-[0.9375rem] leading-relaxed text-[color:var(--text-secondary)]">
            Diz de onde você sai e escolhe o setor: a gente estima voo, hotel, ingresso, visto e extras.
          </p>
        </header>

        <TripCalculator match={match} />

        <section className="mt-2">
          <h2 className="mb-4 text-lg font-extrabold text-[color:var(--text-primary)]" style={{ letterSpacing: "-0.02em" }}>
            Perguntas frequentes
          </h2>
          <FaqAccordion items={items} />
        </section>

        <CalcAccountCta />
      </RevealOnScroll>
    </CalcShell>
  );
}
