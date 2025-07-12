<script lang="ts">
import { QueryClientProvider } from "@tanstack/svelte-query"
import "../app.css"
import type { Snippet } from "svelte"
import type { LayoutData } from "./$types"

const { queryClient, children }: LayoutData & { children: Snippet<[]> } =
	$props()
</script>

<QueryClientProvider client={queryClient}>
  {@render children()}
</QueryClientProvider>
