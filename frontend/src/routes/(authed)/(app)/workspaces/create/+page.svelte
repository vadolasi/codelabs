<script lang="ts">
import { goto } from "$app/navigation"
import httpClient from "$lib/httpClient"
import randomName from "@scaleway/random-name"
import { createMutation } from "@tanstack/svelte-query"
import { superForm } from "sveltekit-superforms"
import { zodClient } from "sveltekit-superforms/adapters"
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

const form = superForm(
	{ name: randomName("", " ") },
	{
		SPA: true,
		validators: zodClient(schema),
		onUpdate: async ({ form }) => {
			if (form.valid) {
				await $createWorkspaceMutation.mutateAsync(form.data)
			}
		}
	}
)

const { enhance, delayed } = form
</script>

<form use:enhance>
  <h1 class="title">Criar Workspace</h1>
  <FormField {form} field="name" label="Nome" type="text" />
  <Button type="submit" class="btn-primary mt-5" loading={$delayed}>Criar</Button>
</form>
