import httpClient from "$lib/httpClient"
import type { PageLoad } from "./$types"

export const load: PageLoad = async ({ params, parent }) => {
	const { queryClient } = await parent()

	await queryClient.prefetchQuery({
		queryKey: ["workspaces", params.workspaceSlug],
		queryFn: async () => {
			const { data, error } = await httpClient
				.workspaces({ slug: params.workspaceSlug })
				.get()

			if (error) {
				throw new Error("Failed to fetch workspaces")
			}

			return data
		}
	})
}
