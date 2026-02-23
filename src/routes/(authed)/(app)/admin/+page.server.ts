import { error, redirect } from "@sveltejs/kit"
import { getHttpClient } from "$lib/httpClient"
import type { PageServerLoad } from "./$types"

export const load: PageServerLoad = async ({ url, fetch, parent }) => {
  const { user } = await parent()

  if (user?.role !== "admin") {
    redirect(307, "/")
  }

  const httpClient = getHttpClient(url.origin, fetch)
  const { data: stats } = await httpClient.admin.stats.get()

  if (!stats) {
    throw new Error("Failed to fetch admin stats")
  }

  return {
    stats
  }
}
