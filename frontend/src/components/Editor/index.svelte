<script lang="ts">
import type { WebContainer } from "@webcontainer/api"
import { Pane, Splitpanes } from "svelte-splitpanes"
import Editor from "./Editor.svelte"
import FileTree from "./FileTree.svelte"
import Terminal from "./Terminal.svelte"
import { webcontainer } from "./editorState.svelte"

const { webcontainer: loadedWebContainer }: { webcontainer: WebContainer } =
	$props()
webcontainer.current = loadedWebContainer
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
  </Splitpanes>
</div>
