import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Preview,
  Text,
  Tailwind,
  Button
} from "@react-email/components"
import * as React from "react"

interface WaitlistEmailProps {
  link: string
}

const EmailConfirmationEmail = ({ link }: WaitlistEmailProps) => (
  <Tailwind>
    <Html lang="pt-BR">
      <Head />
      <Preview>Confirme seu email do Codelabs</Preview>
      <Body>
        <Container>
          <Text>Olá,</Text>
          <Text>
            Obrigado por se inscrever no Codelabs! Por favor, confirme seu email clicando no botão abaixo.
          </Text>
          <Button href={link} className="bg-blue-500 p-3 text-white rounded font-bold">
            Confirmar email
          </Button>
          <Text>
            Ou copie e cole o link abaixo no seu navegador:
            {link}
          </Text>
          <Text>
            Caso você não tenha se inscrito no Codelabs, por favor ignore este email.
          </Text>
          <Text>
            Obrigado,
            Equipe Codelabs
          </Text>
        </Container>
      </Body>
    </Html>
  </Tailwind>
)

export default EmailConfirmationEmail
