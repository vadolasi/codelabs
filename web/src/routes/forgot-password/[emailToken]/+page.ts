import { getHttpClient } from "$lib/httpClient"
import { error } from "@sveltejs/kit"
import type { PageLoad } from "./$types"

export const load: PageLoad = async ({ params, fetch }) => {
	const httpClient = getHttpClient(fetch)

	const { data } = await httpClient.users["reset-password"]
		["check-code"]({ emailToken: params.emailToken })
		.get()

	if (!data?.isValid) {
		error(400, { message: "Código de verificação inválido ou expirado." })
	}

	return { email: data.email, username: data.username }
}
