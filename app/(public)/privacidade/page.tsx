import type { Metadata } from "next";
import Link from "next/link";

import { BreadcrumbJsonLd } from "../_components/json-ld";
import { LegalIdentity, LegalShell } from "../_components/legal-shell";

export const metadata: Metadata = {
  title: "Política de privacidade",
  description:
    "Como o Sabor Financeiro trata seus dados: o que coletamos, para quê, com quem compartilhamos (quase ninguém) e por que você não é o produto.",
  alternates: { canonical: "/privacidade" },
  openGraph: {
    title: "Política de privacidade",
    description: "Privacidade é decisão de produto. Veja como tratamos seus dados.",
    url: "/privacidade",
  },
};

export default function PrivacidadePage() {
  return (
    <>
      <BreadcrumbJsonLd
        items={[
          { name: "Início", url: "/" },
          { name: "Política de privacidade", url: "/privacidade" },
        ]}
      />
      <LegalShell
        title="Política de privacidade"
        intro="Privacidade não é página de termos: é decisão de produto. Aqui está, sem letra miúda, o que a gente faz com seus dados."
        updatedAt="23 de maio de 2026"
      >
        <h2>Quem é o controlador dos seus dados</h2>
        <p>
          A pessoa jurídica abaixo decide como e por que seus dados são tratados.
          É com ela que você fala para exercer seus direitos.
        </p>
        <LegalIdentity />

        <h2>Que dados a gente coleta</h2>
        <h3>Dados que você fornece</h3>
        <ul>
          <li>
            <strong>Cadastro:</strong> nome e e-mail para criar e acessar sua
            conta.
          </li>
          <li>
            <strong>Lançamentos macro:</strong> os valores de renda, dívida e
            patrimônio que você registra. São números do seu mês, não cada
            transação do seu dia.
          </li>
        </ul>
        <h3>Dados coletados automaticamente</h3>
        <ul>
          <li>
            Dados técnicos mínimos para o serviço funcionar e ficar seguro
            (registros de acesso e informações da sessão).
          </li>
        </ul>

        <h2>Para que usamos</h2>
        <ul>
          <li>Operar o serviço: montar seus painéis, simuladores e linha do tempo.</li>
          <li>Autenticar seu acesso e manter sua conta segura.</li>
          <li>Processar a assinatura Pro, quando for o caso.</li>
          <li>
            Falar com você sobre conta, cobrança e mudanças importantes do
            serviço.
          </li>
        </ul>

        <h2>O que a gente não faz</h2>
        <p>
          <strong>A gente não vende seus dados para ninguém.</strong> Você não é
          o produto. Se um dia indicarmos um produto financeiro de parceiro,
          isso vai ficar explícito como parceria, e você pode ignorar sem culpa.
        </p>

        <h2>Com quem compartilhamos</h2>
        <p>O compartilhamento é o mínimo necessário para o serviço rodar:</p>
        <ul>
          <li>
            <strong>Processador de pagamentos:</strong> para cobrar a assinatura
            Pro. Os dados completos do cartão ficam com ele, não com a gente.
          </li>
          <li>
            <strong>Autoridades:</strong> apenas quando houver obrigação legal
            ou ordem judicial.
          </li>
        </ul>

        <h2>Onde seus dados ficam</h2>
        <p>
          Seus dados ficam no Brasil, em servidores localizados em São Paulo, e
          são criptografados no trajeto e no armazenamento. Em alguns casos, um
          parceiro como o processador de pagamentos pode tratar dados fora do
          país; quando isso acontece, é com as salvaguardas exigidas pela LGPD.
        </p>

        <h2>Por quanto tempo guardamos</h2>
        <p>
          Mantemos seus dados enquanto sua conta existir. Se você encerrar a
          conta, apagamos ou anonimizamos seus dados, exceto o que a lei exige
          guardar por prazo determinado (por exemplo, registros fiscais e de
          acesso).
        </p>

        <h2>Seus dados são seus</h2>
        <p>
          Você pode exportar seus lançamentos em CSV e PDF a qualquer momento,
          sem barreira artificial, e pode pedir a exclusão da sua conta. O
          detalhamento completo dos seus direitos e como exercê-los está na
          página da <Link href="/lgpd">LGPD</Link>.
        </p>

        <h2>Cookies e sessão</h2>
        <p>
          A gente usa o mínimo necessário para manter você logado e o serviço
          seguro. Não usamos cookies para te seguir pela internet nem para
          vender perfil de comportamento.
        </p>

        <h2>Mudanças nesta política</h2>
        <p>
          Quando algo relevante mudar, a gente avisa por e-mail ou dentro do
          app e atualiza a data no topo desta página.
        </p>

        <h2>Fale com a gente</h2>
        <p>
          Dúvidas sobre privacidade? Escreva para{" "}
          <a href="mailto:contato@saborfinanceiro.com.br">
            contato@saborfinanceiro.com.br
          </a>
          .
        </p>
      </LegalShell>
    </>
  );
}
