import httpClient from "$lib/httpClient"
import type { PageLoad } from "./$types"

export const load: PageLoad = async ({ parent }) => {
	const { queryClient } = await parent()

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
