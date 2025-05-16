<script lang="ts">
import {
	type ItemInstance,
	type TreeState,
	asyncDataLoaderFeature,
	createTree,
	selectionFeature
} from "@headless-tree/core"
import { generateManifest } from "material-icon-theme"
import { onMount, tick } from "svelte"
import editorState, { webcontainer } from "./editorState.svelte"

const icons: Record<string, { default: string }> = import.meta.glob(
	"../../../../node_modules/material-icon-theme/icons/*.svg",
	{
		eager: true,
		query: {
			enhanced: true
		}
	}
)

const manifest = generateManifest()

function getExtensions(filename: string): string[] {
	const parts = filename.split(".")
	if (parts.length < 2) return []

	const exts: string[] = []
	for (let i = 1; i < parts.length; i++) {
		exts.push(parts.slice(i).join("."))
	}

	return exts
}

function getIcon(
	filename: string,
	type: "file" | "folder-open" | "folder-closed"
) {
	let icon: string | undefined

	if (type === "file") {
		icon = manifest.fileNames?.[filename]

		if (icon === undefined) {
			for (const ext of getExtensions(filename)) {
				icon = manifest.fileExtensions?.[ext]
				if (icon) break
			}
		}

		return icons[
			`../../../../node_modules/material-icon-theme/icons/${icon ?? "file"}.svg`
		].default
	}

	icon = manifest.folderNames?.[filename] ?? "folder"

	return icons[
		`../../../../node_modules/material-icon-theme/icons/${icon}${type === "folder-open" ? "-open" : ""}.svg`
	].default
}

function sortByFolderThenName(
	a: ItemInstance<Item>,
	b: ItemInstance<Item>
): number {
	const aData = a.getItemData()
	const bData = b.getItemData()

	if (aData.isFolder !== bData.isFolder) {
    return aData.isFolder ? -1 : 1;
  }

	return aData.path.localeCompare(bData.path, undefined, {
		sensitivity: "base"
	})
}

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
		tree
			.getItemInstance(
				`/${`/${filename as string}`.split("/").slice(1, -1).join("/")}`
			)
			.invalidateChildrenIds()
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

<div class="h-full bg-slate-900" {...tree.getContainerProps()}>
  {#key render}
    {#each tree.getItems().sort(sortByFolderThenName) as item (item.getId())}
      <div
        {...item.getProps()}
        style:padding-left={`${item.getItemMeta().level * 10}px`}
        class="w-full cursor-pointer text-gray-400 hover:text-white"
        onclick={item.getItemData().isFolder ? () => handleFolderClick(item) : () => editorState.setCurrentTab(item)}
      >
        <div class="flex items-center gap-1">
          <img
            src={
              getIcon(
                item.getItemName(),
                item.getItemData().isFolder ? item.isExpanded() ? "folder-open" : "folder-closed" : "file"
              )
            }
            alt="folder icon"
            class="w-4 h-4"
          />
          {item.getItemName()}
          {#if item.isLoading()}
            <span>Loading...</span>
          {/if}
        </div>
      </div>
    {/each}
  {/key}
</div>
