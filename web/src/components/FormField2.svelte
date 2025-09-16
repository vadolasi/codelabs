<script lang="ts">
import { cn } from "$lib/cn"
import type { FieldApi, SvelteFormApi } from "@tanstack/svelte-form"
import type { HTMLInputAttributes } from "svelte/elements"

interface Props extends Omit<HTMLInputAttributes, "form"> {
	containerClass?: string
	label: string
	// biome-ignore lint/suspicious/noExplicitAny: No better type available
	field: FieldApi<
		any,
		any,
		any,
		any,
		any,
		any,
		any,
		any,
		any,
		any,
		any,
		any,
		any,
		any,
		any,
		any,
		any,
		any,
		any,
		any,
		any,
		any,
		any
	>
	// biome-ignore lint/suspicious/noExplicitAny: No better type available
	form: SvelteFormApi<
		any,
		any,
		any,
		any,
		any,
		any,
		any,
		any,
		any,
		any,
		any,
		any
	>
}

const {
	label,
	field,
	form,
	containerClass,
	class: className,
	children,
	...props
}: Props = $props()

const isInvalid = $derived(() => field.state.meta.errors.length > 0)
</script>

<label class={cn("floating-label", containerClass)}>
  <input
    {...props}
    placeholder={label}
    name={field.name}
    value={field.state.value}
    onblur={field.handleBlur}
    oninput={(e) => field.handleChange(e.currentTarget.value)}
    class={cn("input", className, isInvalid() && "input-error")}
    aria-invalid={isInvalid()}
  />
  {#if children}
    {@render children()}
  {/if}
  {#if isInvalid()}
    {#each field.state.meta.errors as error}
      <p class="label text-sm text-error flex flex-col items-start">
        {@html (error as Error).message}
      </p>
    {/each}
  {/if}
  <span>{label}</span>
</label>
