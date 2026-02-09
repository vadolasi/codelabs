import { env } from "$env/dynamic/private"
import { z } from "zod"

const configSchema = z.object({
	NODE_ENV: z.enum(["development", "production"]).default("development"),
	REDIS_URL: z.url(),
	S3_ENDPOINT: z.url(),
	S3_BUCKET: z.string().min(1),
	S3_ACCESS_KEY: z.string().min(1),
	S3_SECRET_KEY: z.string().min(1),
	S3_REGION: z.string().min(1).optional(),
	RESEND_API_KEY: z.string().min(1),
	DOMAIN: z.hostname(),
	MAIL_FROM: z.email()
})

const result = configSchema.safeParse(env)

if (!result.success) {
	throw new Error(`Invalid configuration: ${result.error.message}`)
}

const config = result.data
export default config
export type Config = z.infer<typeof configSchema>
