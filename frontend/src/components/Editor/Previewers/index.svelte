<script lang="ts">
import editorState from "../editorState.svelte"
import Previewer from "./Previewer.svelte"
</script>

{#each editorState.previewers as { port, url }}
  <Previewer iframeUrl={url} />
{/each}
