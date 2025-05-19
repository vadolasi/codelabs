<script lang="ts">
import getIcon from "$lib/icons"
import {
	type ItemInstance,
	asyncDataLoaderFeature,
	createTree,
	selectionFeature
} from "@headless-tree/core"
import { onMount, tick } from "svelte"
import editorState, { webcontainer } from "./editorState.svelte"

type Item = {
	isFolder: boolean
	path: string
}

let render = $state(0)

const tree = createTree<Item>({
	rootItemId: "/",
	getItemName: (item) => item.getItemData().path?.split("/")?.pop() || "",
	isItemFolder: (item) => item.getItemData().isFolder,
	createLoadingItemData: () => ({
		path: "Loading...",
		isFolder: false
	}),
	dataLoader: {
		getItem: async (itemId) => {
			try {
				await webcontainer.current.fs.readdir(itemId)

				return {
					path: itemId,
					isFolder: true
				}
			} catch (e) {
				return {
					path: itemId,
					isFolder: false
				}
			}
		},
		getChildren: async (itemId) => {
			const children = await webcontainer.current.fs.readdir(itemId)
			return children.map((child) => `${itemId}/${child}`.replace("//", "/"))
		}
	},
	setState: () => {
		tick().then(() => {
			render++
		})
	},
	features: [asyncDataLoaderFeature, selectionFeature]
})

onMount(async () => {
	webcontainer.current.fs.watch("/", { recursive: true }, (_, filename) => {
		const item = tree.getItemInstance(
			`/${`/${filename as string}`.split("/").slice(1, -1).join("/")}`
		)
		if (item) {
			item.invalidateChildrenIds()
		}
	})
})

function handleFolderClick(item: ItemInstance<Item>) {
	if (item.isExpanded()) {
		item.collapse()
	} else {
		item.expand()
	}
}
</script>

<div class="h-full p-3 overflow-auto bg-base-100" {...tree.getContainerProps()}>
  {#key render}
    {#each tree.getItems() as item (item.getId())}
      <button
        {...item.getProps()}
        style:padding-left={`${item.getItemMeta().level * 10}px`}
        class="w-full cursor-pointer hover:text-primary flex items-center gap-1 text-sm text-ellipsis select-none"
        onclick={item.getItemData().isFolder ? () => handleFolderClick(item) : () => editorState.setCurrentTab(item)}
      >
        <img
          src={
            getIcon(
              item.getItemName(),
              item.getItemData().isFolder ? item.isExpanded() ? "folder-open" : "folder-closed" : "file"
            )
          }
          alt="file icon"
          class="w-4 h-4"
        />
        {item.getItemName()}
        {#if item.isLoading()}
          <span>Loading...</span>
        {/if}
      </button>
    {/each}
  {/key}
</div>
