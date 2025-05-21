import Elysia, { t } from "elysia"
import db from "../../database"
import { createSession, generateSessionToken } from "./auth.service"

const authController = new Elysia({ name: "api.auth", prefix: "/auth" }).post(
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

		if (!(await Bun.password.verify(password, user.password))) {
			return status(401, { code: "INVALID_PASSWORD" })
		}

		if (user.emailVerified === false) {
			return status(401, {
				code: "EMAIL_NOT_VERIFIED",
				data: { email: user.email }
			})
		}

		const sessionToken = generateSessionToken()
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

export default authController
