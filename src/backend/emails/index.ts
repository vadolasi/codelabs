import { Eta } from "eta"
import { Engine } from "mrml"
import { Resend } from "resend"

const mrml = new Engine()

const eta = new Eta()

const resend = new Resend(process.env.RESEND_API_KEY)

interface EmailTemplates extends Record<string, Record<string, unknown>> {
	emailVerification: { code: string }
	forgotPassword: { code: string }
	alreadyRegistered: never
}

const templates: Record<
	keyof EmailTemplates,
	(data: EmailTemplates[keyof EmailTemplates]) => string
> = {
	emailVerification: eta.compile(
		await Bun.file(import.meta.resolve("./emailVerification.hbs")).text()
	),
	forgotPassword: eta.compile(
		await Bun.file(import.meta.resolve("./forgotPassword.hbs")).text()
	),
	alreadyRegistered: eta.compile(
		await Bun.file(import.meta.resolve("./alreadyRegistered.hbs")).text()
	)
}

export default async function sendEmail(
	template: keyof EmailTemplates,
	subject: string,
	data: EmailTemplates[typeof template],
	to: string | string[]
): Promise<void> {
	const renderedTemplate = await mrml.toHtmlAsync(templates[template](data))
	if (renderedTemplate.type === "success") {
		await resend.emails.send({
			from: "Codelabs <codelabs@vitordaniel.com>",
			subject,
			to,
			html: renderedTemplate.content
		})
	}
}
