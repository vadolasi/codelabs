import { logger } from "@bogeychan/elysia-logger"
import cors from "@elysiajs/cors"
import serverTiming from "@elysiajs/server-timing"
import { Elysia } from "elysia"
import { Packr } from "msgpackr"
import authController from "./modules/auth/auth.controller"
import usersController from "./modules/users/users.controller"

const packr = new Packr({ bundleStrings: true })

const app = new Elysia({
	prefix: "/api",
	cookie: {
		httpOnly: true,
		secure: process.env.NODE_ENV === "production",
		path: "/",
		sameSite: "lax",
		secrets: [
			process.env.COOKIE_SECRET_1!,
			process.env.COOKIE_SECRET_2!,
			process.env.COOKIE_SECRET_3!
		]
	}
})
	.use(
		cors({
			origin: process.env.PUBLIC_SITE_URL,
			allowedHeaders: ["Content-Type", "Accept"],
			methods: ["GET", "POST", "PUT", "PATCH", "DELETE"]
		})
	)
	.use(serverTiming())
	.use(logger())
	.onParse(async ({ request }, contentType) => {
		if (contentType === "application/x-msgpack") {
			return packr.unpack(Buffer.from(await request.arrayBuffer()))
		}
	})
	.mapResponse(({ headers, response }) => {
		if (response && headers?.accept?.includes("application/x-msgpack")) {
			return new Response(Uint8Array.from(packr.pack(response)), {
				headers: {
					"Content-Type": "application/x-msgpack"
				}
			})
		}
	})
	.use(authController)
	.use(usersController)
	.listen(3000)

export default app

export type App = typeof app

console.log(
	`🦊 Elysia is running at ${app.server?.hostname}:${app.server?.port}`
)
