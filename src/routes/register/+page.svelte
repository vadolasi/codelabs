<script lang="ts">
import { defaults, superForm } from "sveltekit-superforms"
import { zod, zodClient } from "sveltekit-superforms/adapters"
import { z } from "zod"
import FormField from "../../components/FormField.svelte"
import { zxcvbnAsync, zxcvbnOptions } from "@zxcvbn-ts/core"
import * as zxcvbnCommonPackage from "@zxcvbn-ts/language-common"
import * as zxcvbnEnPackage from "@zxcvbn-ts/language-pt-br"
import { matcherPwnedFactory } from "@zxcvbn-ts/matcher-pwned"
import AwesomeDebouncePromise from "awesome-debounce-promise"
import emailSpellChecker from "@zootools/email-spell-checker"
import { cn } from "$lib/cn"
import Button from "../../components/Button.svelte"
import { createMutation } from "@tanstack/svelte-query"
import httpClient from "$lib/httpClient"

const matcherPwned = matcherPwnedFactory(fetch, zxcvbnOptions)
zxcvbnOptions.addMatcher("pwned", matcherPwned)

zxcvbnOptions.setOptions({
  translations: zxcvbnEnPackage.translations,
  graphs: zxcvbnCommonPackage.adjacencyGraphs,
  dictionary: {
    ...zxcvbnCommonPackage.dictionary,
    ...zxcvbnEnPackage.dictionary
  },
  useLevenshteinDistance: true
})

const debouncedZxcvbnAsync = AwesomeDebouncePromise(zxcvbnAsync, 200)

let score: number | null = $state(null)

const schema = z.object({
  email: z.string().min(1, "Este campo é obrigatório"),
  username: z.string().min(1, "Este campo é obrigatório"),
  password: z.string().min(1, "Este campo é obrigatório"),
  passwordConfirmation: z.string().min(1, "Este campo é obrigatório")
})
  .superRefine(async (data, ctx) => {
    if (data.password) {
      if (data.passwordConfirmation && data.password !== data.passwordConfirmation) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "As senhas não coincidem",
          fatal: true,
          path: ["passwordConfirmation"]
        })
      }
      const result = await debouncedZxcvbnAsync(data.password, [data.email, data.username])
      score = result.score + 1
      let message = result.feedback.warning
      if (result.feedback.suggestions.length > 0) {
        message += `<ul class="list-disc ml-4"><li>${result.feedback.suggestions.join("</li><li>")}</li></ul>`
      }
      if (result.score < 3) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
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
    const { data, error } = await httpClient.users.register.post({ email, username, password })
  }
})

const form = superForm(defaults(zod(schema)), {
  SPA: true,
  validators: zodClient(schema),
  clearOnSubmit: "none",
  onUpdate: async ({ form }) => {
    if (form.valid) {
      $registerMutation.mutate(form.data)
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

const { enhance, delayed, form: formData } = form

function acceptEmailSuggestion() {
  if (emailSuggestion) {
    $formData.email = emailSuggestion
    emailSuggestion = null
  }
}
</script>

<div class="flex w-fulll min-h-screen items-center justify-center">
  <div class="card card-border bg-base-100 shadow-sm w-full m-10 md:m-0 md:w-2/3 lg:w-1/3 xl:w-1/4">
    <form class="card-body space-y-3" use:enhance novalidate>
      <h2 class="card-title">Registro</h2>
      <FormField {form} field="email" label="Email" type="email" autocomplete="email webauthn" inputmode="email" required>
        {#if emailSuggestion}
          <div class="text-xs">Você quiz dizer <button type="button" aria-label="Aceitar sugestão" class="underline" onclick={acceptEmailSuggestion}>{emailSuggestion}</button>?</div>
        {/if}
      </FormField>
      <FormField {form} field="username" label="Nome de usuário" type="text" autocomplete="username webauthn" required />
      <FormField {form} field="password" label="Senha" type="password" autocomplete="new-password webauthn" required containerClass={cn(score !== null && "mb-0")}>
        {#if score !== null}
          <progress class="progress w-full" class:progress-error={score < 4} class:progress-warning={score === 4} class:progress-success={score > 4} value={score} max="5"></progress>
        {/if}
      </FormField>
      <FormField {form} field="passwordConfirmation" label="Confirme a senha" type="password" autocomplete="new-password webauthn" required />
      <div class="card-actions">
        <Button type="submit" class="btn-primary btn-block" loading={$delayed}>Registrar</Button>
        <span class="text-sm text-center text-base-content/50 w-full">Já tem uma conta? <a href="/login" class="link">Entrar</a></span>
      </div>
    </form>
  </div>
</div>
