import React from "react"
import {
  Body,
  Container,
  Head,
  Html,
  Preview,
  Text,
  Tailwind,
  Button
} from "@react-email/components"

interface WaitlistEmailProps {
  link: string
}

const ResetPasswordEmail = ({ link }: WaitlistEmailProps) => (
  <Tailwind>
    <Html lang="pt-BR">
      <Head />
      <Preview>Resetar senha do Codelabs</Preview>
      <Body>
        <Container>
          <Text>
            Você solicitou a alteração da sua senha no Codelabs! Por favor, clique no botão abaixo para confirmar.
          </Text>
          <Button href={link} className="bg-blue-500 p-3 text-white rounded font-bold">
            Confirmar email
          </Button>
          <Text>
            Ou copie e cole o link abaixo no seu navegador:
            {link}
          </Text>
          <Text>
            Caso você não tenha solicitado a alteração da sua senha no Codelabs, por favor ignore este email.
          </Text>
        </Container>
      </Body>
    </Html>
  </Tailwind>
)

export default ResetPasswordEmail
