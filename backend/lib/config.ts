import { z } from "zod"

const configSchema = z.object({
	NODE_ENV: z.enum(["development", "production"]).default("development"),
	POSTGRES_URL: z.url(),
	REDIS_URL: z.url(),
	S3_BUCKET: z.string().min(1),
	PUBLIC_BACKEND_DOMAIN: z.string().min(1),
	RESEND_API_KEY: z.string().min(1)
})

const result = configSchema.safeParse(process.env)

if (!result.success) {
	console.error("Invalid configuration:", z.treeifyError(result.error))
	process.exit(1)
}

const config = result.data
export default config
export type Config = z.infer<typeof configSchema>
