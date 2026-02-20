import { hitlimit } from "@joint-ops/hitlimit-bun/elysia"
import { memoryStore } from "@joint-ops/hitlimit-bun/stores/memory"
import { zxcvbnAsync, zxcvbnOptions } from "@zxcvbn-ts/core"
import * as zxcvbnCommonPackage from "@zxcvbn-ts/language-common"
import * as zxcvbnPtBrPackage from "@zxcvbn-ts/language-pt-br"
import { matcherPwnedFactory } from "@zxcvbn-ts/matcher-pwned"
import { randomUUIDv7 } from "bun"
import { and, eq, gt, or } from "drizzle-orm"
import Elysia, { t } from "elysia"
import { normalizeEmail } from "email-normalizer"
import { Resend } from "resend"
import { z } from "zod"
import { db, users } from "../../database"
import sendEmail from "../../emails"
import config from "../../lib/config"
import authMiddleware from "../auth/auth.middleware"
import { generateToken, hashPassword } from "../auth/auth.service"
import { generateOTPCode } from "./users.service"

const matcherPwned = matcherPwnedFactory(fetch, zxcvbnOptions)
zxcvbnOptions.addMatcher("pwned", matcherPwned)

zxcvbnOptions.setOptions({
  graphs: zxcvbnCommonPackage.adjacencyGraphs,
  dictionary: {
    ...zxcvbnCommonPackage.dictionary,
    ...zxcvbnPtBrPackage.dictionary
  },
  useLevenshteinDistance: true
})

const emailSchema = z.email()

function isValidEmail(value: string): boolean {
  const result = emailSchema.safeParse(value)
  if (!result.success) {
    return false
  }
  return true
}

const emailActions = new Elysia()
  .use(hitlimit({ limit: 20, window: "1m", store: memoryStore() }))
  .post(
    "/register",
    async ({ body: { email, username, password }, status }) => {
      const emailNormalized = normalizeEmail({ email })

      if (!isValidEmail(emailNormalized)) {
        return status(400, { message: "INVALID_EMAIL" })
      }

      const [existingUser] = await db
        .select()
        .from(users)
        .where(
          or(eq(users.email, emailNormalized), eq(users.username, username))
        )
        .limit(1)

      if (existingUser) {
        if (existingUser.email === emailNormalized) {
          return status(400, { message: "EMAIL_ALREADY_EXISTS" })
        }
        return status(400, { message: "USERNAME_ALREADY_EXISTS" })
      }

      if ((await zxcvbnAsync(password)).score < 3) {
        return status(400, { message: "WEAK_PASSWORD" })
      }

      const emailOTP = generateOTPCode()

      await db.insert(users).values({
        id: randomUUIDv7(),
        email,
        username,
        password: await hashPassword(password),
        emailOTP,
        emailOTPExpiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24)
      })

      ;(async () => {
        try {
          await sendEmail("emailVerification", {
            subject: "Verifique o seu email",
            data: { code: emailOTP },
            to: email
          })

          if (config.NODE_ENV === "production") {
            const resend = new Resend(config.RESEND_API_KEY)

            const { data: contact, error } = await resend.contacts.create({
              email: emailNormalized,
              unsubscribed: false
            })

            if (error) {
              console.error("Failed to add contact to Resend:", error)
            } else {
              await resend.contacts.segments.add({
                contactId: contact.id,
                segmentId: "656dc7f2-37c4-4246-909a-1d66b56b7b80"
              })
            }
          }
        } catch (err) {
          console.error("Background registration tasks failed:", err)
        }
      })()

      return {}
    },
    {
      body: t.Object({
        email: t.String({ maxLength: 255, minLength: 5, format: "email" }),
        username: t.String({ maxLength: 255, minLength: 3 }),
        password: t.String({ minLength: 8 })
      })
    }
  )
  .post(
    "/verify-user",
    async ({ body: { email, code }, status }) => {
      const [user] = await db
        .select()
        .from(users)
        .where(
          and(
            eq(users.email, email),
            eq(users.emailOTP, code),
            gt(users.emailOTPExpiresAt, new Date())
          )
        )
        .limit(1)

      if (!user) {
        return status(400, { message: "INVALID_VERIFICATION_CODE" })
      }

      await db
        .update(users)
        .set({
          emailVerified: true,
          emailOTP: null,
          emailOTPExpiresAt: null
        })
        .where(eq(users.id, user.id))

      return {}
    },
    {
      body: t.Object({
        email: t.String({ maxLength: 255, minLength: 5, format: "email" }),
        code: t.String({ maxLength: 6, minLength: 6 })
      }),
      rateLimit: {
        level: "medium",
        useIP: true
      }
    }
  )
  .get(
    "/check-email-exists",
    async ({ query: { email }, status }) => {
      const emailNormalized = normalizeEmail({ email })

      const [existingUser] = await db
        .select()
        .from(users)
        .where(and(eq(users.email, emailNormalized)))
        .limit(1)

      if (existingUser) {
        return status(400, { message: "EMAIL_ALREADY_EXISTS" })
      }

      return {}
    },
    {
      query: t.Object({
        email: t.String()
      })
    }
  )
  .post(
    "/resend-verification",
    async ({ body: { email }, status }) => {
      const emailNormalized = normalizeEmail({ email })

      const [user] = await db
        .select()
        .from(users)
        .where(
          and(eq(users.email, emailNormalized), eq(users.emailVerified, false))
        )
        .limit(1)

      if (!user) {
        return status(400, { message: "USER_NOT_FOUND_OR_ALREADY_VERIFIED" })
      }

      const emailOTP = generateOTPCode()

      await db
        .update(users)
        .set({
          emailOTP,
          emailOTPExpiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24)
        })
        .where(eq(users.id, user.id))

      await sendEmail("emailVerification", {
        subject: "Verifique o seu email",
        data: { code: emailOTP },
        to: email
      })

      return {}
    },
    {
      body: t.Object({
        email: t.String({ maxLength: 255, minLength: 5 })
      })
    }
  )
  .post(
    "/reset-password",
    async ({ body: { email }, status }) => {
      const emailNormalized = normalizeEmail({ email })

      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.email, emailNormalized))
        .limit(1)

      if (!user) {
        return status(400, { message: "USER_NOT_FOUND" })
      }

      const emailOTP = generateToken()

      await db
        .update(users)
        .set({
          emailOTP,
          emailOTPExpiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24)
        })
        .where(eq(users.id, user.id))

      await sendEmail("resetPassword", {
        subject: "Redefinição de senha",
        data: { code: emailOTP },
        to: email
      })

      return {}
    },
    {
      body: t.Object({
        email: t.String({ maxLength: 255, minLength: 5 })
      })
    }
  )

