import { CalendarClock, Database, Download, UserX } from "lucide-react";

import { RevealOnScroll } from "./reveal-on-scroll";

const items = [
  {
    icon: CalendarClock,
    title: "No seu ritmo.",
    body: "Você lança renda, dívida e patrimônio quando faz sentido pra você. Sem corre-corre, sem cada cafezinho. A cadência é mensal, do jeito que a vida real acontece.",
  },
  {
    icon: Database,
    title: "Seus dados no Brasil.",
    body: "Servidores em São Paulo. Tudo criptografado, no trajeto e no armazenamento. LGPD desde o dia 1, não depois do primeiro processo.",
  },
  {
    icon: UserX,
    title: "Você não é o produto.",
    body: "A gente não vende seu dado pra ninguém. Se um dia indicar produto financeiro (CDB, seguro, crédito que faça sentido pro seu perfil), você vai ver na hora que é parceria, vai saber quanto a gente recebe e pode ignorar sem culpa.",
  },
  {
    icon: Download,
    title: "Seus dados são seus.",
    body: "Exportação em CSV e PDF a qualquer momento, como manda a LGPD. Sem letra miúda, sem barreira artificial.",
  },
];

export function LandingPrivacy() {
  return (
    <section id="privacidade" className="relative py-20 sm:py-28">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <RevealOnScroll className="mx-auto max-w-2xl text-center">
          <h2
            className="text-4xl font-extrabold text-[color:var(--text-primary)] sm:text-5xl"
            style={{ letterSpacing: "-0.035em" }}
          >
            Seus dados, sua casa.
          </h2>
          <p className="mx-auto mt-5 max-w-xl text-base text-[color:var(--text-secondary)] sm:text-lg">
            A gente vê o macro porque você anotou, com calma, no seu ritmo.
            Privacidade não é página de termos: é decisão de produto.
          </p>
        </RevealOnScroll>

        <RevealOnScroll stagger className="mt-12 grid gap-4 sm:gap-5 md:grid-cols-2">
          {items.map((item) => {
            const Icon = item.icon;
            return (
              <article
                key={item.title}
                className="flex gap-4 rounded-[1.25rem] border border-[color:var(--border-soft)] bg-[color:var(--surface-2)] p-6 backdrop-blur-md"
              >
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[color:var(--color-positive)]/[0.12] text-[color:var(--color-positive)]">
                  <Icon size={20} strokeWidth={1.75} aria-hidden />
                </span>
                <div className="flex-1">
                  <h3
                    className="text-[17px] font-extrabold text-[color:var(--text-primary)]"
                    style={{ letterSpacing: "-0.02em" }}
                  >
                    {item.title}
                  </h3>
                  <p className="mt-2 text-[14.5px] leading-relaxed text-[color:var(--text-secondary)]">
                    {item.body}
                  </p>
                </div>
              </article>
            );
          })}
        </RevealOnScroll>
      </div>
    </section>
  );
}
