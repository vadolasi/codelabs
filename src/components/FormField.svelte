<script lang="ts" generics="T extends Record<string, any>">
import { cn } from "$lib/cn"
import type { HTMLInputAttributes } from "svelte/elements"
import { formFieldProxy, type FormPathLeaves, type SuperForm } from "sveltekit-superforms/client"

interface Props extends Omit<HTMLInputAttributes, "form"> {
  containerClass?: string
  label: string
  form: SuperForm<T>
  field: FormPathLeaves<T>
}

const { label, form, field, containerClass, class: className, children, ...props }: Props = $props()

const { value, errors, constraints } = formFieldProxy(form, field)
</script>

<label class={cn("floating-label", containerClass)}>
  <input
    placeholder={label}
    class={cn("input w-full", className)}
    {...props}
    aria-invalid={$errors?.length ? true : undefined}
    bind:value={$value}
    {...$constraints}
  />
  {#if children}
    {@render children()}
  {/if}
  {#if $errors?.length}
    <div>
      {#each $errors as error}
        <span class="text-error text-xs">{@html error}</span>
      {/each}
    </div>
  {/if}
  <span>{label}</span>
</label>
