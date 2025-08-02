import getServerHttpClient from "$lib/serverHttpClient"
import { redirect } from "@sveltejs/kit"
import type { RequestHandler } from "./$types"

export const GET: RequestHandler = async ({ params, request }) => {
	const httpClient = getServerHttpClient(request.headers)

	const { data, error } = await httpClient.workspaces
		.join({
			token: params.inviteToken
		})
		.post()

	if (error) {
		return new Response(error.value.message ?? "Error", { status: 400 })
	}

	return redirect(303, `/workspaces/${data.workspaceSlug}`)
}
