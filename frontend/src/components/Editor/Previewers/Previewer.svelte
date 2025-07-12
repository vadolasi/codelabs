<script lang="ts">
const { iframeUrl }: { iframeUrl: string } = $props()
</script>

<div>
  <input
    type="text"
    value={iframeUrl}
    class="w-full p-2 border border-gray-300 rounded mb-2"
    placeholder="Enter WebContainer URL"
    readonly
    style="font-family: monospace;"
  />
</div>
<iframe
  title={`WebContainer - ${iframeUrl}`}
  src={iframeUrl}
  class="w-full h-full"
  sandbox="allow-same-origin allow-scripts allow-modals allow-forms"
></iframe>

