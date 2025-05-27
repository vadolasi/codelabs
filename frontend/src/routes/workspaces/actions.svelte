<script lang="ts">
import { goto } from "$app/navigation"
import type { ApiData } from "$lib/httpClient"
import type { CellContext } from "@tanstack/svelte-table"

const { row }: CellContext<ApiData<"workspaces.get">[0], unknown> = $props()
const { id } = row.original
</script>

<button
  class="btn btn-primary"
  onclick={() => goto(`/workspaces/${id}`)}
>
  Acessar
</button>
