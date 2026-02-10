<script lang="ts">
import getIcon from "$lib/icons"
import type { ItemInstance } from "@headless-tree/core"
import * as menu from "@zag-js/menu"
import { normalizeProps, useMachine } from "@zag-js/svelte"
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

const contextMenuId = crypto.randomUUID()

const contextMenuService = useMachine(menu.machine, {
	id: contextMenuId,
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
const renameProps = $derived.by(() => item.getRenameInputProps())
</script>

<button
  {...itemProps.rest}
  {...contextMenuApi.getContextTriggerProps()}
  use:registerItem
  style:padding-left={`${item.getItemMeta().level * 10}px`}
  class="w-full cursor-pointer hover:text-primary flex items-center gap-1 text-sm text-ellipsis select-none"
  onclick={itemProps.onClick}
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
