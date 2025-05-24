import getHttpClient from "$lib/getHttpClient"
import type { PageLoad } from "./$types"

export const load: PageLoad = async ({ params, parent, fetch }) => {
	const { queryClient } = await parent()

	await queryClient.prefetchQuery({
		queryKey: ["workspaces", params.workspaceId],
		queryFn: async () => {
			const { data, error } = await getHttpClient(fetch)
				.workspaces({ id: params.workspaceId })
				.get()

			if (error) {
				throw new Error("Failed to fetch workspaces")
			}

			return data
		}
	})
}
