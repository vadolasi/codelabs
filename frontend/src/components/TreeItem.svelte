<script lang="ts">
  import type { ItemInstance } from "@headless-tree/core"
  import { generateManifest } from "material-icon-theme"
  import TreeItem from "./TreeItem.svelte"

  const { item }: { item: ItemInstance<{ path: string, isFolder: boolean }> } = $props()
  const itemData = item.getItemData()

  const icons: Record<string, { default: string }> = import.meta.glob(
		"../../../node_modules/material-icon-theme/icons/*.svg",
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

  function getIcon(filename: string, type: "file" | "folder-open" | "folder-closed") {
    let icon: string | undefined

    if (type === "file") {
      icon = manifest.fileNames?.[filename]

      if (icon === undefined) {
        for (const ext of getExtensions(filename)) {
          icon = manifest.fileExtensions?.[ext]
          if (icon) break
        }
      }

      return icons[`../../../node_modules/material-icon-theme/icons/${icon ?? "file"}.svg`].default
    }

    icon = manifest.folderNames?.[filename] ?? "folder"

    return icons[`../../../node_modules/material-icon-theme/icons/${icon}${type === "folder-open" ? "-open" : ""}.svg`].default
  }
</script>

<div {...item.getProps()} class="w-full flex flex-col" onclick={itemData.isFolder ? () => item.isExpanded() ? item.collapse() : item.expand() : () => {}}>
  <div class="flex items-center gap-1 cursor-pointer text-gray-400 hover:text-white">
    <img src={getIcon(item.getItemName(), itemData.isFolder ? item.isExpanded() ? "folder-open" : "folder-closed" : "file")} alt="folder icon" class="w-4 h-4" />
    {item.getItemName()}
    {#if item.isLoading()}
      <span>Loading...</span>
    {/if}
  </div>
  {#if itemData.isFolder}
    <div class="border border-gray-100 border-spacing-2" style:padding-left={`${(item.getItemMeta().level + 1) * 10}px`}>
      {#each item.getChildren() as child (child.getId())}
        <TreeItem item={child} />
      {/each}
    </div>
  {/if}
</div>
