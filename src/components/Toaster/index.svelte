<script lang="ts">
import { normalizeProps, useMachine } from "@zag-js/svelte"
import * as toast from "@zag-js/toast"
import toaster from "./store"
import Toast from "./Toast.svelte"

const id = $props.id()
const service = useMachine(toast.group.machine, {
  id,
  store: toaster
})

const api = $derived(toast.group.connect(service, normalizeProps))
</script>

<div {...api.getGroupProps()}>
  {#each api.getToasts() as toast, index (toast.id)}
  <Toast toast={toast} index={index} parent={service} />
  {/each}
</div>
