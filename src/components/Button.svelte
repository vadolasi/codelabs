<script lang="ts">
import type { HTMLButtonAttributes } from "svelte/elements"
import { cn } from "$lib/cn"

interface Props extends HTMLButtonAttributes {
  loading?: boolean
}

const { class: className, loading, children, ...props }: Props = $props()
</script>

<button type="button" class={cn("btn shadow-none", loading && "cursor-progress pointer-events-none opacity-75", className)} {...props}>
  {#if loading}
    <span class="loading loading-spinner animate-fade-right"></span>
  {/if}
  {#if children}
    {@render children()}
  {/if}
</button>
