import { verify } from "@node-rs/argon2"
import Elysia, { t } from "elysia"
import db, { users } from "../../database"
import authMiddleware from "./auth.middleware"
import { createSession, generateToken, invalidateSession } from "./auth.service"

const unauthenticated = new Elysia().post(
	"/login",
	async ({
		body: { emailOrUsername, password },
		cookie: { session: sessionCookie },
		status
	}) => {
		const user = await db.query.users.findFirst({
			where: (users, { eq, or }) =>
				or(
					eq(users.email, emailOrUsername),
					eq(users.username, emailOrUsername)
				)
		})

		if (!user) {
			return status(401, { code: "USER_NOT_FOUND" })
		}

		if (!(await verify(password, user.password))) {
			return status(401, { code: "INVALID_PASSWORD" })
		}

		if (user.emailVerified === false) {
			return status(401, {
				code: "EMAIL_NOT_VERIFIED",
				data: { email: user.email }
			})
		}

		await db.update(users).set({ emailOTP: null, emailOTPExpiresAt: null })

		const sessionToken = generateToken()
		const session = await createSession(sessionToken, user.id)

		sessionCookie.value = sessionToken
		sessionCookie.expires = session.expiresAt

		return user
	},
	{
		body: t.Object({
			emailOrUsername: t.String(),
			password: t.String()
		}),
		response: {
			200: t.Object({
				email: t.String(),
				username: t.String()
			}),
			401: t.Union([
				t.Object({
					code: t.Literal("EMAIL_NOT_VERIFIED"),
					data: t.Object({
						email: t.String()
					})
				}),
				t.Object({
					code: t.Union([
						t.Literal("USER_NOT_FOUND"),
						t.Literal("INVALID_PASSWORD")
					])
				})
			])
		},
		cookie: t.Cookie({
			session: t.Optional(t.String())
		})
	}
)

const authenticated = new Elysia().use(authMiddleware).post(
	"/logout",
	async ({ userId, cookie: { session } }) => {
		await invalidateSession(session.value, userId)
		session.remove()

		return {}
	},
	{
		cookie: t.Cookie({
			session: t.String()
		})
	}
)

const authController = new Elysia({
	name: "api.auth",
	prefix: "/auth"
})
	.use(unauthenticated)
	.use(authenticated)

export default authController
