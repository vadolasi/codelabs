import { getHttpClient } from "$lib/httpClient"
import type { PageLoad } from "./$types"

export const load: PageLoad = async ({ fetch, url }) => {
  const httpClient = getHttpClient(url.origin, fetch)

  const { data: workspaces, error } = await httpClient.workspaces.get({
    query: {
      limit: 5
    }
  })

  if (error) {
    throw new Error("Failed to fetch workspaces")
  }

  return {
    workspaces
  }
}
