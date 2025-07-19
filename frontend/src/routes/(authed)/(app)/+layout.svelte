<script lang="ts">
import { goto } from "$app/navigation"
import httpClient from "$lib/httpClient"
import { createMutation } from "@tanstack/svelte-query"
import Button from "../../../components/Button.svelte"

const logoutMutation = createMutation({
	mutationFn: async () => {
		const { data, error } = await httpClient.auth.logout.post()

		if (error) {
			throw new Error(error.value.message ?? "UNKNOWN_ERROR")
		}

		return data
	},
	onSuccess: () => {
		goto("/login")
	},
	onError: (error) => {
		console.error("Logout error:", error)
	}
})

const { children } = $props()
</script>

<header class="bg-base-100 border-b border-base-content/10">
  <div class="container mx-auto flex items-center justify-between p-4">
    <a href="/workspaces" class="btn btn-ghost">
      <span class="hidden md:inline">Codelabs</span>
    </a>
    <Button
      class="btn btn-ghost"
      onclick={() => $logoutMutation.mutate()}
      loading={$logoutMutation.isPending}
    >
      Sair
    </Button>
  </div>
</header>

<div class="container p-10 mx-auto">
  {@render children()}
</div>
