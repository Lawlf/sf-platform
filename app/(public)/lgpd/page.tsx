import type { Metadata } from "next";
import Link from "next/link";

import { BreadcrumbJsonLd } from "../_components/json-ld";
import { LegalIdentity, LegalShell } from "../_components/legal-shell";

export const metadata: Metadata = {
  title: "LGPD e seus direitos",
  description:
    "Seus direitos como titular de dados na Lei Geral de Proteção de Dados (LGPD): quais são, como exercer e em quanto tempo a gente responde.",
  alternates: { canonical: "/lgpd" },
  openGraph: {
    title: "LGPD e seus direitos",
    description: "Seus direitos sobre seus dados, do jeito que a LGPD garante.",
    url: "/lgpd",
  },
};

export default function LgpdPage() {
  return (
    <>
      <BreadcrumbJsonLd
        items={[
          { name: "Início", url: "/" },
          { name: "LGPD", url: "/lgpd" },
        ]}
      />
      <LegalShell
        title="LGPD e seus direitos"
        intro="A LGPD (Lei nº 13.709/2018) garante uma série de direitos sobre os seus dados. Aqui estão eles e como usar, sem juridiquês."
        updatedAt="23 de maio de 2026"
      >
        <h2>Quem trata seus dados</h2>
        <p>
          O controlador, responsável por decidir como seus dados são tratados e
          por atender seus pedidos, é:
        </p>
        <LegalIdentity />

        <h2>Com que base legal a gente trata seus dados</h2>
        <p>
          Cada uso tem uma base legal prevista na LGPD. As principais no Sabor
          Financeiro:
        </p>
        <ul>
          <li>
            <strong>Execução de contrato:</strong> para criar sua conta, montar
            seus painéis e processar a assinatura Pro.
          </li>
          <li>
            <strong>Obrigação legal:</strong> para guardar registros que a lei
            exige (fiscais e de acesso).
          </li>
          <li>
            <strong>Legítimo interesse:</strong> para manter o serviço seguro e
            prevenir fraude, sempre respeitando seus direitos.
          </li>
          <li>
            <strong>Consentimento:</strong> quando for o caso, por exemplo para
            comunicações opcionais. Você pode retirar quando quiser.
          </li>
        </ul>

        <h2>Seus direitos como titular</h2>
        <p>
          A LGPD (art. 18) te dá, sobre os seus dados, o direito de:
        </p>
        <ul>
          <li>
            <strong>Confirmar e acessar:</strong> saber se a gente trata seus
            dados e obter uma cópia deles.
          </li>
          <li>
            <strong>Corrigir:</strong> atualizar dados incompletos, inexatos ou
            desatualizados.
          </li>
          <li>
            <strong>Anonimizar, bloquear ou eliminar:</strong> dados
            desnecessários, excessivos ou tratados em desconformidade.
          </li>
          <li>
            <strong>Portar:</strong> levar seus dados para outro fornecedor.
            Basta solicitar pelo suporte e a gente prepara uma cópia dos seus
            dados dentro do prazo legal.
          </li>
          <li>
            <strong>Eliminar dados tratados com consentimento</strong> e
            encerrar sua conta. Ao encerrar, sua conta é desativada na hora:
            você deixa de acessar e de receber comunicações. Alguns registros
            podem ser mantidos por até dois anos para cumprir obrigações legais,
            e depois são eliminados.
          </li>
          <li>
            <strong>Saber com quem compartilhamos</strong> seus dados.
          </li>
          <li>
            <strong>Revogar o consentimento</strong> e ser informado das
            consequências da recusa.
          </li>
          <li>
            <strong>Opor-se</strong> a um tratamento feito com base no legítimo
            interesse.
          </li>
        </ul>

        <h2>Como exercer seus direitos</h2>
        <p>
          Você encerra a conta sozinho dentro do app, nas configurações. Para
          exportar uma cópia dos seus dados ou qualquer outro pedido, é só
          escrever para{" "}
          <a href="mailto:contato@saborfinanceiro.com.br">
            contato@saborfinanceiro.com.br
          </a>
          . A gente pode pedir uma confirmação de identidade antes de atender,
          para proteger sua conta.
        </p>

        <h2>Prazo de resposta</h2>
        <p>
          A gente responde no menor prazo possível. Pedidos de acesso simples
          são atendidos de imediato ou em até 15 dias, conforme a LGPD. Pedidos
          mais complexos podem levar um pouco mais, e nesse caso a gente te
          informa.
        </p>

        <h2>Transferência internacional</h2>
        <p>
          Seus dados ficam no Brasil. Quando um parceiro essencial, como o
          processador de pagamentos, precisar tratar dados fora do país, isso é
          feito com as salvaguardas exigidas pela LGPD.
        </p>

        <h2>Encarregado e contato</h2>
        <p>
          O contato para assuntos de proteção de dados, incluindo o papel de
          encarregado, é{" "}
          <a href="mailto:contato@saborfinanceiro.com.br">
            contato@saborfinanceiro.com.br
          </a>
          . Os dados completos do controlador estão no topo desta página.
        </p>

        <h2>Reclamação à ANPD</h2>
        <p>
          Se você achar que seus direitos não foram respeitados, pode reclamar à
          Autoridade Nacional de Proteção de Dados (ANPD). Antes disso, a gente
          gostaria da chance de resolver direto com você.
        </p>

        <p>
          Para entender o que coletamos e por quê, veja também a{" "}
          <Link href="/privacidade">Política de Privacidade</Link>.
        </p>
      </LegalShell>
    </>
  );
}
