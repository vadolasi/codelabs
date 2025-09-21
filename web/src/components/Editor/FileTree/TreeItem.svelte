<script lang="ts">
import getIcon from "$lib/icons"
import type { ItemInstance } from "@headless-tree/core"
import * as menu from "@zag-js/menu"
import { normalizeProps, useMachine } from "@zag-js/svelte"
import editorState from "../editorState.svelte"

const { item }: { item: ItemInstance<Item> } = $props()

const itemId = item.getId()
const itemName = item.getItemName()
const itemData = item.getItemData()

function handleFolderClick(item: ItemInstance<Item>) {
	if (item.isExpanded()) {
		item.collapse()
	} else {
		item.expand()
	}
}

const contextMenuService = useMachine(menu.machine, {
	id: `context-menu-${itemId}`,
	onSelect: (event) => {
		switch (event.value) {
			case "rename":
				item.startRenaming()
				break
		}
	}
})
const contextMenuApi = $derived(
	menu.connect(contextMenuService, normalizeProps)
)
const renameProps = item.getRenameInputProps()
</script>

<button
  {...item.getProps()}
  {...contextMenuApi.getContextTriggerProps()}
  style:padding-left={`${item.getItemMeta().level * 10}px`}
  class="w-full cursor-pointer hover:text-primary flex items-center gap-1 text-sm text-ellipsis select-none"
  onclick={itemData.type === "directory" ? () => handleFolderClick(item) : () => editorState.setCurrentTab(item)}
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
  <ul {...contextMenuApi.getContentProps()}>
    <li {...contextMenuApi.getItemProps({ value: "rename" })} class="cursor-pointer py-2 px-4 hover:bg-base-200 text-sm">Renomear</li>
    <li {...contextMenuApi.getItemProps({ value: "duplicate" })} class="cursor-pointer py-2 px-4 hover:bg-base-200 text-sm">Duplicate</li>
    <li {...contextMenuApi.getItemProps({ value: "delete" })} class="cursor-pointer py-2 px-4 hover:bg-base-200 text-sm">Delete</li>
    <li {...contextMenuApi.getItemProps({ value: "export" })} class="cursor-pointer py-2 px-4 hover:bg-base-200 text-sm">Export...</li>
  </ul>
</div>
