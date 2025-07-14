import { zxcvbnAsync, zxcvbnOptions } from "@zxcvbn-ts/core"
import * as zxcvbnCommonPackage from "@zxcvbn-ts/language-common"
import * as zxcvbnPtBrPackage from "@zxcvbn-ts/language-pt-br"
import { matcherPwnedFactory } from "@zxcvbn-ts/matcher-pwned"
import { and, eq, gt } from "drizzle-orm"
import Elysia, { t } from "elysia"
import { normalizeEmail } from "email-normalizer"
import MailChecker from "mailchecker"
import db, { users } from "../../database"
import sendEmail from "../../emails"
import authMiddleware from "../auth/auth.middleware"
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

const unauthenticated = new Elysia()
	.post(
		"/register",
		async ({ body: { email, username, password }, status }) => {
			const emailNormalized = normalizeEmail({ email })

			if (!MailChecker.isValid(emailNormalized)) {
				return status(400, { message: "INVALID_EMAIL" })
			}

			const [existingUser] = await db
				.select()
				.from(users)
				.where(
					and(eq(users.email, emailNormalized), eq(users.username, username))
				)
				.limit(1)

			if (existingUser) {
				return status(400, { message: "USER_ALREADY_EXISTS" })
			}

			if ((await zxcvbnAsync(password)).score < 3) {
				return status(400, { message: "WEAK_PASSWORD" })
			}

			const emailOTP = generateOTPCode()

			await db.insert(users).values({
				id: Bun.randomUUIDv7(),
				email,
				username,
				password: await Bun.password.hash(password),
				emailOTP,
				emailOTPExpiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24)
			})

			await sendEmail("emailVerification", {
				subject: "Verifique o seu email",
				data: { code: emailOTP },
				to: email
			})

			return {}
		},
		{
			body: t.Object({
				email: t.String({ maxLength: 255, minLength: 5 }),
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
				email: t.String({ maxLength: 255, minLength: 5 }),
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
	.get(
		"/check-username-exists",
		async ({ query: { username }, status }) => {
			const [existingUser] = await db
				.select()
				.from(users)
				.where(and(eq(users.username, username)))
				.limit(1)

			if (existingUser) {
				return status(400, { message: "USERNAME_ALREADY_EXISTS" })
			}

			return {}
		},
		{
			query: t.Object({
				username: t.String()
			})
		}
	)

const authenticated = new Elysia().use(authMiddleware).get(
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
