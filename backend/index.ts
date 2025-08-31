import { logger } from "@bogeychan/elysia-logger"
import cors from "@elysiajs/cors"
import serverTiming from "@elysiajs/server-timing"
import { Elysia } from "elysia"
import { Packr } from "msgpackr"
import config from "./lib/config"
import authController from "./modules/auth/auth.controller"
import usersController from "./modules/users/users.controller"
import workspacesController from "./modules/workspaces/workspaces.controller"

const packr = new Packr({ bundleStrings: true })

const app = new Elysia({
	prefix: "/api",
	cookie: {
		httpOnly: true,
		secure: config.NODE_ENV === "production",
		path: "/",
		sameSite: "lax",
		domain:
			config.NODE_ENV === "production"
				? config.PUBLIC_BACKEND_DOMAIN
				: "localhost"
	}
})
	.use(
		cors({
			origin:
				config.NODE_ENV === "production" ? config.PUBLIC_BACKEND_DOMAIN : true,
			credentials: true,
			methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
			allowedHeaders: ["Content-Type", "Accept"],
			exposeHeaders: ["Content-Type"]
		})
	)
	.use(serverTiming())
	.use(logger())
	.onParse(async ({ request }, contentType) => {
		if (request.headers.get("upgrade") === "websocket" || !contentType) {
			return request
		}

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
	.use(workspacesController)
	.listen(8000)

export default app

export type App = typeof app
