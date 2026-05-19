import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Html,
  Preview,
  Section,
  Text,
} from "@react-email/components";

export interface MagicLinkEmailProps {
  appUrl: string;
  token: string;
  code: string;
}

export function MagicLinkEmail({ appUrl, token, code }: MagicLinkEmailProps) {
  const verifyUrl = `${appUrl}/verificar?token=${token}`;
  return (
    <Html lang="pt-BR">
      <Head />
      <Preview>Seu codigo de acesso ao Sabor Financeiro: {code}</Preview>
      <Body
        style={{
          backgroundColor: "#fdf8f3",
          fontFamily: "system-ui, sans-serif",
          padding: "24px 0",
        }}
      >
        <Container
          style={{
            maxWidth: 480,
            margin: "0 auto",
            background: "#ffffff",
            padding: 24,
            borderRadius: 12,
          }}
        >
          <Heading style={{ color: "#ba5717", fontSize: 22, margin: "0 0 12px" }}>
            Sabor Financeiro
          </Heading>
          <Text style={{ fontSize: 14, color: "#1f1d1c" }}>Use o botao abaixo para entrar.</Text>
          <Section style={{ textAlign: "center", margin: "24px 0" }}>
            <Button
              href={verifyUrl}
              style={{
                backgroundColor: "#f28e25",
                color: "#ffffff",
                padding: "12px 20px",
                borderRadius: 8,
                fontWeight: 600,
                textDecoration: "none",
              }}
            >
              Entrar agora
            </Button>
          </Section>
          <Text style={{ fontSize: 12, color: "#3a3633", textAlign: "center" }}>
            Ou use este codigo:
          </Text>
          <Text
            style={{
              fontSize: 28,
              fontWeight: 700,
              color: "#1f1d1c",
              textAlign: "center",
              letterSpacing: 6,
            }}
          >
            {code}
          </Text>
          <Text style={{ fontSize: 11, color: "#6b6a67", marginTop: 24 }}>
            O link e o codigo expiram em 15 minutos. Se voce nao solicitou, ignore este email.
          </Text>
        </Container>
      </Body>
    </Html>
  );
}
