<script lang="ts">
import {
	createTree,
	hotkeysCoreFeature,
	renamingFeature,
	selectionFeature,
	syncDataLoaderFeature
} from "@headless-tree/core"
import { LoroText } from "loro-crdt"
import picoMatch from "picomatch"
import { onMount, tick } from "svelte"
import {
	filenamesMap,
	filesMap,
	loroDoc,
	webcontainer
} from "../editorState.svelte"
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
		getItem: (itemId) => {
			if (itemId === "/") {
				return {
					type: "directory",
					path: "/"
				}
			}

			return filenamesMap.get(itemId)
		},
		getChildren: (itemId) => {
			const matcher = picoMatch(`${itemId}/*`.replace("//", "/"), { dot: true })

			const children: string[] = []

			for (const [path] of filenamesMap.entries()) {
				if (matcher(path)) {
					children.push(path)
				}
			}

			return children
		}
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
	const isMatch = picoMatch("**/node_modules/**", { dot: true })

	const unsubscribeLoroWatcher = filenamesMap.subscribe(() => {
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
								if (filenamesMap.get(filename)?.type === "file") {
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

					if (processedEvent === "dir-add") {
						filenamesMap.set(filename, {
							type: "directory",
							path: filename
						})
					} else if (
						processedEvent === "file-remove" ||
						processedEvent === "dir-remove"
					) {
						filenamesMap.delete(filename)
						filesMap.delete(filename)
					} else if (
						processedEvent === "file-add" ||
						processedEvent === "file-change"
					) {
						const content = await webcontainer.current.fs.readFile(
							filename,
							"utf-8"
						)
						filesMap
							.getOrCreateContainer(filename, new LoroText())
							.update(content)

						if (processedEvent === "file-add") {
							filenamesMap.set(filename, {
								type: "file",
								path: filename
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
