import type { WebSocketData } from "@socket.io/bun-engine"
import type { Handle } from "@sveltejs/kit"
import { dev } from "$app/environment"
import { getHttpClient } from "$lib/httpClient"
import app from "./backend"
import engine from "./backend/realtime"

export const handle: Handle = async ({ event, resolve }) => {
  if (event.url.pathname.startsWith("/api")) {
    return app.handle(event.request)
  }

  if (!dev && event.url.pathname === "/socket.io/") {
    if (!event.platform) {
      throw new Error("Platform is required for socket.io endpoint")
    }

    return engine.handleRequest(event.platform.request, event.platform.server)
  }

  const httpClient = getHttpClient(event.url.origin, event.fetch)
  const { data, error } = await httpClient.users.me.get()

  if (!error) {
    event.locals.user = data
  }

  const response = await resolve(event, {
    filterSerializedResponseHeaders: (name) => name === "content-type"
  })

  response.headers.set("Cross-Origin-Embedder-Policy", "require-corp")
  response.headers.set("Cross-Origin-Opener-Policy", "same-origin")

  return response
}

export const websocket: Bun.WebSocketHandler<WebSocketData> =
  engine.handler().websocket
