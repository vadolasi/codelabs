<script lang="ts">
import { onMount } from "svelte"
import type { WebContainer } from "@webcontainer/api"
import { Pane, Splitpanes } from "svelte-splitpanes"
import Editor from "./Editor.svelte"
import FileTree from "./FileTree.svelte"
import Terminal from "./Terminal.svelte"
import { webcontainer } from "./editorState.svelte"

const { webcontainer: loadedWebContainer }: { webcontainer: WebContainer } =
	$props()
webcontainer.current = loadedWebContainer

let iframeUrl: string | null = $state(null)

onMount(() => {
  webcontainer.current.on("server-ready", async (_port, url) => {
    iframeUrl = url
  })
})
</script>

<div class="h-screen w-screen">
  <Splitpanes class="w-full h-full">
    <Pane maxSize={70} size={20}>
      <FileTree />
    </Pane>
    <Pane>
      <Splitpanes horizontal={true}>
        <Pane>
          <Editor />
        </Pane>
        <Pane>
          <Terminal />
        </Pane>
      </Splitpanes>
    </Pane>
    {#if iframeUrl !== null}
      <Pane size={20}>
        <iframe
          title={`WebContainer - ${iframeUrl}`}
          src={iframeUrl}
          class="w-full h-full"
          sandbox="allow-same-origin allow-scripts allow-modals allow-forms"
        ></iframe>
      </Pane>
    {/if}
  </Splitpanes>
</div>
