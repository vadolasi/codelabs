<script lang="ts">
import { goto } from "$app/navigation"
import { page } from "$app/state"
import httpClient from "$lib/httpClient"
import { createMutation } from "@tanstack/svelte-query"
import * as pinInput from "@zag-js/pin-input"
import { normalizeProps, useMachine } from "@zag-js/svelte"
import { onMount } from "svelte"
import Button from "../../../components/Button.svelte"

const { email } = page.state as { email: string }

onMount(() => {
	if (!email) {
		goto("/login")
	}
})

const verifyEmailMutation = createMutation({
	mutationFn: async (code: string) => {
		const { data, error } = await httpClient.users["verify-user"].post({
			email,
			code
		})

		if (error) {
			throw new Error(error.value.message ?? "Erro ao registrar usuário", {
				cause: error.value
			})
		}

		return data
	},
	onSuccess: () => {
		goto("/login")
	}
})

const service = useMachine(pinInput.machine, {
	id: "pin_code",
	type: "numeric",
	autoFocus: true,
	blurOnComplete: true,
	otp: true,
	onValueComplete: ({ valueAsString }) => {
		$verifyEmailMutation.mutateAsync(valueAsString)
	}
})
const api = $derived(pinInput.connect(service, normalizeProps))
</script>

<div class="flex w-fulll min-h-screen items-center justify-center">
  <div class="card card-border card-lg bg-base-100 shadow-sm w-full m-10 md:m-0 md:w-2/3 lg:w-1/3 xl:w-1/4">
    <div class="card-body space-y-3">
      <h2 class="card-title">Informe o código de verificação</h2>
      <div {...api.getRootProps()} class="flex gap-2">
        {#each Array.from({ length: 6 }, (_, i) => i) as index (index)}
          <input {...api.getInputProps({ index })} class="input input-lg w-1/6" type="number" />
        {/each}
      </div>
      <div class="card-actions">
        <Button class="btn-primary btn-block btn-lg" loading={$verifyEmailMutation.isPending}>Continuar</Button>
        <Button class="btn-ghost btn-block btn-lg" disabled={$verifyEmailMutation.isPending}>Reenviar código</Button>
      </div>
    </div>
  </div>
</div>
