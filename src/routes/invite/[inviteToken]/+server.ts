import { redirect } from "@sveltejs/kit"
import { getHttpClient } from "$lib/httpClient"
import type { RequestHandler } from "./$types"

export const GET: RequestHandler = async ({ params, fetch, url, locals }) => {
  if (!locals.user) {
    const paramsUrl = new URLSearchParams({ redirect: url.pathname }).toString()
    return redirect(307, `/login?${paramsUrl}`)
  }

  const httpClient = getHttpClient(url.origin, fetch)

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
