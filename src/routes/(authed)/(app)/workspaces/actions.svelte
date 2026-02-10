<script lang="ts">
import { goto } from "$app/navigation"
import type httpClient from "$lib/httpClient"
import type { CellContext } from "@tanstack/svelte-table"

const {
	row
}: CellContext<
	Exclude<
		Awaited<ReturnType<typeof httpClient.workspaces.get>>["data"],
		undefined | null
	>[number],
	unknown
> = $props()
const slug = $derived.by(() => row.original.slug)
</script>

<button
  class="btn btn-primary"
  onclick={() => goto(`/workspaces/${slug}`)}
>
  Acessar
</button>
