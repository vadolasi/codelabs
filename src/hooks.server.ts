import type { WebSocketData } from "@socket.io/bun-engine"
import type { Handle } from "@sveltejs/kit"
import { dev } from "$app/environment"
import { getHttpClient } from "$lib/httpClient"
import engine from "./backend/realtime"

export const handle: Handle = async ({ event, resolve }) => {
  if (!dev && event.url.pathname === "/socket.io/") {
    if (!event.platform) {
      throw new Error("Platform is required for socket.io endpoint")
    }

    return engine.handleRequest(event.platform.request, event.platform.server)
  }

  if (!event.url.pathname.startsWith("/api")) {
    const httpClient = getHttpClient(event.url.origin, event.fetch)
    const { data } = await httpClient.users.me.get()

    event.locals.user = data

    const response = await resolve(event, {
      filterSerializedResponseHeaders: (name) => name === "content-type"
    })

    response.headers.set("Cross-Origin-Embedder-Policy", "require-corp")
    response.headers.set("Cross-Origin-Opener-Policy", "same-origin")

    return response
  }

  return resolve(event)
}

export const websocket: Bun.WebSocketHandler<WebSocketData> =
  engine.handler().websocket
