import { and, eq } from "drizzle-orm"
import Elysia from "elysia"
import { getDb, users } from "../../database"
import exposePlatform from "../../lib/expose-platform"
import { validateSessionToken } from "./auth.service"

const authMiddleware = new Elysia()
	.use(exposePlatform)
	.derive(
		{ as: "scoped" },
		async ({ cookie: { session: sessionCookie }, status }) => {
			if (!sessionCookie || !sessionCookie?.value) {
				return status(401, { message: "UNAUTHORIZED" })
			}
			const session = await validateSessionToken(sessionCookie.value as string)

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
			resolve: async ({ userId, status, request }) => {
				const platform = request?.platform

				if (!platform) {
					throw new Error("Platform not found on request")
				}

				if (userId !== undefined) {
					const [user] = await getDb(platform.env)
						.select({
							id: users.id,
							email: users.email,
							username: users.username
						})
						.from(users)
						.where(and(eq(users.id, userId)))
						.limit(1)

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
