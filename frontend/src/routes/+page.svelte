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
  <h1>Loading WebContainer...</h1>
{/if}
