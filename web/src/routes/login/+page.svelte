<script lang="ts">
import { goto } from "$app/navigation"
import { page } from "$app/state"
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

let errorMessage: string | null = $state(null)

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
		const redirectTo = page.url.searchParams.get("redirect")

		if (redirectTo && !redirectTo.startsWith("/")) {
			goto("/")
		}

		goto(redirectTo || "/")
	},
	onError: (error) => {
		if (error.message === "EMAIL_NOT_VERIFIED") {
			const email = (error as { cause: { data: { email: string } } }).cause.data
				.email
			goto("/register/verify-email", { state: { email } })
		} else {
			errorMessage = error.message
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

const { enhance } = form
</script>

<div class="flex flex-col gap-8 w-full min-h-screen items-center justify-center">
  {#if errorMessage}
    <div role="alert" class="alert alert-error">
      <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6 shrink-0 stroke-current" fill="none" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
      <span>{errorMessage}</span>
    </div>
  {/if}
  <div class="card card-border bg-base-200 w-96 shadow-lg">
    <form class="card-body space-y-3" use:enhance>
      <h2 class="card-title">Entrar</h2>
      <FormField {form} field="emailOrUsername" label="Email" type="text" autocomplete="email" class="w-full" />
      <FormField {form} field="password" label="Senha" type="password" autocomplete="current-password" class="w-full" />
      <div class="card-actions">
        <Button type="submit" class="btn btn-primary btn-block"  loading={$loginMutation.isPending}>Entrar</Button>
        <div class="flex flex-col items-center w-full gap-3">
          <span class="text-base-content">Não tem uma conta? <a href="/register" class="link">Registrar</a></span>
          <span class="text-base-content -mt-2"><a href="/forgot-password" class="link">Esqueceu a senha?</a></span>
        </div>
      </div>
    </form>
  </div>
</div>
