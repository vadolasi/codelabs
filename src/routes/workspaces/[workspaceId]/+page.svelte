<script lang="ts">
import { WebContainer } from "@webcontainer/api"
import Editor from "../../../components/Editor/index.svelte"
import { createQuery } from "@tanstack/svelte-query"
import httpClient from "$lib/httpClient"
import { page } from "$app/state"

const {
	params: { workspaceId }
} = page

const query = createQuery({
	queryKey: ["workspaces", workspaceId],
	queryFn: async () => {
		const { data, error } = await httpClient
			.workspaces({ id: workspaceId })
			.get()

		if (error) {
			throw new Error("Error fetching workspace")
		}

		return data
	}
})

let webcontainer: WebContainer | null = $state(null)

$effect(() => {
	if ($query.data !== undefined && webcontainer === null) {
		WebContainer.boot({ workdirName: "codelabs" }).then(
			async (loadedWebcontainer) => {
				await loadedWebcontainer.mount($query.data!.content)
				webcontainer = loadedWebcontainer
			}
		)
	}

	return () => {
		if (webcontainer) {
			webcontainer.teardown()
		}
	}
})
</script>

{#if $query.isLoading || webcontainer === null}
  <div class="flex flex-col items-center justify-center h-screen gap-4">
    <div class="radial-progress animate-spin" style:--value={70} aria-valuenow="70" role="progressbar"></div>
    <span class="text-2xl text-base-content/50 text-center">Carregando ambiente de<br />desenvolvimento</span>
  </div>
{:else if $query.isError}
  <p>Error: {$query.error.message}</p>
{:else if $query.isSuccess}
  <Editor webcontainer={webcontainer} workspace={$query.data!} />
{/if}
