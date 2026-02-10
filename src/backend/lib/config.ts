import { z } from "zod"
import { env } from "$env/dynamic/private"

const configSchema = z.object({
  NODE_ENV: z.enum(["development", "production"]).default("development"),
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
