import { convert } from "html-to-text"
import { Resend } from "resend"
import config from "../lib/config"
import {
  renderEmailVerification,
  renderResetPassword,
  renderWorkspaceInvite
} from "./templates.generated"

interface EmailTemplates {
  emailVerification: { code: string }
  resetPassword: { code: string }
  workspaceInvite: {
    code: string
    workspaceName: string
    isDirectAdd?: boolean
  }
}

export default async function sendEmail(
  template: keyof EmailTemplates,
  {
    data,
    subject,
    to
  }: {
    subject: string
    data: EmailTemplates[typeof template]
    to: string | string[]
  }
): Promise<void> {
  const renderers: Record<keyof EmailTemplates, (payload: unknown) => string> =
    {
      emailVerification: renderEmailVerification,
      resetPassword: renderResetPassword,
      workspaceInvite: renderWorkspaceInvite
    }

  const html = renderers[template]({
    ...data,
    config
  })

  const text = convert(html, {
    wordwrap: 130
  })

  if (config.NODE_ENV === "development" && !config.RESEND_API_KEY) {
    console.log("\u001b[33m[Email Simulado]\u001b[0m")
    console.log(`Para: ${to}`)
    console.log(`Assunto: ${subject}`)
    console.log("--- Conteúdo Texto ---")
    console.log(text)
    console.log("----------------------")
    return
  }

  const resend = new Resend(config.RESEND_API_KEY)

  await resend.emails.send({
    from: `Codelabs <${config.MAIL_FROM}>`,
    subject,
    to,
    html,
    text
  })
}
