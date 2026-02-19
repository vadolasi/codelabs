<script lang="ts">
  import { Download, FileWarning } from "@lucide/svelte";
  import editorState from '../editorState.svelte';

  let item = $derived.by(() => {
    if (!editorState.currentTab) return null;
    return editorState.filesMap.get(editorState.currentTab);
  });

  let data = $derived.by(() => {
    return item?.get('data') as any;
  });

  function formatSize(bytes: number) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / k ** i).toFixed(2)) + ' ' + sizes[i];
  }
</script>

<div class="w-full h-full flex flex-col items-center justify-center bg-base-300 p-8 gap-6 text-center">
  <FileWarning class="w-16 h-16 text-base-content/30" />
  
  <div class="flex flex-col gap-2">
    <h3 class="text-xl font-bold">{data?.path?.split('/').pop()}</h3>
    <p class="text-base-content/60">
      Este arquivo é binário e não pode ser exibido diretamente no editor.
    </p>
    {#if data}
      <div class="badge badge-outline gap-2 p-4">
        <span>{data.mimeType}</span>
        <span class="opacity-30">|</span>
        <span>{formatSize(data.size)}</span>
      </div>
    {/if}
  </div>

  <a 
    href={`/api/files/${data?.hash}`} 
    download={data?.path?.split('/').pop()}
    class="btn btn-primary gap-2"
  >
    <Download class="w-4 h-4" />
    Baixar Arquivo
  </a>
</div>
