import { z } from "zod"

const envSource = process.env

const configSchema = z.object({
  NODE_ENV: z.enum(["development", "production"]).default("development"),
  RESEND_API_KEY: z.string().min(1),
  DOMAIN: z.string().min(1),
  MAIL_FROM: z.string().email()
})

const result = configSchema.safeParse(envSource)

if (!result.success && process.env.NODE_ENV === "production") {
  console.error(
    "❌ INVALID CONFIGURATION:",
    JSON.stringify(result.error.format(), null, 2)
  )
}

const config = result.success
  ? result.data
  : ({
      NODE_ENV: (process.env.NODE_ENV as any) || "development",
      RESEND_API_KEY: process.env.RESEND_API_KEY || "",
      DOMAIN: process.env.DOMAIN || "localhost",
      MAIL_FROM: process.env.MAIL_FROM || ""
    } as z.infer<typeof configSchema>)

export default config
export type Config = z.infer<typeof configSchema>
