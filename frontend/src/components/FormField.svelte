<script lang="ts" generics="T extends Record<string, any>">
import { cn } from "$lib/cn"
import type { HTMLInputAttributes } from "svelte/elements"
import {
	type FormPathLeaves,
	type SuperForm,
	formFieldProxy
} from "sveltekit-superforms/client"

interface Props extends Omit<HTMLInputAttributes, "form"> {
	containerClass?: string
	label: string
	form: SuperForm<T>
	field: FormPathLeaves<T>
}

const {
	label,
	form,
	field,
	containerClass,
	class: className,
	children,
	...props
}: Props = $props()

const { value, errors, constraints } = formFieldProxy(form, field)
</script>

<label class={cn("floating-label", containerClass)}>
  <input
    placeholder={label}
    class={cn("input validator", className)}
    {...props}
    aria-invalid={$errors?.length ? true : undefined}
    bind:value={$value}
    {...$constraints}
  />
  {#if children}
    {@render children()}
  {/if}
  {#if $errors?.length}
    {#each $errors as error}
      <div class="validator-hint">{@html error}</div>
    {/each}
  {/if}
  <span>{label}</span>
</label>
