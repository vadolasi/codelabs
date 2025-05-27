<script lang="ts">
import { QueryClientProvider } from "@tanstack/svelte-query"
import "../app.css"
import type { LayoutData } from "./$types"
import type { Snippet } from "svelte"

const { queryClient, children }: LayoutData & { children: Snippet<[]> } =
	$props()
</script>

<QueryClientProvider client={queryClient}>
  {@render children()}
</QueryClientProvider>
