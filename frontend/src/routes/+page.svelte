<script lang="ts">
  import { onMount } from "svelte"
  import { WebContainer } from "@webcontainer/api"
  import Editor from "../components/Editor.svelte";

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
