<script lang="ts">
import { page } from "$app/state"
import httpClient from "$lib/httpClient"
import { createQuery } from "@tanstack/svelte-query"
import { WebContainer } from "@webcontainer/api"
import Editor from "../../../components/Editor/index.svelte"
  import { onMount } from "svelte";

const {
	params: { workspaceSlug }
} = page

const query = createQuery({
	queryKey: ["workspaces", workspaceSlug],
	queryFn: async () => {
		const { data, error } = await httpClient
			.workspaces({ slug: workspaceSlug })
			.get()

		if (error) {
			throw new Error("Error fetching workspace")
		}

		return data
	}
})

let webcontainer: WebContainer | null = null

$: if ($query.data !== undefined && webcontainer === null) {
	WebContainer.boot({
		workdirName: "codelabs"
	}).then(async (loadedWebcontainer) => {
		webcontainer = loadedWebcontainer
	})
}

onMount(() => {
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
