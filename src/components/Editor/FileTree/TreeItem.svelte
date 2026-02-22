<script lang="ts">
import type { ItemInstance } from "@headless-tree/core"
import * as menu from "@zag-js/menu"
import { normalizeProps, useMachine } from "@zag-js/svelte"
import { LoroList, LoroMap } from "loro-crdt"
import getIcon from "$lib/icons"
import editorState, { engine } from "../editorState.svelte"

const { item, tree, treeState }: { item: ItemInstance<Item>, tree: any, treeState: any } = $props()

const itemName = $derived.by(() => item.getItemName())
const itemData = $derived.by(() => item.getItemData())
// Agora acessamos treeState diretamente. Quando treeState.expandedItems mudar,
// o Svelte 5 disparará o recálculo deste rune automaticamente.
const isExpanded = $derived(treeState.expandedItems.includes(item.getId()))

const iconSrc = $derived.by(() => {
  if (itemData.type !== "directory") {
    return getIcon(itemName, "file")
  }
  return getIcon(itemName, isExpanded ? "folder-open" : "folder-closed")
})

const itemProps = $derived.by(() => {
  const { onClick, ...rest } = item.getProps()
  return { onClick, rest }
})

function registerItem(node: HTMLElement) {
  item.registerElement(node)
  return {
    destroy() {
      item.registerElement(null)
    }
  }
}

const contextMenuId = crypto.randomUUID()

const contextMenuService = useMachine(menu.machine, {
  id: contextMenuId,
  onSelect: (event) => {
    const data = item.getItemData()
    const parentPath = data.type === "directory" ? item.getId() : (item.getParent()?.getId() || "/")

    // Removed setTimeout - it was not fixing the issue and added unnecessary complexity.
    switch (event.value) {
      case "rename":
        item.startRenaming()
        break
      case "new-file": {
        editorState.creatingItem = { parentPath, type: 'file' }
        if (data.type === 'directory') {
          item.expand()
        } else {
          item.getParent()?.expand()
        }
        tree.rebuildTree()
        break
      }
      case "new-folder": {
        editorState.creatingItem = { parentPath, type: 'folder' }
        if (data.type === 'directory') {
          item.expand()
        } else {
          item.getParent()?.expand()
        }
        tree.rebuildTree()
        break
      }
      case "duplicate": {
        editorState.duplicateItem(data.path)
        break
      }
      case "download": {
        editorState.downloadItem(data.path)
        break
      }
      case "delete": {
        if (confirm(`Excluir ${itemName}?`)) {
          editorState.deleteItem(data.path)
        }
        break
      }
      default: {
        if (event.value.startsWith('open-with:')) {
          const viewerId = event.value.split(':')[1]
          editorState.preferredViewers.set(data.path, viewerId)
          editorState.setCurrentTab(item)
        }
      }
    }
  }
})
const contextMenuApi = $derived(
  menu.connect(contextMenuService, normalizeProps)
)
const contextTriggerProps = $derived(contextMenuApi.getContextTriggerProps())

const openWithViewers = $derived.by(() => {
  const path = itemData.path.toLowerCase()
  const viewers: { id: string, label: string }[] = []
  
  if (itemData.type === 'file') {
    if (path.endsWith('.md')) viewers.push({ id: 'markdown', label: 'Markdown' })
    if (path.endsWith('.svg')) viewers.push({ id: 'image', label: 'Imagem' })
    viewers.push({ id: 'code', label: 'Editor de Código' })
  } else if (itemData.type === 'binary') {
    if (itemData.mimeType.startsWith('image/')) viewers.push({ id: 'image', label: 'Imagem' })
    viewers.push({ id: 'binary', label: 'Informações' })
  }
  return viewers
})

const renameProps = $derived.by(() => item.getRenameInputProps())

let hoverTimer: Timer | null = null

function handleDragEnter(e: DragEvent) {
  if (itemData.type === 'directory') {
    e.stopPropagation()
    editorState.dragOverPath = itemData.path
    if (!item.isExpanded()) {
      hoverTimer = setTimeout(() => {
        item.expand()
      }, 500)
    }
  }
}

