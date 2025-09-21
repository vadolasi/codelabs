import { Eta, type Options } from "eta"
import { Engine } from "mrml"
import { Resend } from "resend"
import config from "../lib/config"
import emailVerificationTemplate from "./emailVerification.mjml.eta?raw"
import layout from "./layout.mjml.eta?raw"
import resetPasswordTemplate from "./resetPassword.mjml.eta?raw"
import workspaceInvitationTemplate from "./workspaceInvite.mjml.eta?raw"

const templates = {
	layout,
	emailVerification: emailVerificationTemplate,
	resetPassword: resetPasswordTemplate,
	workspaceInvitation: workspaceInvitationTemplate
}

class CustomEta extends Eta {
	readFile = (filePath: string) => {
		return templates[filePath as keyof typeof templates]
	}

	resolvePath = (templatePath: string, _options?: Partial<Options>) => {
		return templatePath.replace("./", "").replace(".mjml.eta", "")
	}
}

const mrml = new Engine()

const eta = new CustomEta({
	functionHeader: `const config = ${JSON.stringify(config)};`
})

const resend = new Resend(config.RESEND_API_KEY)

interface EmailTemplates {
	emailVerification: { code: string }
	resetPassword: { code: string }
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
	const renderedTemplate = await mrml.toHtmlAsync(
		await eta.renderAsync(template, data)
	)
	if (renderedTemplate.type === "success") {
		await resend.emails.send({
			from: `Codelabs <${config.MAIL_FROM}>`,
			subject,
			to,
			html: renderedTemplate.content
		})
	} else {
		throw new Error(`Failed to render email template: ${template}.mjml.eta`)
	}
}
