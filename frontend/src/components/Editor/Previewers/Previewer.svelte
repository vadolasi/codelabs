<script lang="ts">
const { iframeUrl }: { iframeUrl: string } = $props()
import { RotateCcw, ExternalLink } from "@lucide/svelte"

let render = $state(0)
</script>

<div class="p-1 flex gap-1">
  <input
    type="text"
    value={iframeUrl}
    class="w-full py-1 px-3 rounded-2xl bg-base-300 text-xs focus:outline-none"
    placeholder="Enter WebContainer URL"
    readonly
    style="font-family: monospace;"
    onfocus={(event) => {
      const input = event.target as HTMLInputElement
      input.select()
      input.setSelectionRange(0, input.value.length)
    }}
  />
  <button
    type="button"
    class="btn btn-ghost btn-square w-8 h-8"
    onclick={() => render++}
  >
    <RotateCcw class="w-4 h-4" />
  </button>
  <a
    href={iframeUrl}
    target="_blank"
    rel="noopener noreferrer"
    class="btn btn-ghost btn-square w-8 h-8"
    aria-label="Open in new tab"
  >
    <ExternalLink class="w-4 h-4" />
  </a>
</div>
{#key render}
  <iframe
    title={`WebContainer - ${iframeUrl}`}
    src={iframeUrl}
    class="w-full h-full"
    sandbox="allow-same-origin allow-scripts allow-modals allow-forms"
  ></iframe>
{/key}
