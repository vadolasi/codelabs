import { getHttpClient } from "$lib/httpClient"
import type { PageLoad } from "./$types"

export const load: PageLoad = async ({ parent, fetch }) => {
	const { queryClient } = await parent()

	const httpClient = getHttpClient(fetch)

	await queryClient.prefetchQuery({
		queryKey: ["workspaces"],
		queryFn: async () => {
			const { data, error } = await httpClient.workspaces.get()

			if (error) {
				throw new Error("Failed to fetch workspaces")
			}

			return data
		}
	})
}
