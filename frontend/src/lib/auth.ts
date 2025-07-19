import { getRequestEvent } from "$app/server"
import { redirect } from "@sveltejs/kit"

export function requireLogin() {
	const { locals, url } = getRequestEvent()

	if (!locals.user) {
		const redirectTo = url.pathname + url.search
		const params = new URLSearchParams({ redirect: redirectTo }).toString()

		redirect(307, `/login?${params}`)
	}

	return locals.user
}
