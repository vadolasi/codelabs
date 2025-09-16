<script lang="ts">
import { goto } from "$app/navigation"
import httpClient from "$lib/httpClient"
import { createForm } from "@tanstack/svelte-form"
import { createMutation } from "@tanstack/svelte-query"
import Button from "../../components/Button.svelte"
import toaster from "../../components/Toaster/store"

const resetPasswordMutation = createMutation({
	mutationFn: async (email: string) => {
		const { data, error } = await httpClient.users["reset-password"].post({
			email
		})

		if (error) {
			throw new Error(error.value.message ?? "Erro ao enviar e-mail", {
				cause: error.value
			})
		}

		return data
	},
	onSuccess: () => {
		toaster.create({
			title: "E-mail enviado",
			description: "Verifique sua caixa de entrada para redefinir sua senha.",
			type: "success"
		})
		goto("/login")
	}
})

const form = createForm(() => ({
	defaultValues: {
		email: ""
	},
	onSubmit: async ({ value }) => {
		$resetPasswordMutation.mutate(value.email)
	}
}))
</script>

<div class="flex w-fulll min-h-screen items-center justify-center">
  <div class="card card-border bg-base-300 shadow-sm w-full m-10 md:m-0 md:w-2/3 lg:w-1/3 xl:w-1/4">
    <form
      class="card-body space-y-3"
      onsubmit={(e) => {
        e.preventDefault()
        e.stopPropagation()
        form.handleSubmit()
      }
    }>
      <h2 class="card-title">Informe o seu e-mail</h2>

      <form.Field name="email">
        {#snippet children(field)}
          <input
            class="input w-full"
            type="email"
            autocomplete="email"
            required
            name={field.name}
            value={field.state.value}
            onblur={field.handleBlur}
            oninput={(e) => field.handleChange(e.currentTarget.value)}
          />
        {/snippet}
      </form.Field>
 
      <div class="card-actions">
        <Button class="btn-primary btn-block" type="submit" loading={$resetPasswordMutation.isPending}>Continuar</Button>
      </div>
    </form>
  </div>
</div>
