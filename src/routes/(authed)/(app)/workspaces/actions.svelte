<script lang="ts">
import type { CellContext } from "@tanstack/svelte-table"
import { goto } from "$app/navigation"
import type httpClient from "$lib/httpClient"

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

<a
  class="btn btn-primary"
  href={`/workspaces/${slug}`}
>
  Acessar
</a>
