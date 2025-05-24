<script lang="ts">
import { cn } from "$lib/cn"
import type { HTMLButtonAttributes } from "svelte/elements"

interface Props extends HTMLButtonAttributes {
	loading?: boolean
}

const { class: className, loading, children, ...props }: Props = $props()
</script>

<button class={cn("btn", loading && "cursor-progress pointer-events-none", className)} {...props}>
  {#if loading}
    <span class="loading loading-spinner animate-fade-right"></span>
  {/if}
  {#if children}
    {@render children()}
  {/if}
</button>
