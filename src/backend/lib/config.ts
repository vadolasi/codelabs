import { z } from "zod"

const envSource = process.env

const configSchema = z
  .object({
    NODE_ENV: z.enum(["development", "production"]).default("development"),
    RESEND_API_KEY: z.optional(z.string().min(1)),
    DOMAIN: z.string().min(1),
    MAIL_FROM: z.optional(z.email()),
    ADMIN_EMAIL: z.optional(z.email()),
    ADMIN_PASSWORD: z.optional(z.string().min(8)),
    BUILD: z
      .enum(["true", "false"])
      .default("false")
      .transform((value) => value === "true")
  })
  .refine(
    (data) =>
      (data.NODE_ENV === "production" && !!data.RESEND_API_KEY) ||
      data.NODE_ENV === "development",
    {
      message: "RESEND_API_KEY is required in production"
    }
  )
  .refine(
    (data) =>
      (data.NODE_ENV === "production" && !!data.MAIL_FROM) ||
      data.NODE_ENV === "development",
    {
      message: "MAIL_FROM is required in production"
    }
  )
  .refine(
    (data) =>
      (data.NODE_ENV === "production" &&
        !!data.ADMIN_EMAIL &&
        !!data.ADMIN_PASSWORD) ||
      data.NODE_ENV === "development",
    {
      message: "ADMIN_EMAIL and ADMIN_PASSWORD are required in production"
    }
  )

const result = configSchema.safeParse(envSource)

if (!result.success) {
  throw new Error(
    `❌ INVALID CONFIGURATION: ${JSON.stringify(z.treeifyError(result.error), null, 2)}`
  )
}

const config = result.data

export default config
export type Config = z.infer<typeof configSchema>
