<script lang="ts">
import { goto } from "$app/navigation"
import { cn } from "$lib/cn"
import httpClient from "$lib/httpClient"
import { createMutation } from "@tanstack/svelte-query"
import emailSpellChecker from "@zootools/email-spell-checker"
import { zxcvbnAsync, zxcvbnOptions } from "@zxcvbn-ts/core"
import * as zxcvbnCommonPackage from "@zxcvbn-ts/language-common"
import * as zxcvbnPtBrPackage from "@zxcvbn-ts/language-pt-br"
import { matcherPwnedFactory } from "@zxcvbn-ts/matcher-pwned"
import AwesomeDebouncePromise from "awesome-debounce-promise"
import { defaults, superForm } from "sveltekit-superforms"
import { zod, zodClient } from "sveltekit-superforms/adapters"
import { z } from "zod"
import Button from "../../components/Button.svelte"
import FormField from "../../components/FormField.svelte"

const matcherPwned = matcherPwnedFactory(fetch, zxcvbnOptions)
zxcvbnOptions.addMatcher("pwned", matcherPwned)

zxcvbnOptions.setOptions({
	translations: zxcvbnPtBrPackage.translations,
	graphs: zxcvbnCommonPackage.adjacencyGraphs,
	dictionary: {
		...zxcvbnCommonPackage.dictionary,
		...zxcvbnPtBrPackage.dictionary
	},
	useLevenshteinDistance: true
})

const debouncedZxcvbnAsync = AwesomeDebouncePromise(zxcvbnAsync, 200)

let score: number | null = $state(null)

const schema = z
	.object({
		email: z.string().min(1, "Este campo é obrigatório"),
		username: z.string().min(1, "Este campo é obrigatório"),
		password: z.string().min(1, "Este campo é obrigatório"),
		passwordConfirmation: z.string().min(1, "Este campo é obrigatório")
	})
	.superRefine(async (data, ctx) => {
		if (data.password) {
			if (
				data.passwordConfirmation &&
				data.password !== data.passwordConfirmation
			) {
				ctx.addIssue({
					code: "custom",
					message: "As senhas não coincidem",
					fatal: true,
					path: ["passwordConfirmation"]
				})
			}
			const result = await debouncedZxcvbnAsync(data.password, [
				data.email,
				data.username
			])
			score = result.score + 1
			let message = result.feedback.warning
			if (result.feedback.suggestions.length > 0) {
				message += `<ul class="list-disc ml-4"><li>${result.feedback.suggestions.join("</li><li>")}</li></ul>`
			}
			if (result.score < 3) {
				ctx.addIssue({
					code: "custom",
					message: message || "Senha muito fraca",
					fatal: true,
					path: ["password"]
				})
			}
		}
	})

type FormData = z.infer<typeof schema>

let emailSuggestion: string | null = $state(null)

const registerMutation = createMutation({
	mutationFn: async ({ email, username, password }: FormData) => {
		const { data, error } = await httpClient.users.register.post({
			email,
			username,
			password
		})

		if (error) {
			throw new Error(error.value.message ?? "Erro ao registrar usuário")
		}

		return data
	},
	onSuccess: (_, { email }) => {
		goto("/register/verify-email", { state: { email } })
	}
})

const form = superForm(defaults(zod(schema)), {
	SPA: true,
	validators: zodClient(schema),
	clearOnSubmit: "none",
	onUpdate: async ({ form }) => {
		if (form.valid) {
			await $registerMutation.mutateAsync(form.data)
		}
	},
	onChange: ({ get }) => {
		const suggestion = emailSpellChecker.run({
			email: get("email")
		})

		if (suggestion) {
			emailSuggestion = suggestion.full
		} else {
			emailSuggestion = null
		}
	}
})

const { enhance, form: formData } = form

function acceptEmailSuggestion() {
	if (emailSuggestion) {
		$formData.email = emailSuggestion
		emailSuggestion = null
	}
}
</script>

<div class="flex w-full min-h-screen items-center justify-center">
  <div class="card bg-base-200 shadow-lg w-full m-10 md:m-0 md:w-2/3 lg:w-1/3 xl:w-1/4">
    <form class="card-body space-y-3" use:enhance novalidate>
      <h2 class="card-title">Registro</h2>
      <FormField {form} field="email" label="Email" type="email" autocomplete="email" inputmode="email" required class="w-full">
        {#if emailSuggestion}
          <div class="text-xs">Você quiz dizer <button type="button" aria-label="Aceitar sugestão" class="underline" onclick={acceptEmailSuggestion}>{emailSuggestion}</button>?</div>
        {/if}
      </FormField>
      <FormField {form} field="username" label="Nome de usuário" type="text" autocomplete="username" required class="w-full" />
      <FormField {form} field="password" label="Senha" type="password" autocomplete="new-password" required containerClass={cn(score !== null && "mb-0")} class="w-full">
        {#if score !== null}
          <p class="text-xs mt-1">
            Segurança:
            {#if score >= 8}
              <span class="text-success">Segura</span>
            {:else if score >= 5}
              <span class="text-warning">Moderada</span>
            {:else}
              <span class="text-error">Fraca</span>
            {/if}
          </p>
        {/if}
      </FormField>
      <FormField {form} field="passwordConfirmation" label="Confirme a senha" type="password" autocomplete="new-password" required class="w-full" />
      <div class="card-actions">
        <Button type="submit" class="btn-primary btn-block" loading={$registerMutation.isPending}>Registrar</Button>
        <span class="text-center text-base-content w-full">Já tem uma conta? <a href="/login" class="link">Entrar</a></span>
      </div>
    </form>
  </div>
</div>
