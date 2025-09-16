import { logger } from "@bogeychan/elysia-logger"
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
		domain: config.NODE_ENV === "production" ? config.VERCEL_URL : "localhost"
	}
})
	.use(serverTiming())
	.use(logger())
	.onRequest(({ set }) => {
		set.headers["Access-Control-Allow-Origin"] =
			process.env.NODE_ENV === "production" ? config.VERCEL_URL : "*"
		set.headers["Access-Control-Allow-Credentials"] = "true"
		set.headers["Access-Control-Allow-Headers"] = "Content-Type, Accept"
		set.headers["Access-Control-Allow-Methods"] =
			"GET, POST, PUT, PATCH, DELETE"
		set.headers["Access-Control-Expose-Headers"] = "Content-Type"
	})
	.options("*", () => {})
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
