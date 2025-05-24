import { and, eq } from "drizzle-orm"
import Elysia from "elysia"
import db, { users } from "../../database"
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
					const [user] = await db
						.select({
							id: users.id,
							email: users.email,
							username: users.username
						})
						.from(users)
						.where(and(eq(users.id, userId)))
						.limit(1)
						.$withCache()

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
