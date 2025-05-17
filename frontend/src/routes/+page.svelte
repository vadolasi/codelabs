<script lang="ts">
import { WebContainer } from "@webcontainer/api"
import { onMount } from "svelte"
import Editor from "../components/Editor/index.svelte"

let webcontainer: WebContainer | null = $state(null)

onMount(async () => {
	webcontainer = await WebContainer.boot({ workdirName: "codelabs" })
})
</script>

{#if webcontainer}
  <Editor webcontainer={webcontainer} />
{:else}
  <div class="flex flex-col items-center justify-center h-screen gap-4">
    <div class="radial-progress animate-spin" style:--value={70} aria-valuenow="70" role="progressbar"></div>
    <span class="text-2xl text-base-content/50 text-center">Carregando ambiente de<br />desenvolvimento</span>
  </div>
{/if}
