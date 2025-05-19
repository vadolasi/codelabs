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

		if (!user || !(await Bun.password.verify(user.password, password))) {
			return status(401, { message: "INVALID_CREDENTIALS" })
		}

		const session = await createSession(generateSessionToken(), user.id)

		sessionCookie.set({ value: session.id, expires: session.expiresAt })

		return {}
	},
	{
		body: t.Object({
			emailOrUsername: t.String(),
			password: t.String()
		}),
		cookie: t.Object({
			session: t.String()
		})
	}
)

export default authController
