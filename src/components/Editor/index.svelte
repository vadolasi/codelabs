<script lang="ts">
import type { WebContainer } from "@webcontainer/api"
import { onMount } from "svelte"
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

<div class="h-screen w-screen flex flex-col">
  <div class="w-full bg-base-200 p-2">
    <h1>dfsdf</h1>
  </div>
  <Splitpanes theme="modern-theme" class="w-full h-full flex-1">
    <Pane maxSize={70} size={20}>
      <FileTree />
    </Pane>
    <Pane>
      <Splitpanes theme="modern-theme" horizontal={true}>
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
