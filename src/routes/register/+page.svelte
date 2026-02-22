<script lang="ts">
import { createForm } from "@tanstack/svelte-form"
import { createMutation } from "@tanstack/svelte-query"
import emailSpellChecker from "@zootools/email-spell-checker"
import { zxcvbnAsync, zxcvbnOptions } from "@zxcvbn-ts/core"
import * as zxcvbnCommonPackage from "@zxcvbn-ts/language-common"
import * as zxcvbnPtBrPackage from "@zxcvbn-ts/language-pt-br"
import { matcherPwnedFactory } from "@zxcvbn-ts/matcher-pwned"
import { z } from "zod"
import { goto } from "$app/navigation"
import { page } from "$app/state"
import httpClient from "$lib/httpClient"
import Button from "../../components/Button.svelte"
import FormField from "../../components/FormField.svelte"
import toaster from "../../components/Toaster/store"

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

let score: number | null = $state(null)

const schema = z.object({
  email: z.string().min(1, "Este campo é obrigatório"),
  username: z.string().min(1, "Este campo é obrigatório"),
  password: z.string().min(1, "Este campo é obrigatório"),
  passwordConfirmation: z.string().min(1, "Este campo é obrigatório")
})

type FormData = z.infer<typeof schema>

let emailSuggestion: string | null = $state(null)
let errorMessage: string | null = $state(null)
let isNavigating = $state(false)

const registerMutation = createMutation({
  mutationFn: async ({ email, username, password }: FormData) => {
    const { data, error } = await httpClient.users.register.post({
      email,
      username,
      password
    })

    if (error) {
      const message = error.value.message as string
      if (message === "EMAIL_ALREADY_EXISTS") {
        throw new Error("Este e-mail já está em uso")
      }
      if (message === "USERNAME_ALREADY_EXISTS") {
        throw new Error("Este nome de usuário já está em uso")
      }
      if (message === "WEAK_PASSWORD") {
        throw new Error("A senha escolhida é muito fraca")
      }
      throw new Error(error.value.message ?? "Erro ao registrar usuário")
    }

    return data
  },
  onSuccess: async (_, { email }) => {
    isNavigating = true
    const redirectTo = page.url.searchParams.get("redirect")
    await goto("/register/verify-email", { state: { email, redirectTo } })
    isNavigating = false
  },
  onError: (error) => {
    errorMessage = error.message
  }
})

const form = createForm(() => ({
  defaultValues: {
    email: "",
    username: "",
    password: "",
    passwordConfirmation: ""
  },
  onSubmit: async ({ value }) => {
    await $registerMutation.mutateAsync(value)
  }
}))

function acceptEmailSuggestion() {
  if (emailSuggestion) {
    form.setFieldValue("email", emailSuggestion)
    emailSuggestion = null
  }
}
</script>

<div class="flex flex-col gap-8 w-full min-h-screen items-center justify-center">
  {#if errorMessage}
    <div role="alert" class="alert alert-error w-full max-w-md">
      <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6 shrink-0 stroke-current" fill="none" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
      <span>{errorMessage}</span>
    </div>
  {/if}
  <div class="card bg-base-200 shadow-lg w-full m-10 md:m-0 md:w-2/3 lg:w-1/3 xl:w-1/4">
    <form
      class="card-body space-y-3"
      novalidate
      onsubmit={(e) => {
        e.preventDefault()
        e.stopPropagation()
        form.handleSubmit()
      }}
    >
      <h2 class="card-title">Registro</h2>

      <form.Field
        name="email"
        validators={{
          onBlur: schema.shape.email,
          onChangeAsync: async ({ value }) => {
            const suggestion = emailSpellChecker.run({
              email: value
            })

            if (suggestion) {
              emailSuggestion = suggestion.full
            } else {
              emailSuggestion = null
            }
          }
        }}
      >
        {#snippet children(field)}
          <FormField field={field} label="Email" type="email" autocomplete="email" inputmode="email" class="w-full">
            {#if emailSuggestion}
              <div class="text-xs">Você quiz dizer <button type="button" aria-label="Aceitar sugestão" class="underline" onclick={acceptEmailSuggestion}>{emailSuggestion}</button>?</div>
            {/if}
          </FormField>
        {/snippet}
      </form.Field>

      <form.Field name="username" validators={{ onBlur: schema.shape.username }}>
        {#snippet children(field)}
          <FormField field={field} label="Nome de usuário" type="text" autocomplete="username" required class="w-full" />
        {/snippet}
      </form.Field>

      <form.Field
        name="password"
        asyncDebounceMs={200}
        validators={{
          onBlur: z.string().min(1, "Este campo é obrigatório"),
          onChangeAsyncDebounceMs: 200,
          onChangeAsync: async ({ value, fieldApi }) => {
            if (value) {
              const result = await zxcvbnAsync(value, [fieldApi.form.getFieldValue("email"), fieldApi.form.getFieldValue("username")])
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
          <FormField
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
                {#if score === 4}
                  <span class="text-success">Alta</span>
                {:else if score === 3}
                  <span class="text-success">Média</span>
                {:else if score === 2}
                  <span class="text-warning">Razoável</span>
                {:else if score === 1}
                  <span class="text-error">Fraca</span>
                {:else}
                  <span class="text-error">Muito Fraca</span>
                {/if}
              </p>
            {/if}
          </FormField>
        {/snippet}
      </form.Field>

       <form.Field 
        name="passwordConfirmation"
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
          <FormField
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
        <Button type="submit" class="btn-primary btn-block" loading={$registerMutation.isPending || isNavigating}>Registrar</Button>
        <span class="text-center text-base-content w-full">
          Já tem uma conta?
          <a href={`/login${page.url.search}`} class="link">Entrar</a>
        </span>
      </div>
    </form>
  </div>
</div>
