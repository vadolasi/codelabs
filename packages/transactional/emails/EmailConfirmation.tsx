import {
  Body,
  Container,
  Head,
  Html,
  Preview,
  Tailwind,
  Text,
} from "@react-email/components";
import React from "react";

interface WaitlistEmailProps {
  code: string;
}

const EmailConfirmationEmail = ({ code }: WaitlistEmailProps) => (
  <Tailwind>
    <Html lang="pt-BR">
      <Head />
      <Preview>Confirme seu email do Codelabs</Preview>
      <Body>
        <Container>
          <Text>Olá,</Text>
          <Text>
            Obrigado por se inscrever no Codelabs! Confirme seu email utilizando
            o código abaixo.
          </Text>
          <Text className="bg-blue-500 p-3 text-white rounded font-bold text-xl tracking-wide">
            {code}
          </Text>
          <Text>
            Caso você não tenha se inscrito no Codelabs, por favor ignore este
            email.
          </Text>
        </Container>
      </Body>
    </Html>
  </Tailwind>
);

export default EmailConfirmationEmail;
