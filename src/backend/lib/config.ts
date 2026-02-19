import { z } from "zod"

const envSource = process.env

const configSchema = z.object({
  NODE_ENV: z.enum(["development", "production"]).default("development"),
  RESEND_API_KEY: z.optional(z.string().min(1)),
  DOMAIN: z.string().min(1),
  MAIL_FROM: z.email(),
  ADMIN_EMAIL: z.email(),
  ADMIN_PASSWORD: z.string().min(8),
  BUILD: z
    .enum(["true", "false"])
    .default("false")
    .transform((value) => value === "true")
})

const result = configSchema.safeParse(envSource)

if (!result.success) {
  throw new Error(
    `❌ INVALID CONFIGURATION: ${JSON.stringify(z.treeifyError(result.error), null, 2)}`
  )
}

const config = result.data

export default config
export type Config = z.infer<typeof configSchema>
