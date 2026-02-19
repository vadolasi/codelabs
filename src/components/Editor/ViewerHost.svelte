<script lang="ts">
  import { X, LayoutGrid, Eye, Code, Info, Save } from "@lucide/svelte";
  import getIcon from "$lib/icons"
  import editorState from "./editorState.svelte";

  const tabNames = $derived(editorState.tabs.map((tab) => tab.getItemName()))
  const duplicateFileNames = $derived(
    tabNames.filter((item, index) => tabNames.indexOf(item) !== index)
  )

  const ActiveViewerComponent = $derived.by(() => {
    return editorState.availableViewers.find(v => v.id === editorState.viewerType)?.component;
  });
</script>

<div class="w-full h-full flex flex-col overflow-hidden">
  {#if editorState.tabs.length > 0}
		<div class="flex w-full bg-base-300 shrink-0 overflow-x-auto border-b border-base-200/60">
			{#each editorState.tabs as tab (tab.getItemData().path)}
        {@const path = tab.getItemData().path}
        {@const name = tab.getItemName()}
		    <div 
          role="button" 
          tabindex="0" 
          class="py-2 px-4 flex gap-2 items-center justify-center hover:bg-base-200 text-sm group select-none border-r border-base-200/60 transition-colors relative" 
          class:bg-base-100={editorState.currentTab === path}
          class:text-primary={editorState.currentTab === path}
          onclick={() => editorState.setCurrentTab(tab)}
        >
          <img src={getIcon(name, "file")} alt="file icon" class="w-4 h-4 shrink-0" />
          <span class="text-nowrap">{name}</span>
          {#if editorState.unsavedPaths.has(path)}
            <div class="w-2 h-2 rounded-full bg-primary animate-pulse ml-1"></div>
          {/if}
          {#if duplicateFileNames.includes(name)}
            <span class="text-xs opacity-50">
              /{path.split("/").slice(-2, -1)}
            </span>
          {/if}
          <button
            type="button"
            aria-label="Close tab"
            class="p-0.5 rounded-sm hover:bg-base-300 opacity-0 group-hover:opacity-100 transition-opacity"
            class:opacity-100={editorState.currentTab === path}
            onclick={(event) => {
              event.stopPropagation();
              editorState.closeTab(path);
            }}
          >
            <X class="w-3.5 h-3.5" />
          </button>
        </div>
      {/each}
    </div>
  {/if}

  <div class="flex-1 overflow-hidden relative flex flex-col">
    <div class="flex-1 overflow-hidden relative">
      {#if ActiveViewerComponent}
        <ActiveViewerComponent />
      {:else if editorState.currentTab === null}
        <div class="w-full h-full flex flex-col items-center justify-center bg-base-300 select-none text-base-content/30 gap-4">
          <img src="/codelabs.svg" alt="Codelabs" class="w-24 h-24 opacity-10" />
          <span class="text-lg">Nenhum arquivo aberto</span>
        </div>
      {/if}
    </div>
  </div>
</div>