const nonEmailActions = new Elysia()
  .use(hitlimit({ limit: 60, window: "1m", store: memoryStore() }))
  .get(
    "reset-password/check-code/:emailToken",
    async ({ params: { emailToken } }) => {
      const [user] = await db
        .select()
        .from(users)
        .where(
          and(
            eq(users.emailOTP, emailToken),
            gt(users.emailOTPExpiresAt, new Date())
          )
        )
        .limit(1)

      if (!user) {
        return { isValid: false }
      }

      return { isValid: true, email: user.email, username: user.username }
    },
    {
      params: t.Object({
        emailToken: t.String()
      })
    }
  )
  .post(
    "/reset-password/confirm",
    async ({ body: { code, newPassword }, status }) => {
      const [user] = await db
        .select()
        .from(users)
        .where(
          and(eq(users.emailOTP, code), gt(users.emailOTPExpiresAt, new Date()))
        )
        .limit(1)

      if (!user) {
        return status(400, { message: "INVALID_VERIFICATION_CODE" })
      }

      if ((await zxcvbnAsync(newPassword)).score < 3) {
        return status(400, { message: "WEAK_PASSWORD" })
      }

      await db
        .update(users)
        .set({
          password: await hashPassword(newPassword),
          emailOTP: null,
          emailOTPExpiresAt: null
        })
        .where(eq(users.id, user.id))

      return {}
    },
    {
      body: t.Object({
        code: t.String(),
        newPassword: t.String()
      })
    }
  )

const unauthenticated = new Elysia().use(emailActions).use(nonEmailActions)

const authenticated = new Elysia()
  .use(authMiddleware)
  .use(
    hitlimit({
      limit: 60,
      window: "1m"
    })
  )
  .get(
    "/me",
    ({ user }) => {
      return user
    },
    { user: true }
  )

const usersController = new Elysia({
  name: "api.users",
  prefix: "/users"
})
  .use(unauthenticated)
  .use(authenticated)

export default usersController
