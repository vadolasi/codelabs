import getHttpClient from "$lib/getHttpClient"
import type { Handle } from "@sveltejs/kit"

export const handle: Handle = async ({ event, resolve }) => {
	const httpClient = getHttpClient(event.fetch)

	const { data } = await httpClient.users.me.get()

	event.locals.user = data

	const response = await resolve(event)
	response.headers.set("Cross-Origin-Embedder-Policy", "require-corp")
	response.headers.set("Cross-Origin-Opener-Policy", "same-origin")

	return response
}
