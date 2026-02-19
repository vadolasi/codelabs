<script lang="ts">
  import editorState from '../editorState.svelte';

  let item = $derived.by(() => {
    if (!editorState.currentTab) return null;
    return editorState.filesMap.get(editorState.currentTab);
  });

  let data = $derived.by(() => {
    return item?.get('data') as any;
  });

  let imageUrl = $derived.by(() => {
    if (!data) return '';
    if (data.type === 'file' && data.path.endsWith('.svg')) {
      const blob = new Blob([data.content], { type: 'image/svg+xml' });
      return URL.createObjectURL(blob);
    }
    if (data.type === 'binary' && data.mimeType.startsWith('image/')) {
      return `/api/files/${data.hash}`;
    }
    return '';
  });

  $effect(() => {
    return () => {
      if (imageUrl.startsWith('blob:')) {
        URL.revokeObjectURL(imageUrl);
      }
    }
  });
</script>

<div class="w-full h-full flex items-center justify-center bg-base-200 p-8 overflow-auto">
  {#if imageUrl}
    <img src={imageUrl} alt={data.path} class="max-w-full max-h-full object-contain shadow-lg bg-white" />
  {:else}
    <div class="text-base-content/50">Arquivo não é uma imagem suportada</div>
  {/if}
</div>
