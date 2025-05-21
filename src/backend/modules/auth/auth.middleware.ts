import Elysia, { t } from "elysia"
import db from "../../database"
import { validateSessionToken } from "./auth.service"

const authMiddleware = new Elysia()
	.derive(
		{ as: "scoped" },
		async ({ cookie: { session: sessionCookie }, status }) => {
			if (!sessionCookie.value) {
				return status(401, { message: "UNAUTHORIZED" })
			}

			const session = await validateSessionToken(sessionCookie.value)

			if (session === null) {
				sessionCookie.remove()
				return status(401, { message: "UNAUTHORIZED" })
			}

			return {
				userId: session.userId
			}
		}
	)
	.macro({
		user: (_: true) => ({
			resolve: async ({ userId, status }) => {
				if (userId !== undefined) {
					const user = await db.query.users.findFirst({
						where: (users, { eq }) => eq(users.id, userId),
						columns: {
							id: true,
							username: true,
							email: true
						}
					})

					if (!user) {
						return status(401, { message: "UNAUTHORIZED" })
					}

					return {
						user
					}
				}
			}
		})
	})

export default authMiddleware
