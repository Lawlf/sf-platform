import { WhyExistsContent } from "./why-exists-content";

export function LandingWhyExists() {
  return (
    <WhyExistsContent
      cta={{
        href: "/cadastrar",
        label: "Ver meu mês",
        note: "Grátis pra começar. Sem cartão.",
      }}
    />
  );
}
