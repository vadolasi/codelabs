<script lang="ts">
import { createQuery } from "@tanstack/svelte-query"
import httpClient from "$lib/httpClient.js"

const { data } = $props()

const query = createQuery({
  initialData: () => data.workspaces,
  queryKey: ["last_workspaces"],
  queryFn: async () => {
    const { data, error } = await httpClient.workspaces.get({
      query: {
        limit: 5,
        recent: true
      }
    })

    if (error) {
      throw new Error("Error fetching workspaces")
    }

    return data
  }
})
</script>

{#if $query.isLoading}
  <div class="skeleton h-48 w-full"></div>
{:else if $query.isError}
  <p>Error: {$query.error.message}</p>
{:else if $query.isSuccess}
  {#if $query.data.length === 0}
    <p>Nenhum workspace criado</p>
    <a href="/workspaces/create" class="btn btn-primary mt-5">
      Criar Workspace
    </a>
  {:else}
    <h2 class="title">Últimos workspaces</h2>
    <ul class="grid grid-cols-4 gap-4">
      {#each $query.data as workspace}
        <li class="card card-border">
          <a href={`/workspaces/${workspace.slug}`}>
            <div class="card-body">
              <h2 class="card-title">{workspace.name}</h2>
            </div>
          </a>
        </li>
      {/each}
    </ul>
    <a href="/workspaces" class="btn btn-primary mt-5">
      Ver todos os workspaces
    </a>
  {/if}
{/if}
