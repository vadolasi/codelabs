import { Resend } from "resend"
import config from "../lib/config"
import {
	renderEmailVerification,
	renderResetPassword,
	renderWorkspaceInvite
} from "./templates.generated"

const resend = new Resend(config.RESEND_API_KEY)

interface EmailTemplates {
	emailVerification: { code: string }
	resetPassword: { code: string }
	workspaceInvite: { code: string }
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

	await resend.emails.send({
		from: `Codelabs <${config.MAIL_FROM}>`,
		subject,
		to,
		html
	})
}
