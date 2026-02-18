<script lang="ts">
  import { onMount } from "svelte"
  import { engine } from "../Editor/editorState.svelte"

  let container: HTMLDivElement

  onMount(() => {
    if (engine.current?.setVisualizerContainer) {
      engine.current.setVisualizerContainer(container)
    }
    return () => {
      if (engine.current?.setVisualizerContainer) {
        engine.current.setVisualizerContainer(null)
      }
    }
  })
</script>

<div class="w-full h-full bg-white flex items-center justify-center overflow-auto p-4 relative border-none outline-none">
  <div bind:this={container} id="turtle-canvas" class="w-full h-full min-h-[400px] min-w-[400px] bg-white"></div>
</div>
