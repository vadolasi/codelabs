import { getHttpClient } from "$lib/httpClient"
import type { PageLoad } from "./$types"

export const load: PageLoad = async ({ params, parent, fetch }) => {
	const { queryClient } = await parent()

	const httpClient = getHttpClient(fetch)

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
