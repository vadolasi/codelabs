import { getHttpClient } from "$lib/httpClient"
import type { PageLoad } from "./$types"

export const load: PageLoad = async ({ params, fetch, url }) => {
  const httpClient = getHttpClient(url.origin, fetch)

  const { data: workspace, error } = await httpClient
    .workspaces({ slug: params.workspaceSlug })
    .get()

  if (error) {
    throw new Error("Failed to fetch workspace")
  }

  return {
    workspace
  }
}
