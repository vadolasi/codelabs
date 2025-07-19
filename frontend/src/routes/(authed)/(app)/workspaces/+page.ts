import getHttpClient from "$lib/getHttpClient"
import type { PageLoad } from "./$types"

export const load: PageLoad = async ({ parent, fetch }) => {
	const { queryClient } = await parent()

	await queryClient.prefetchQuery({
		queryKey: ["workspaces"],
		queryFn: async () => {
			const { data, error } = await getHttpClient(fetch).workspaces.get()

			if (error) {
				throw new Error("Failed to fetch workspaces")
			}

			return data
		}
	})
}
