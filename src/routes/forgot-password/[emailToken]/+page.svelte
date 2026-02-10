<script lang="ts">
import { goto } from "$app/navigation"
import { page } from "$app/state"
import httpClient from "$lib/httpClient"
import { createForm } from "@tanstack/svelte-form"
import { createMutation } from "@tanstack/svelte-query"
import { zxcvbnAsync, zxcvbnOptions } from "@zxcvbn-ts/core"
import * as zxcvbnCommonPackage from "@zxcvbn-ts/language-common"
import * as zxcvbnPtBrPackage from "@zxcvbn-ts/language-pt-br"
import { matcherPwnedFactory } from "@zxcvbn-ts/matcher-pwned"
import { z } from "zod"
import Button from "../../../components/Button.svelte"
import FormField2 from "../../../components/FormField.svelte"

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

const emailToken = page.params.emailToken!
const email = page.data.email
const username = page.data.username

let score: number | null = $state(null)

const resetPasswordMutation = createMutation({
	mutationFn: async (newPassword: string) => {
		const { data, error } = await httpClient.users[
			"reset-password"
		].confirm.post({
			code: emailToken,
			newPassword
		})

		if (error) {
			throw new Error(error.value.message ?? "Erro ao resetar a senha", {
				cause: error.value
			})
		}

		return data
	},
	onSuccess: () => {
		goto("/login")
	}
})

const form = createForm(() => ({
	defaultValues: {
		password: "",
		confirmPassword: ""
	},
	onSubmit: async ({ value }) => {
		$resetPasswordMutation.mutate(value.password)
	}
}))
</script>

<div class="flex w-fulll min-h-screen items-center justify-center">
  <div class="card card-border bg-base-300 shadow-sm w-full m-10 md:m-0 md:w-2/3 lg:w-1/3 xl:w-1/4">
    <form
      class="card-body space-y-3"
      novalidate
      onsubmit={(e) => {
        e.preventDefault()
        e.stopPropagation()
        form.handleSubmit()
      }
    }>
      <h2 class="card-title">Redefinir senha</h2>

      <form.Field
        name="password"
        asyncDebounceMs={200}
        validators={{
          onBlur: z.string().min(1, "Este campo é obrigatório"),
          onChangeAsync: async ({ value }) => {
            if (value) {
              const result = await zxcvbnAsync(value, [email, username])
              score = result.score

              if (result.feedback.warning) {
                let message = result.feedback.warning
                if (result.feedback.suggestions.length > 0) {
                  message += `<ul class="list-disc ml-4"><li>${result.feedback.suggestions.join("</li><li>")}</li></ul>`
                }

                return { message }
              } else if (result.score < 3) {
                return { message: "Senha muito fraca" }
              }
            }
          }
        }
      }>
        {#snippet children(field)}
          <FormField2
            field={field}
            label="Nova senha"
            placeholder="Nova senha"
            class="w-full"
            type="password"
            autocomplete="new-password"
            required
          >
            {#if score !== null}
              <p class="text-xs mt-1">
                Segurança:
                {#if score == 4}
                  <span class="text-success">Alta</span>
                {:else if score == 3}
                  <span class="text-warning">Média</span>
                {:else}
                  <span class="text-error">Fraca</span>
                {/if}
              </p>
            {/if}
          </FormField2>
        {/snippet}
      </form.Field>

      <form.Field 
        name="confirmPassword"
        validators={{
          onBlurListenTo: ["password"],
          onBlur: ({ value, fieldApi }) => {
            if (value !== fieldApi.form.getFieldValue("password")) {
              return { message: "As senhas não coincidem" }
            }

            if (!value) {
              return { message: "Este campo é obrigatório" }
            }
          }
        }}
      >
        {#snippet children(field)}
          <FormField2
            field={field}
            label="Confirme a senha"
            class="w-full"
            type="password"
            autocomplete="new-password"
            required
          />
        {/snippet}
      </form.Field>
 
      <div class="card-actions">
        <Button class="btn-primary btn-block" type="submit" loading={$resetPasswordMutation.isPending}>Confirmar</Button>
      </div>
    </form>
  </div>
</div>
