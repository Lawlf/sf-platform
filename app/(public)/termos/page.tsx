import type { Metadata } from "next";
import Link from "next/link";

import { BreadcrumbJsonLd } from "../_components/json-ld";
import { LegalIdentity, LegalShell } from "../_components/legal-shell";

export const metadata: Metadata = {
  title: "Termos de uso",
  description:
    "Os termos de uso do Sabor Financeiro: o que o serviço faz, regras da conta, planos, cobrança e os limites do que somos (e do que não somos).",
  alternates: { canonical: "/termos" },
  openGraph: {
    title: "Termos de uso",
    description: "As regras de uso do Sabor Financeiro, em português claro.",
    url: "/termos",
  },
};

export default function TermosPage() {
  return (
    <>
      <BreadcrumbJsonLd
        items={[
          { name: "Início", url: "/" },
          { name: "Termos de uso", url: "/termos" },
        ]}
      />
      <LegalShell
        title="Termos de uso"
        intro="As regras do jogo, em português que dá pra entender. Ao criar conta ou usar o Sabor Financeiro, você concorda com o que está aqui."
        updatedAt="23 de maio de 2026"
      >
        <h2>Quem opera o Sabor Financeiro</h2>
        <p>
          O Sabor Financeiro é operado pela pessoa jurídica abaixo, responsável
          pelo serviço e pelo tratamento dos seus dados.
        </p>
        <LegalIdentity />

        <h2>O que o serviço faz</h2>
        <p>
          O Sabor Financeiro é uma ferramenta de visão macro da sua vida
          financeira. Você lança, no seu ritmo, renda, dívida e patrimônio, e a
          gente devolve painéis, simuladores e uma linha do tempo pra você
          enxergar o tamanho real do buraco e o caminho pra sair dele.
        </p>
        <p>
          A gente trabalha com o macro mensal, não com cada compra do dia. Isso
          é decisão de produto, não limitação.
        </p>

        <h2>O que o serviço não é</h2>
        <p>
          <strong>
            O Sabor Financeiro não é consultoria de investimentos, não é
            recomendação financeira e não substitui um profissional.
          </strong>{" "}
          Os números, simulações e projeções são informativos e educacionais.
          Eles dependem dos dados que você lança e de premissas que podem não se
          confirmar na vida real (juros mudam, renda muda, mercado muda).
        </p>
        <p>
          Decisões sobre dívida, crédito, compra, venda ou aplicação são suas. A
          gente te dá clareza, não ordens. Para decisões relevantes, procure um
          profissional habilitado.
        </p>

        <h2>Sua conta</h2>
        <p>
          Para usar o serviço você precisa ter 18 anos ou mais e fornecer dados
          verdadeiros no cadastro. Você é responsável por manter o acesso à sua
          conta seguro. Avise a gente em{" "}
          <a href="mailto:contato@saborfinanceiro.com.br">
            contato@saborfinanceiro.com.br
          </a>{" "}
          se desconfiar de uso indevido.
        </p>

        <h2>Planos e cobrança</h2>
        <p>
          O plano Free entrega o essencial sem custo. O plano Pro é uma
          assinatura paga, com os recursos e preços descritos na página de{" "}
          <Link href="/precos">preços</Link>.
        </p>
        <ul>
          <li>
            A cobrança da assinatura é processada por um processador de
            pagamentos terceirizado. A gente não armazena os dados completos do
            seu cartão.
          </li>
          <li>
            Sem fidelidade e sem multa: você cancela quando quiser e mantém o
            acesso Pro até o fim do período já pago.
          </li>
          <li>
            Valores e recursos de cada plano podem mudar. Mudanças de preço só
            valem para ciclos futuros, e a gente avisa antes.
          </li>
        </ul>

        <h2>Uso aceitável</h2>
        <p>Ao usar o Sabor Financeiro, você concorda em não:</p>
        <ul>
          <li>tentar acessar contas ou dados de outras pessoas;</li>
          <li>
            burlar limites de plano, fazer engenharia reversa ou sobrecarregar a
            infraestrutura;
          </li>
          <li>usar o serviço para qualquer atividade ilícita.</li>
        </ul>

        <h2>Propriedade intelectual</h2>
        <p>
          A marca, a interface, os textos e o código do Sabor Financeiro são
          nossos. Os dados que você lança continuam seus: você pode exportar e
          apagar quando quiser, como descrito na{" "}
          <Link href="/privacidade">Política de Privacidade</Link>.
        </p>

        <h2>Limitação de responsabilidade</h2>
        <p>
          A gente se esforça para manter o serviço no ar, correto e seguro, mas
          ele é fornecido &ldquo;como está&rdquo;. Não respondemos por decisões financeiras
          tomadas com base nas informações da ferramenta, nem por perdas
          decorrentes de indisponibilidade, erro de cálculo a partir de dados
          incorretos ou caso fortuito e força maior.
        </p>

        <h2>Cancelamento e encerramento</h2>
        <p>
          Você pode encerrar sua conta a qualquer momento pelas configurações ou
          pelo contato. A gente pode suspender contas que violem estes termos,
          sempre que possível com aviso prévio.
        </p>

        <h2>Alterações nestes termos</h2>
        <p>
          Estes termos podem ser atualizados. Quando a mudança for relevante, a
          gente avisa por e-mail ou dentro do app. Continuar usando o serviço
          depois disso significa concordância com a versão nova.
        </p>

        <h2>Foro</h2>
        <p>
          Estes termos seguem a lei brasileira. Fica eleito o foro da comarca de
          São Paulo/SP para resolver qualquer questão, sem prejuízo dos seus
          direitos como consumidor de recorrer ao foro do seu domicílio.
        </p>
      </LegalShell>
    </>
  );
}
