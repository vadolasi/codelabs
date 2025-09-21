import { getHttpClient } from "$lib/httpClient"
import { error } from "@sveltejs/kit"
import type { PageServerLoad } from "./$types"

export const load: PageServerLoad = async ({
	params,
	fetch,
	url,
	setHeaders
}) => {
	const httpClient = getHttpClient(url.origin, fetch)

	const { data } = await httpClient.users["reset-password"]
		["check-code"]({ emailToken: params.emailToken })
		.get()

	if (!data?.isValid) {
		error(400, { message: "Código de verificação inválido ou expirado." })
	}

	setHeaders({
		"Referrer-Policy": "strict-origin"
	})

	return { email: data.email, username: data.username }
}
