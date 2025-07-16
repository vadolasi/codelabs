<script lang="ts">
import {
	createTree,
	hotkeysCoreFeature,
	renamingFeature,
	selectionFeature,
	syncDataLoaderFeature
} from "@headless-tree/core"
import { LoroList, LoroMap } from "loro-crdt"
import picoMatch from "picomatch"
import { onMount, tick } from "svelte"
import { filesMap, loroDoc, webcontainer } from "../editorState.svelte"
import TreeItem from "./TreeItem.svelte"

let render = $state(0)

const tree = createTree<Item>({
	rootItemId: "/",
	getItemName: (item) => item.getItemData().path?.split("/")?.pop() || "",
	isItemFolder: (item) => item.getItemData().type === "directory",
	canRename: () => true,
	onRename: async (item, newName) => {
		const parentPath = item.getParent()!.getItemData().path
		const newPath = `${parentPath}/${newName}`
		await webcontainer.current.fs.rename(item.getItemData().path, newPath)
	},
	dataLoader: {
		getItem: (itemId) => filesMap.get(itemId).get("data") as Item,
		getChildren: (itemId) =>
			(filesMap.get(itemId)?.get("children") as LoroList<string>).toArray() ||
			[]
	},
	setState: () => {
		tick().then(() => {
			render++
		})
	},
	features: [
		syncDataLoaderFeature,
		selectionFeature,
		renamingFeature,
		hotkeysCoreFeature
	]
})

onMount(() => {
	tree.rebuildTree()

	const isMatch = picoMatch("**/node_modules/**", { dot: true })

	const unsubscribeLoroWatcher = filesMap.subscribe(({ events }) => {
		for (const update of events) {
			if (update.diff.type === "map") {
				for (const value of Object.values(update.diff.updated)) {
				}
			}
		}
		tree.rebuildTree()
	})

	const fileWatcher = webcontainer.current.fs.watch(
		"/",
		{ recursive: true },
		async (event, unformattedFilename) => {
			let processedEvent:
				| "file-add"
				| "file-remove"
				| "dir-add"
				| "dir-remove"
				| "file-change"

			if (typeof unformattedFilename === "string") {
				const filename = `/${unformattedFilename}`

				if (isMatch(filename)) {
				} else {
					let isDir = true
					let exists = true

					try {
						await webcontainer.current.fs.readdir(filename)
					} catch (error) {
						if (error instanceof Error) {
							if (error.message.includes("ENOTDIR")) {
								isDir = false
							} else if (error.message.includes("ENOENT")) {
								exists = false
								if (
									(filesMap.get(filename)?.get("data") as Item).type === "file"
								) {
									isDir = false
								}
							}
						}
					}

					if (event === "rename") {
						if (exists) {
							if (isDir) {
								processedEvent = "dir-add"
							} else {
								processedEvent = "file-add"
							}
						} else {
							if (isDir) {
								processedEvent = "dir-remove"
							} else {
								processedEvent = "file-remove"
							}
						}
					} else {
						if (isDir) {
							processedEvent = "dir-add"
						} else {
							processedEvent = "file-change"
						}
					}

					if (processedEvent === "dir-add" || processedEvent === "file-add") {
						const newMap = new LoroMap<Record<string, Item>>()

						if (processedEvent === "file-add") {
							newMap.set("data", {
								type: "file",
								path: filename,
								content: await webcontainer.current.fs.readFile(
									filename,
									"utf-8"
								)
							})
						} else {
							newMap.set("data", {
								type: "directory",
								path: filename
							})
							newMap.setContainer("children", new LoroList<string>())
						}

						filesMap.setContainer(filename, newMap)

						const parent =
							`/${filename.split("/").slice(0, -1).join("/")}`.replaceAll(
								"//",
								"/"
							)
						const parentItem = filesMap.get(parent)

						if (parentItem !== undefined) {
							;(parentItem.get("children") as LoroList<string>).push(filename)
						} else {
							const newMap = new LoroMap<Record<string, Item | LoroList>>()
							newMap.set("data", {
								type: "directory",
								path: parent
							})
							const children = new LoroList<string>()
							children.push(filename)
							newMap.setContainer("children", children)
							filesMap.setContainer(parent, newMap)
						}
					} else if (
						processedEvent === "file-remove" ||
						processedEvent === "dir-remove"
					) {
						filesMap.delete(filename)
						const parent = `/${filename.split("/").slice(0, -1).join("/")}`
						const parentItem = filesMap.get(parent)

						if (parentItem) {
							const children = parentItem.get("children") as LoroList<string>
							const index = children.toArray().indexOf(filename)
							if (index !== -1) {
								children.delete(index, 1)
							}
						}
					} else if (processedEvent === "file-change") {
						const item = filesMap.get(filename)
						if (item) {
							item.set("data", {
								type: "file",
								path: filename,
								content: await webcontainer.current.fs.readFile(
									filename,
									"utf-8"
								)
							})
						}
					}

					loroDoc.commit()
				}
			}
		}
	)

	return () => {
		unsubscribeLoroWatcher()
		fileWatcher.close()
	}
})
</script>

<div class="h-full p-3 overflow-auto bg-base-100" {...tree.getContainerProps()}>
  {#key render}
    {#each tree.getItems() as item (item.getId())}
      <TreeItem item={item} />
    {/each}
  {/key}
</div>