function handleDragLeave() {
  if (hoverTimer) {
    clearTimeout(hoverTimer)
    hoverTimer = null
  }
}
</script>

<button
  type="button"
  {...itemProps.rest}
  {...contextTriggerProps}
  oncontextmenu={(e) => {
    contextTriggerProps.oncontextmenu(e); 
    e.stopPropagation();
  }}
  use:registerItem
  style:padding-left={`${item.getItemMeta().level * 10}px`}
  class="w-full cursor-pointer hover:text-primary flex items-center gap-1 text-sm text-ellipsis select-none transition-colors duration-150 {editorState.dragOverPath === itemData.path ? 'bg-primary/10 text-primary' : ''}"
  onclick={itemProps.onClick}
  onkeydown={(e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      itemProps.onClick(e as any);
    }
  }}
  ondragenter={handleDragEnter}
  ondragleave={handleDragLeave}
>
  <img
    src={iconSrc}
    alt="file icon"
    class="w-4 h-4 shrink-0"
  />
  {#if item.isRenaming()}
    <!-- svelte-ignore a11y_autofocus -->
    <input 
      onblur={renameProps.onBlur} 
      onkeydown={(e) => {
        if (e.key === 'Escape') {
          renameProps.onBlur()
        }
        if (e.key === 'Enter') {
          renameProps.onBlur()
        }
      }}
      onchange={renameProps.onChange} 
      value={renameProps.value} 
      autofocus 
      class="border border-primary bg-base-100 rounded px-1 w-full outline-none" 
    />
  {:else}
    <span class="truncate">{itemName}</span>
  {/if}
  {#if item.isLoading()}
    <span>Loading...</span>
  {/if}
</button>
<div {...contextMenuApi.getPositionerProps()} class="z-50">
  <ul {...contextMenuApi.getContentProps()} class="bg-base-200 shadow-xl border border-base-content/10 py-1 min-w-[160px] rounded overflow-hidden">
    {#if itemData.type === 'directory'}
      <li {...contextMenuApi.getItemProps({ value: "new-file" })} class="cursor-pointer py-1.5 px-4 hover:bg-primary hover:text-primary-content text-sm">Novo Arquivo</li>
      <li {...contextMenuApi.getItemProps({ value: "new-folder" })} class="cursor-pointer py-1.5 px-4 hover:bg-primary hover:text-primary-content text-sm border-b border-base-content/5 mb-1">Nova Pasta</li>
    {/if}
    {#if openWithViewers.length > 1}
      <li class="cursor-default py-1.5 px-4 text-xs font-bold opacity-50 uppercase tracking-tight">Abrir com</li>
      {#each openWithViewers as viewer}
        <li {...contextMenuApi.getItemProps({ value: `open-with:${viewer.id}` })} class="cursor-pointer py-1.5 px-4 hover:bg-primary hover:text-primary-content text-sm">
          {viewer.label}
        </li>
      {/each}
      <div class="border-t border-base-content/5 my-1"></div>
    {/if}
    <li {...contextMenuApi.getItemProps({ value: "rename" })} class="cursor-pointer py-1.5 px-4 hover:bg-primary hover:text-primary-content text-sm">Renomear</li>
    <li {...contextMenuApi.getItemProps({ value: "duplicate" })} class="cursor-pointer py-1.5 px-4 hover:bg-primary hover:text-primary-content text-sm">Duplicar</li>
    <li {...contextMenuApi.getItemProps({ value: "download" })} class="cursor-pointer py-1.5 px-4 hover:bg-primary hover:text-primary-content text-sm">
      {itemData.type === 'directory' ? 'Baixar como ZIP' : 'Baixar'}
    </li>
    <div class="border-t border-base-content/5 my-1"></div>
    <li {...contextMenuApi.getItemProps({ value: "delete" })} class="cursor-pointer py-1.5 px-4 hover:bg-primary hover:text-primary-content text-sm text-error hover:text-error-content">Excluir</li>
  </ul>
</div>
