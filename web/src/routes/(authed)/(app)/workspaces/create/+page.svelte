<script lang="ts">
import { goto } from "$app/navigation"
import httpClient from "$lib/httpClient"
import randomName from "@scaleway/random-name"
import { createForm } from "@tanstack/svelte-form"
import { createMutation } from "@tanstack/svelte-query"
import { z } from "zod"
import Button from "../../../../../components/Button.svelte"
import FormField from "../../../../../components/FormField.svelte"

const schema = z.object({
	name: z.string().min(1, "Este campo é obrigatório")
})

type FormData = z.infer<typeof schema>

const createWorkspaceMutation = createMutation({
	mutationFn: async ({ name }: FormData) => {
		const { data, error } = await httpClient.workspaces.post({ name })

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
		name: randomName("", " ")
	},
	onSubmit: async ({ value }) => {
		await $createWorkspaceMutation.mutateAsync(value)
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
>
  <h1 class="title">Criar Workspace</h1>
  <form.Field name="name" validators={{ onBlur: schema.shape.name }}>
    {#snippet children(field)}
      <FormField field={field} label="Nome" type="text" />
    {/snippet}
  </form.Field>
  <Button type="submit" class="btn-primary mt-5" loading={$createWorkspaceMutation.isPending}>Criar</Button>
</form>
