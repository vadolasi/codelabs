import { getHttpClient } from "$lib/httpClient"
import type { Handle } from "@sveltejs/kit"

export const handle: Handle = async ({ event, resolve }) => {
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
