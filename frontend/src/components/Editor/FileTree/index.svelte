<script lang="ts">
import {
	asyncDataLoaderFeature,
	createTree,
	hotkeysCoreFeature,
	renamingFeature,
	selectionFeature
} from "@headless-tree/core"
import picoMatch from "picomatch"
import { onMount, tick } from "svelte"
import editorState, { loroDoc, webcontainer } from "../editorState.svelte"
import TreeItem from "./TreeItem.svelte"

let render = $state(0)

const tree = createTree<Item>({
	rootItemId: "/",
	getItemName: (item) => item.getItemData().path?.split("/")?.pop() || "",
	isItemFolder: (item) => item.getItemData().isFolder,
	createLoadingItemData: () => ({
		path: "Carregando...",
		isFolder: false,
		isHidden: true
	}),
	canRename: () => true,
	onRename: async (item, newName) => {
		const parentPath = item.getParent()!.getItemData().path
		const newPath = `${parentPath}/${newName}`
		await webcontainer.current.fs.rename(item.getItemData().path, newPath)
	},
	dataLoader: {
		getItem: async (itemId) => {
			loroDoc
			try {
				await webcontainer.current.fs.readdir(itemId)

				return {
					path: itemId,
					isFolder: true,
					isHidden: false
				}
			} catch (e) {
				return {
					path: itemId,
					isFolder: false,
					isHidden: false
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

const isMatch = picoMatch("**/node_modules/**", { dot: true })

const filesnamesMap = loroDoc.getMap("filesnames")

onMount(() => {
	const watcher = webcontainer.current.fs.watch(
		"/",
		{ recursive: true },
		async (event, filename) => {
			if (typeof filename === "string") {
				if (isMatch(`/${filename}`)) {
				} else {
					try {
						await webcontainer.current.fs.readdir(filename)
						filesnamesMap.set(filename, {
							type: "dir"
						})
					} catch (error) {
						if (error instanceof Error && error.message.includes("ENOTDIR")) {
							const content = await webcontainer.current.fs.readFile(
								filename,
								"utf-8"
							)
							loroDoc
								.getText(`/${filename}`.replaceAll("/", "_"))
								.update(content)
							filesnamesMap.set(filename, {
								type: "file"
							})
						}
					}

					if (event === "rename") {
						const parentItem = tree.getItemInstance(
							`/${`/${filename as string}`.split("/").slice(1, -1).join("/")}`
						)
						if (parentItem) {
							parentItem.invalidateChildrenIds()
						}

						editorState.isUpToDate = false

						if (editorState.currentTab) {
							editorState.closeTab(editorState.currentTab)
						}
					}
				}
			}
		}
	)

	return () => watcher.close()
})
</script>

<div class="h-full p-3 overflow-auto bg-base-100" {...tree.getContainerProps()}>
  {#key render}
    {#each tree.getItems() as item (item.getId())}
      <TreeItem item={item} />
    {/each}
  {/key}
</div>
