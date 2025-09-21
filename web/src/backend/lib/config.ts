import { env } from "$env/dynamic/private"
import { z } from "zod"

const configSchema = z.object({
	NODE_ENV: z.enum(["development", "production"]).default("development"),
	POSTGRES_URL: z.url(),
	REDIS_URL: z.url(),
	BLOB_READ_WRITE_TOKEN: z.string().min(1),
	RESEND_API_KEY: z.string().min(1),
	DOMAIN: z.url(),
	MAIL_FROM: z.email()
})

const result = configSchema.safeParse(env)

if (!result.success) {
	throw new Error(`Invalid configuration: ${result.error.message}`)
}

const config = result.data
export default config
export type Config = z.infer<typeof configSchema>
