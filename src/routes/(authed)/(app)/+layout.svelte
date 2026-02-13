<script lang="ts">
import { createMutation } from "@tanstack/svelte-query"
import { goto } from "$app/navigation"
import httpClient from "$lib/httpClient"
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

<header class="bg-base-300 border-b border-base-content/10 fixed top-0 z-50 h-20 flex items-center w-full">
  <div class="container m-auto flex items-center justify-between p-4">
    <a href="/" class="btn btn-ghost">
      <span class="hidden md:inline">Codelabs</span>
    </a>
    <Button
      class="btn-ghost"
      onclick={() => $logoutMutation.mutate()}
      loading={$logoutMutation.isPending}
    >
      Sair
    </Button>
  </div>
</header>

<div class="container p-32 mx-auto min-h-screen">
  {@render children()}
</div>
