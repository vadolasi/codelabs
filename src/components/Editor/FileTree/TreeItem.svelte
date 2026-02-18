<script lang="ts">
import type { ItemInstance } from "@headless-tree/core"
import * as menu from "@zag-js/menu"
import { normalizeProps, useMachine } from "@zag-js/svelte"
import { LoroList, LoroMap } from "loro-crdt"
import getIcon from "$lib/icons"
import editorState, { engine } from "../editorState.svelte"

const { item }: { item: ItemInstance<Item> } = $props()

const itemName = $derived.by(() => item.getItemName())
const itemData = $derived.by(() => item.getItemData())

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

function ensureDirectory(path: string) {
  const existing = editorState.filesMap.get(path)
  if (!existing) {
    const dirMap = new LoroMap<Record<string, Item | LoroList>>()
    dirMap.set("data", { type: "directory", path })
    dirMap.setContainer("children", new LoroList<string>())
    editorState.filesMap.setContainer(path, dirMap)
    return dirMap
  }

  const children = existing.get("children")
  if (!(children instanceof LoroList)) {
    existing.setContainer("children", new LoroList<string>())
  }

  return existing
}

function addChildToParent(parentPath: string, childPath: string) {
  const parent = ensureDirectory(parentPath)
  const children = parent.get("children") as LoroList<string>
  const list = children.toArray()
  if (!list.includes(childPath)) {
    children.push(childPath)
  }
}

const contextMenuId = crypto.randomUUID()

const contextMenuService = useMachine(menu.machine, {
  id: contextMenuId,
  onSelect: (event) => {
    if (!engine.current) return
    const data = item.getItemData()
    const parentPath = data.type === "directory" ? data.path : (item.getParent()?.getItemData().path || "/")

    switch (event.value) {
      case "rename":
        item.startRenaming()
        break
      case "new-file": {
        const name = prompt("Nome do arquivo:")
        if (!name) return
        const path = `${parentPath === "/" ? "" : parentPath}/${name}`
        if (editorState.filesMap.get(path)) return alert("Arquivo já existe")
        
        const fileMap = new LoroMap<Record<string, Item>>()
        fileMap.set("data", { type: "file", path, content: "" })
        editorState.filesMap.setContainer(path, fileMap)
        addChildToParent(parentPath, path)
        editorState.loroDoc.commit()
        break
      }
      case "new-folder": {
        const name = prompt("Nome da pasta:")
        if (!name) return
        const path = `${parentPath === "/" ? "" : parentPath}/${name}`
        if (editorState.filesMap.get(path)) return alert("Pasta já existe")
        
        ensureDirectory(path)
        addChildToParent(parentPath, path)
        editorState.loroDoc.commit()
        break
      }
    }
  }
})
const contextMenuApi = $derived(
  menu.connect(contextMenuService, normalizeProps)
)
const renameProps = $derived.by(() => item.getRenameInputProps())
</script>

<button
  type="button"
  {...itemProps.rest}
  {...contextMenuApi.getContextTriggerProps()}
  use:registerItem
  style:padding-left={`${item.getItemMeta().level * 10}px`}
  class="w-full cursor-pointer hover:text-primary flex items-center gap-1 text-sm text-ellipsis select-none"
  onclick={itemProps.onClick}
  onkeydown={(e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      itemProps.onClick(e as any);
    }
  }}
>
  <img
    src={
      getIcon(
        itemName,
        itemData.type === "directory" ? item.isExpanded() ? "folder-open" : "folder-closed" : "file"
      )
    }
    alt="file icon"
    class="w-4 h-4"
  />
  {#if item.isRenaming()}
    <!-- svelte-ignore a11y_autofocus -->
    <input onblur={renameProps.onBlur} onchange={renameProps.onChange} value={renameProps.value} autofocus class="border rounded" />
  {:else}
    <span>{itemName}</span>
  {/if}
  {#if item.isLoading()}
    <span>Loading...</span>
  {/if}
</button>
<div {...contextMenuApi.getPositionerProps()} class="bg-secondary rounded overflow-hidden">
  <ul {...contextMenuApi.getContentProps()} class="bg-base-200 shadow-xl border border-base-content/10 py-1 min-w-[160px]">
    <li {...contextMenuApi.getItemProps({ value: "new-file" })} class="cursor-pointer py-1.5 px-4 hover:bg-primary hover:text-primary-content text-sm">Novo Arquivo</li>
    <li {...contextMenuApi.getItemProps({ value: "new-folder" })} class="cursor-pointer py-1.5 px-4 hover:bg-primary hover:text-primary-content text-sm border-b border-base-content/5">Nova Pasta</li>
    <li {...contextMenuApi.getItemProps({ value: "rename" })} class="cursor-pointer py-1.5 px-4 hover:bg-primary hover:text-primary-content text-sm">Renomear</li>
    <li {...contextMenuApi.getItemProps({ value: "duplicate" })} class="cursor-pointer py-1.5 px-4 hover:bg-primary hover:text-primary-content text-sm">Duplicar</li>
    <li {...contextMenuApi.getItemProps({ value: "delete" })} class="cursor-pointer py-1.5 px-4 hover:bg-primary hover:text-primary-content text-sm text-error hover:text-error-content">Excluir</li>
  </ul>
</div>
