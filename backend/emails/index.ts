import { Eta } from "eta"
import { Engine } from "mrml"
import { Resend } from "resend"
import { Resource } from "sst"

const mrml = new Engine()

const eta = new Eta({ views: import.meta.dirname })

const resend = new Resend(Resource.ResendApiKey.value)

interface EmailTemplates {
	emailVerification: { code: string }
	forgotPassword: { code: string }
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
		await eta.renderAsync(`./${template}.mjml.eta`, data)
	)
	if (renderedTemplate.type === "success") {
		await resend.emails.send({
			from: "Codelabs <codelabs@vitordaniel.com>",
			subject,
			to,
			html: renderedTemplate.content
		})
	} else {
		throw new Error(`Failed to render email template: ${template}.mjml.eta`)
	}
}
