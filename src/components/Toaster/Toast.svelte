<script lang="ts">
import { normalizeProps, useMachine } from "@zag-js/svelte"
import * as Toast from "@zag-js/toast"

interface ToastProps {
  toast: Toast.Options
  index: number
  parent: Toast.GroupService
}

const { toast, index, parent }: ToastProps = $props()

const machineProps = $derived({ ...toast, parent, index })
const service = useMachine(Toast.machine, () => machineProps)

const api = $derived(Toast.connect(service, normalizeProps))
</script>

<div {...api.getRootProps()}>
  <div role="alert" class="alert alert-vertical sm:alert-horizontal" class:alert-info={toast.type === "info"} class:alert-success={toast.type === "success"} class:alert-error={toast.type === "error"}>
    {#if toast.type === "info"}
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" class="stroke-current h-6 w-6 shrink-0">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
    </svg>
    {:else if toast.type === "success"}
    <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6 shrink-0 stroke-current" fill="none" viewBox="0 0 24 24">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
    {:else if toast.type === "error"}
    <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6 shrink-0 stroke-current" fill="none" viewBox="0 0 24 24">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
    {/if}
    <div>
      <h3 {...api.getTitleProps()} class="font-bold">{api.title}</h3>
      <div {...api.getDescriptionProps()} class="text-xs">{api.description}</div>
    </div>
    <button onclick={api.dismiss} class="btn btn-sm">Fechar</button>
  </div>
</div>
