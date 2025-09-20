<script lang="ts">
import { QueryClientProvider } from "@tanstack/svelte-query"
import "../app.css"
import { injectAnalytics } from "@vercel/analytics/sveltekit"
import type { Snippet } from "svelte"
import Toaster from "../components/Toaster/index.svelte"
import type { LayoutData } from "./$types"

injectAnalytics()

const { queryClient, children }: LayoutData & { children: Snippet<[]> } =
	$props()
</script>

<Toaster />

<QueryClientProvider client={queryClient}>
  {@render children()}
</QueryClientProvider>
