<script lang="ts">
import { goto } from "$app/navigation"
import httpClient from "$lib/httpClient"
import { createMutation } from "@tanstack/svelte-query"
import { defaults, superForm } from "sveltekit-superforms"
import { zod, zodClient } from "sveltekit-superforms/adapters"
import { z } from "zod"
import Button from "../../components/Button.svelte"
import FormField from "../../components/FormField.svelte"

const schema = z.object({
	emailOrUsername: z.string().min(1, "Este campo é obrigatório"),
	password: z.string().min(1, "Este campo é obrigatório")
})

type FormData = z.infer<typeof schema>

const loginMutation = createMutation({
	mutationFn: async ({ emailOrUsername, password }: FormData) => {
		const { data, error } = await httpClient.auth.login.post({
			emailOrUsername,
			password
		})

		if (error) {
			if (error.status !== 422) {
				throw new Error(error.value.code, { cause: error.value })
			}

			throw new Error(error.value.message ?? "UNKNOWN_ERROR")
		}

		return data
	},
	onSuccess: () => {
		goto("/")
	},
	onError: (error, { emailOrUsername }) => {
		if (error.message === "EMAIL_NOT_VERIFIED") {
			const email = (error as { cause: { data: { email: string } } }).cause.data
				.email
			goto("/register/verify-email", { state: { email } })
		} else {
			// Handle other errors
			console.error("Login error:", error)
		}
	}
})

const form = superForm(defaults(zod(schema)), {
	SPA: true,
	validators: zodClient(schema),
	onUpdate: async ({ form }) => {
		if (form.valid) {
			await $loginMutation.mutateAsync(form.data)
		}
	}
})

const { enhance, delayed } = form
</script>

<div class="flex w-full min-h-screen items-center justify-center">
  <div class="card card-border card-lg bg-base-100 w-96 shadow-sm">
    <form class="card-body space-y-3" use:enhance>
      <h2 class="card-title">Entrar</h2>
      <FormField {form} field="emailOrUsername" label="Email" type="text" autocomplete="email" class="input-lg w-full" />
      <FormField {form} field="password" label="Senha" type="password" autocomplete="current-password" class="input-lg w-full" />
      <div class="card-actions">
        <Button type="submit" class="btn-lg btn-primary btn-block" loading={$delayed}>Entrar</Button>
        <div class="flex flex-col items-center w-full gap-3">
          <span class="text-base-content/50">Não tem uma conta? <a href="/register" class="link">Registrar</a></span>
          <span class="text-base-content/50 -mt-2"><a href="/forgot-password" class="link">Esqueceu a senha?</a></span>
        </div>
      </div>
    </form>
  </div>
</div>
