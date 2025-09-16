import httpClient from "$lib/httpClient"
import type { Handle } from "@sveltejs/kit"

export const handle: Handle = async ({ event, resolve }) => {
	const { data } = await httpClient.users.me.get()

	event.locals.user = data

	const response = await resolve(event, {
		filterSerializedResponseHeaders: (name) => name === "content-type"
	})
	response.headers.set("Cross-Origin-Embedder-Policy", "require-corp")
	response.headers.set("Cross-Origin-Opener-Policy", "same-origin")

	return response
}
