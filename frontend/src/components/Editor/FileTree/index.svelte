<script lang="ts">
import {
	asyncDataLoaderFeature,
	createTree,
	selectionFeature,
	hotkeysCoreFeature,
	renamingFeature
} from "@headless-tree/core"
import { onMount, tick } from "svelte"
import editorState, { fileTree, webcontainer } from "../editorState.svelte"
import TreeItem from "./TreeItem.svelte"

let render = $state(0)

const tree = createTree<Item>({
	rootItemId: "/",
	getItemName: (item) => item.getItemData().path?.split("/")?.pop() || "",
	isItemFolder: (item) => item.getItemData().isFolder,
	createLoadingItemData: () => ({
		path: "Loading...",
		isFolder: false
	}),
	canRename: () => true,
	onRename: async (item, newName) => {
		const parentPath = item.getParent()!.getItemData().path
		const newPath = `${parentPath}/${newName}`
		await webcontainer.current.fs.rename(item.getItemData().path, newPath)
	},
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
	features: [
		asyncDataLoaderFeature,
		selectionFeature,
		renamingFeature,
		hotkeysCoreFeature
	]
})

onMount(async () => {
	webcontainer.current.fs.watch("/", { recursive: true }, (event, filename) => {
		if (typeof filename === "string") {
			const item = tree.getItemInstance(
				`/${`/${filename as string}`.split("/").slice(1, -1).join("/")}`
			)
			if (item) {
				item.invalidateChildrenIds()
			}

			editorState.isUpToDate = false

			const segments = filename.split("/")

			let currentNode = {}

			for (const segment of segments) {
				if (segment === "..") {
					continue
				}

				fileTree.createNode().id
			}
		}
	})
})
</script>

<div class="h-full p-3 overflow-auto bg-base-100" {...tree.getContainerProps()}>
  {#key render}
    {#each tree.getItems() as item (item.getId())}
      <TreeItem item={item} />
    {/each}
  {/key}
</div>
