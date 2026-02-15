import { getHttpClient } from "$lib/httpClient"
import type { PageServerLoad } from "./$types"

export const load: PageServerLoad = async ({ url, fetch }) => {
  const httpClient = getHttpClient(url.origin, fetch)
  const { data: stats } = await httpClient.admin.stats.get()

  if (!stats) {
    throw new Error("Failed to fetch admin stats")
  }

  return {
    stats
  }
}
