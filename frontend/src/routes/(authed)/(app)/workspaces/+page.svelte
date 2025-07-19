<script lang="ts">
import httpClient from "$lib/httpClient"
import { createQuery } from "@tanstack/svelte-query"
import Workspaces from "./data.svelte"

const query = createQuery({
	queryKey: ["workspaces"],
	queryFn: async () => {
		const { data, error } = await httpClient.workspaces.get()

		if (error) {
			throw new Error("Error fetching workspaces")
		}

		return data
	}
})
</script>

<h1 class="title">Workspaces</h1>

{#if $query.isLoading}
  <div class="skeleton h-48 w-full"></div>
{:else if $query.isError}
  <p>Error: {$query.error.message}</p>
{:else if $query.isSuccess}
  {#if $query.data.length === 0}
    <p>Nenhum workspace criado</p>
  {:else}
    <Workspaces data={$query.data} />
  {/if}
{/if}

<a href="/workspaces/create" class="btn btn-primary mt-5">
  Criar Workspace
</a>
