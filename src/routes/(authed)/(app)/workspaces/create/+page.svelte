<script lang="ts">
import randomName from "@scaleway/random-name"
import { createForm } from "@tanstack/svelte-form"
import { createMutation } from "@tanstack/svelte-query"
import { z } from "zod"
import { goto } from "$app/navigation"
import httpClient from "$lib/httpClient"
import Button from "../../../../../components/Button.svelte"
import FormField from "../../../../../components/FormField.svelte"

const schema = z.object({
  name: z.string().min(1, "Este campo é obrigatório"),
  engine: z.enum(["webcontainers", "skulpt"])
})

type FormData = z.infer<typeof schema>

const createWorkspaceMutation = createMutation({
  mutationFn: async ({ name, engine }: FormData) => {
    const { data, error } = await httpClient.workspaces.post({ name, engine })

    if (error) {
      throw new Error(error.value.message ?? "UNKNOWN_ERROR")
    }

    return data
  },
  onSuccess: ({ slug }) => {
    goto(`/workspaces/${slug}`)
  },
  onError: (error) => {
    console.error("Login error:", error)
  }
})

const form = createForm(() => ({
  defaultValues: {
    name: randomName("", " "),
    engine: "webcontainers" as const
  },
  onSubmit: async ({ value }) => {
    $createWorkspaceMutation.mutate(value)
  }
}))
</script>

<form
  novalidate
  onsubmit={(e) => {
    e.preventDefault()
    e.stopPropagation()
    form.handleSubmit()
  }}
  class="flex flex-col gap-4"
>
  <h1 class="title">Criar Workspace</h1>
  <form.Field name="name" validators={{ onBlur: schema.shape.name }}>
    {#snippet children(field)}
      <FormField field={field} label="Nome" type="text" />
    {/snippet}
  </form.Field>

  <form.Field name="engine">
    {#snippet children(field)}
      <div class="form-control w-full">
        <label class="label" for={field.name}>
          <span class="label-text">Engine</span>
        </label>
        <select
          id={field.name}
          name={field.name}
          value={field.state.value}
          onblur={field.handleBlur}
          onchange={(e) => field.handleChange(e.currentTarget.value as any)}
          class="select select-bordered w-full"
        >
          <option value="webcontainers">WebContainer (Full Node.js)</option>
          <option value="skulpt">Skulpt (Python Browser)</option>
        </select>
        {#if field.state.meta.errors.length > 0}
          <label class="label" for={field.name}>
            <span class="label-text-alt text-error">{field.state.meta.errors.join(", ")}</span>
          </label>
        {/if}
      </div>
    {/snippet}
  </form.Field>

  <Button type="submit" class="btn-primary mt-5" loading={$createWorkspaceMutation.isPending}>Criar</Button>
</form>
