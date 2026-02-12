<script lang="ts">
import { createMutation } from "@tanstack/svelte-query"
import * as pinInput from "@zag-js/pin-input"
import { normalizeProps, useMachine } from "@zag-js/svelte"
import { onMount } from "svelte"
import { goto } from "$app/navigation"
import { page } from "$app/state"
import httpClient from "$lib/httpClient"
import Button from "../../../components/Button.svelte"
import toaster from "../../../components/Toaster/store"

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
    toaster.success({
      title: "E-mail verificado com sucesso"
    })
    goto("/login")
  },
  onError: (error) => {
    toaster.error({
      title: "Erro ao verificar e-mail",
      description: error.message
    })
  }
})

const resendCodeMutation = createMutation({
  mutationFn: async () => {
    const { error } = await httpClient.users["resend-verification"].post({
      email
    })

    if (error) {
      throw new Error(error.value.message ?? "Erro ao reenviar código", {
        cause: error.value
      })
    }
  },
  onSuccess: () => {
    toaster.success({
      title: "Código reenviado"
    })
  },
  onError: (error) => {
    toaster.error({
      title: "Erro ao reenviar código",
      description: error.message
    })
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

<div class="flex w-full min-h-screen items-center justify-center">
  <div class="card card-border bg-base-300 shadow-sm w-full m-10 md:m-0 md:w-2/3 lg:w-1/3 xl:w-1/4">
    <div class="card-body space-y-3">
      <h2 class="card-title">Informe o código de verificação</h2>
      <div {...api.getRootProps()} class="flex gap-2">
        {#each Array.from({ length: 6 }, (_, i) => i) as index (index)}
          <input {...api.getInputProps({ index })} class="input input-lg w-1/6" type="number" />
        {/each}
      </div>
      <div class="card-actions">
        <Button class="btn-primary btn-block" loading={$verifyEmailMutation.isPending}>Continuar</Button>
        <Button
          class="btn-ghost btn-block"
          disabled={$verifyEmailMutation.isPending || $resendCodeMutation.isPending}
          onclick={() => $resendCodeMutation.mutate()}
        >
          Reenviar código
        </Button>
      </div>
    </div>
  </div>
</div>
