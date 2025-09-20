import { env } from "$env/dynamic/private"
import { z } from "zod"

const configSchema = z.object({
	NODE_ENV: z.enum(["development", "production"]).default("development"),
	POSTGRES_URL: z.url(),
	REDIS_URL: z.url(),
	S3_BUCKET: z.string().min(1),
	RESEND_API_KEY: z.string().min(1),
	VERCEL_URL: z.url().default("http://localhost:5173")
})

const result = configSchema.safeParse(env)

if (!result.success) {
	throw new Error(
		`Invalid configuration: ${z.treeifyError(result.error).errors.join(", ")}`
	)
}

const config = result.data
export default config
export type Config = z.infer<typeof configSchema>
