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
      config.NODE_ENV === "production" && config.DOMAIN !== "localhost"
        ? config.DOMAIN
        : undefined
  }
})
  .use(serverTiming())
  .onRequest(({ request }) => {
    const originHeader = request.headers.get("Origin")
    const referer = request.headers.get("Referer")

    const hostHeader = request.headers.get("Host")
    const expectedOrigin = hostHeader
      ? `https://${hostHeader}`
      : (originHeader ?? "")

    const validOrigin = !originHeader || originHeader === expectedOrigin
    const validReferer = !referer || referer?.startsWith(expectedOrigin)

    if (config.NODE_ENV === "production" && (!validOrigin || !validReferer)) {
      return new Response("CSRF validation failed", { status: 403 })
    }
  })
  .onParse(async ({ request }, contentType) => {
    if (request.headers.get("upgrade") === "websocket" || !contentType) {
      return request
    }

    if (contentType === "application/x-msgpack") {
      return packr.unpack(Buffer.from(await request.arrayBuffer()))
    }
  })
  .onAfterHandle(({ headers, responseValue }) => {
    if (responseValue && headers?.accept?.includes("application/x-msgpack")) {
      return new Response(Uint8Array.from(packr.pack(responseValue)), {
        headers: {
          "Content-Type": "application/x-msgpack"
        }
      })
    }
  })
  .use(authController)
  .use(usersController)
  .use(workspacesController)

export default app

export type App = typeof app
