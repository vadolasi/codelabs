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

const isInvalid = !!$errors?.length
</script>

<label class={cn("floating-label", containerClass)}>
  <input
    placeholder={label}
    name={field}
    class={cn("input", className, isInvalid && "input-error")}
    {...props}
    aria-invalid={isInvalid}
    bind:value={$value}
    {...$constraints}
  />
  {#if children}
    {@render children()}
  {/if}
  {#if $errors?.length}
    {#each $errors as error}
      <p class="label text-sm text-error flex flex-col items-start">{@html error}</p>
    {/each}
  {/if}
  <span>{label}</span>
</label>
